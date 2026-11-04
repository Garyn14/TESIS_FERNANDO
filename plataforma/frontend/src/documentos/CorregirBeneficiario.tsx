import { useId, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import Modal from '../comun/Modal'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { corregir, reemitir, type Beneficiario } from './api'
import CampoFormulario from './CampoFormulario'
import CampoMotivoReemision from './CampoMotivoReemision'
import { errorDeMotivo, limpiar, SIN_CAMBIOS, type Errores } from './validacion'

interface Props {
  codigo: string
  beneficiario: Beneficiario
  motivo: string
  /** HU30: reemite un certificado firmado en lugar de corregir uno observado. */
  reemision?: boolean
  onCorregido: (codigoNuevo: string) => void
  onCerrar: () => void
}

/**
 * HU15: corrección de un certificado observado de un lote. Solo cambian los nombres, los apellidos
 * y el DNI; los datos del evento son del lote. Se reenvía a revisión con el mismo código.
 * HU30: con {@code reemision}, reemite un certificado firmado con un motivo: el nuevo queda en el
 * mismo lote y, al firmarse, el original se anula.
 */
export default function CorregirBeneficiario({
  codigo,
  beneficiario,
  motivo,
  reemision = false,
  onCorregido,
  onCerrar,
}: Props) {
  const id = useId()
  const [datos, setDatos] = useState<Beneficiario>(beneficiario)
  const [errores, setErrores] = useState<Errores>({})
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [motivoReemision, setMotivoReemision] = useState('')

  const campo = (nombre: keyof Beneficiario) => ({
    id: `${id}-${nombre}`,
    valor: datos[nombre],
    error: errores[nombre],
    onCambiar: (valor: string) => {
      setDatos((d) => ({ ...d, [nombre]: valor }))
      setErrores((e) => ({ ...e, [nombre]: '' }))
    },
  })

  const reenviar = async () => {
    const nuevos = {
      nombres: limpiar(datos.nombres),
      apellidos: limpiar(datos.apellidos),
      dni: limpiar(datos.dni),
    }
    setError('')
    if (reemision) {
      const deMotivo = errorDeMotivo(motivoReemision)
      if (deMotivo) return setErrores((e) => ({ ...e, motivo: deMotivo }))
      if (
        nuevos.nombres === beneficiario.nombres &&
        nuevos.apellidos === beneficiario.apellidos &&
        nuevos.dni === beneficiario.dni
      )
        return setError(SIN_CAMBIOS)
    }
    setOcupado(true)
    try {
      const resultado = reemision
        ? await reemitir(codigo, { ...nuevos, motivo: motivoReemision.trim() })
        : await corregir(codigo, nuevos)
      onCorregido(resultado.codigo)
    } catch (e) {
      if (e instanceof ErrorApi && Object.keys(e.campos).length > 0) setErrores(e.campos)
      else setError(e instanceof ErrorApi ? e.message : 'No se pudo reenviar el certificado.')
      setOcupado(false)
    }
  }

  return (
    <Modal
      titulo={reemision ? 'Reemitir certificado' : 'Corregir certificado'}
      onCerrar={() => !ocupado && onCerrar()}
    >
      <div className="space-y-4">
        {reemision ? (
          <p className="rounded-lg bg-blue-pale px-4 py-3">
            Reemisión de <strong className="font-mono">{codigo}</strong>. Cuando el Director firme
            el nuevo certificado, el original se anulará automáticamente.
          </p>
        ) : (
          <p className="rounded-lg bg-orange-pale px-4 py-3">
            <strong>Motivo de la observación:</strong> {motivo}
          </p>
        )}
        <CampoFormulario {...campo('nombres')} etiqueta="Nombres" />
        <CampoFormulario {...campo('apellidos')} etiqueta="Apellidos" />
        <CampoFormulario {...campo('dni')} etiqueta="DNI" tipo="numero" maxLength={8} />
        {reemision && (
          <CampoMotivoReemision
            id={`${id}-motivo`}
            valor={motivoReemision}
            error={errores.motivo}
            onCambiar={(valor) => {
              setMotivoReemision(valor)
              setErrores((e) => ({ ...e, motivo: '' }))
            }}
          />
        )}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        <p className="text-sm text-muted">
          {reemision
            ? 'Se crea un certificado nuevo en el mismo lote. Los datos del evento no cambian.'
            : 'Se reenvía a revisión con el mismo código. Los datos del evento no cambian.'}
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCerrar} disabled={ocupado} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="button" onClick={reenviar} disabled={ocupado} className={BOTON_PRIMARIO}>
            {ocupado ? 'Enviando…' : reemision ? 'Enviar a revisión' : 'Reenviar a revisión'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
