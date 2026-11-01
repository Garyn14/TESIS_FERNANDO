import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import Modal from '../comun/Modal'
import {
  registrar,
  vistaPrevia,
  type Documento,
  type SolicitudDocumento,
  type TipoDocumento,
  type VistaPrevia,
} from './api'
import CampoFormulario, { CampoDePlantilla } from './CampoFormulario'
import Certificado from './Certificado'
import { limpiar, validarSolicitud, type Errores } from './validacion'

const PASOS = ['Datos de la solicitud', 'Vista previa']

/**
 * HU08: registro de un documento a solicitud de parte. Datos → vista previa → envío con
 * confirmación. El servidor valida en cada paso y, al enviar, deja el documento Pendiente.
 */
export default function FormularioSolicitud({ tipo }: { tipo: TipoDocumento }) {
  const id = useId()
  const [datos, setDatos] = useState({
    numeroExpediente: '',
    nombres: '',
    apellidos: '',
    dni: '',
    ...Object.fromEntries(tipo.campos.map((c) => [`datos.${c.nombre}`, ''])),
  } as Record<string, string>)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [previa, setPrevia] = useState<VistaPrevia | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [enviado, setEnviado] = useState<Documento | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const solicitud = (): SolicitudDocumento => ({
    tipo: tipo.codigo,
    numeroExpediente: limpiar(datos.numeroExpediente).toUpperCase(),
    nombres: limpiar(datos.nombres),
    apellidos: limpiar(datos.apellidos),
    dni: limpiar(datos.dni),
    datos: Object.fromEntries(
      tipo.campos.map((c) => [c.nombre, limpiar(datos[`datos.${c.nombre}`])]),
    ),
  })

  const cambiar = (campo: string, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: '' }))
  }
  const campo = (nombre: string) => ({
    id: `${id}-${nombre}`,
    valor: datos[nombre],
    error: errores[nombre],
    onCambiar: (valor: string) => cambiar(nombre, valor),
  })

  /** Muestra los errores del servidor junto a su campo, o el mensaje general. */
  const fallo = (e: unknown) => {
    if (e instanceof ErrorApi && Object.keys(e.campos).length > 0) {
      setErrores(e.campos)
      setPrevia(null)
    } else setErrorGeneral(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.')
  }

  const continuar = async (evento: FormEvent) => {
    evento.preventDefault()
    const s = solicitud()
    const encontrados = validarSolicitud(s, tipo.campos)
    setErrores(encontrados)
    setErrorGeneral('')
    if (Object.keys(encontrados).length > 0) return
    setOcupado(true)
    try {
      setPrevia(await vistaPrevia(s))
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
    }
  }

  const enviar = async () => {
    setOcupado(true)
    setErrorGeneral('')
    try {
      setEnviado(await registrar(solicitud()))
    } catch (e) {
      fallo(e)
    } finally {
      setOcupado(false)
      setConfirmando(false)
    }
  }

  if (enviado)
    return (
      <div role="status" className="mt-6 rounded-xl bg-green-pale p-6">
        <p className="text-lg font-semibold text-institutional">✓ Documento enviado a revisión</p>
        <p className="mt-2">
          Código de verificación: <strong className="font-mono">{enviado.codigo}</strong>
        </p>
        <p className="mt-1 text-muted">
          Quedó Pendiente: no se puede modificar mientras el Director lo revisa.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`#/mis-documentos/${enviado.codigo}`} className={BOTON_PRIMARIO}>
            Ver el documento
          </a>
          <a href="#/nuevo-documento" className={BOTON_SECUNDARIO}>
            Registrar otro documento
          </a>
        </div>
      </div>
    )

  return (
    <>
      <ol aria-label="Pasos" className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
        {PASOS.map((paso, i) => {
          const actual = (previa ? 1 : 0) === i
          return (
            <li
              key={paso}
              aria-current={actual ? 'step' : undefined}
              className={`flex items-center gap-2 ${actual ? 'font-semibold text-institutional' : ''}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-medium">
                {i + 1}
              </span>
              {paso}
            </li>
          )
        })}
      </ol>

      {errorGeneral && (
        <p role="alert" className="mt-4 rounded-lg bg-orange-pale p-3">
          {errorGeneral}
        </p>
      )}

      {previa ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_16rem]">
          <Certificado documento={previa} />
          <aside className="rounded-xl border border-line bg-cream p-4">
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-muted">N.° de expediente</dt>
                <dd className="font-semibold">{previa.numeroExpediente}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">DNI</dt>
                <dd className="font-semibold">{previa.dni}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Tipo</dt>
                <dd className="font-semibold">{previa.tipoNombre}</dd>
              </div>
            </dl>
          </aside>
          <div className="flex justify-end gap-3 lg:col-span-2">
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setPrevia(null)}>
              Volver
            </button>
            <button type="button" className={BOTON_PRIMARIO} onClick={() => setConfirmando(true)}>
              Enviar a revisión
            </button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={continuar} className="mt-6 grid gap-4 md:grid-cols-2">
          <CampoFormulario
            {...campo('numeroExpediente')}
            etiqueta="N.° de expediente"
            ayuda="Ej.: EXP-2026-004817"
          />
          <CampoFormulario {...campo('dni')} etiqueta="DNI" tipo="numero" maxLength={8} />
          <CampoFormulario {...campo('nombres')} etiqueta="Nombres" />
          <CampoFormulario {...campo('apellidos')} etiqueta="Apellidos" />
          {tipo.campos.map((c) => (
            <CampoDePlantilla key={c.nombre} campo={c} {...campo(`datos.${c.nombre}`)} />
          ))}
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className={BOTON_PRIMARIO} disabled={ocupado}>
              {ocupado ? 'Validando…' : 'Continuar a vista previa'}
            </button>
          </div>
        </form>
      )}

      {confirmando && previa && (
        <Modal titulo="¿Enviar a revisión?" onCerrar={() => setConfirmando(false)}>
          <p>
            Se enviará el {previa.tipoNombre} de {previa.nombres} {previa.apellidos} al Director.
            Una vez enviado queda Pendiente y no se puede modificar mientras esté en revisión.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className={BOTON_SECUNDARIO}
              onClick={() => setConfirmando(false)}
              disabled={ocupado}
            >
              Cancelar
            </button>
            <button type="button" className={BOTON_PRIMARIO} onClick={enviar} disabled={ocupado}>
              {ocupado ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
