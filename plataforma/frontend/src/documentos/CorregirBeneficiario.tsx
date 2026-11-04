import { useId, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import Modal from '../comun/Modal'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { corregir, type Beneficiario } from './api'
import CampoFormulario from './CampoFormulario'
import { limpiar, type Errores } from './validacion'

interface Props {
  codigo: string
  beneficiario: Beneficiario
  motivo: string
  onCorregido: () => void
  onCerrar: () => void
}

/**
 * HU15: corrección de un certificado observado de un lote. Solo cambian los nombres, los apellidos
 * y el DNI; los datos del evento son del lote. Se reenvía a revisión con el mismo código.
 */
export default function CorregirBeneficiario({
  codigo,
  beneficiario,
  motivo,
  onCorregido,
  onCerrar,
}: Props) {
  const id = useId()
  const [datos, setDatos] = useState<Beneficiario>(beneficiario)
  const [errores, setErrores] = useState<Errores>({})
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

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
    setOcupado(true)
    setError('')
    try {
      await corregir(codigo, {
        nombres: limpiar(datos.nombres),
        apellidos: limpiar(datos.apellidos),
        dni: limpiar(datos.dni),
      })
      onCorregido()
    } catch (e) {
      if (e instanceof ErrorApi && Object.keys(e.campos).length > 0) setErrores(e.campos)
      else setError(e instanceof ErrorApi ? e.message : 'No se pudo reenviar el certificado.')
      setOcupado(false)
    }
  }

  return (
    <Modal titulo="Corregir certificado" onCerrar={() => !ocupado && onCerrar()}>
      <div className="space-y-4">
        <p className="rounded-lg bg-orange-pale px-4 py-3">
          <strong>Motivo de la observación:</strong> {motivo}
        </p>
        <CampoFormulario {...campo('nombres')} etiqueta="Nombres" />
        <CampoFormulario {...campo('apellidos')} etiqueta="Apellidos" />
        <CampoFormulario {...campo('dni')} etiqueta="DNI" tipo="numero" maxLength={8} />
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {error}
          </p>
        )}
        <p className="text-sm text-muted">
          Se reenvía a revisión con el mismo código. Los datos del evento no cambian.
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCerrar} disabled={ocupado} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
          <button type="button" onClick={reenviar} disabled={ocupado} className={BOTON_PRIMARIO}>
            {ocupado ? 'Reenviando…' : 'Reenviar a revisión'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
