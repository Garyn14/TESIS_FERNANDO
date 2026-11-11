import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import Modal from '../comun/Modal'
import {
  corregir,
  reemitir,
  registrar,
  vistaPrevia,
  vistaPreviaCorreccion,
  vistaPreviaReemision,
  type Documento,
  type SolicitudDocumento,
  type TipoDocumento,
  type VistaPrevia,
} from './api'
import CampoFormulario, { CampoDePlantilla } from './CampoFormulario'
import CampoMotivoReemision from './CampoMotivoReemision'
import Certificado from './Certificado'
import { errorDeMotivo, limpiar, SIN_CAMBIOS, validarSolicitud, type Errores } from './validacion'

const PASOS = ['Datos de la solicitud', 'Vista previa']

/**
 * HU08: registro de un documento a solicitud de parte. Datos → vista previa → envío con
 * confirmación. El servidor valida en cada paso y, al enviar, deja el documento Pendiente.
 * HU15: con {@code original}, corrige un documento observado: el formulario viene precargado y se
 * reenvía a revisión con el mismo código.
 * HU30: con {@code reemision}, reemite un documento firmado: precargado, con el mismo expediente
 * (que no se cambia) y el motivo obligatorio. Se crea un documento nuevo, vinculado al original.
 */
export default function FormularioSolicitud({
  tipo,
  original,
  reemision = false,
}: {
  tipo: TipoDocumento
  original?: Documento
  reemision?: boolean
}) {
  const id = useId()
  const [datos, setDatos] = useState({
    numeroExpediente: original?.numeroExpediente ?? '',
    nombres: original?.nombres ?? '',
    apellidos: original?.apellidos ?? '',
    dni: original?.dni ?? '',
    ...Object.fromEntries(
      tipo.campos.map((c) => [`datos.${c.nombre}`, original?.datos?.[c.nombre] ?? '']),
    ),
  } as Record<string, string>)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [previa, setPrevia] = useState<VistaPrevia | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [enviado, setEnviado] = useState<Documento | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [motivo, setMotivo] = useState('')

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

  /** HU30: si la reemisión no cambia ningún dato del original. */
  const sinCambios = (s: SolicitudDocumento) =>
    !!original &&
    s.nombres === original.nombres &&
    s.apellidos === original.apellidos &&
    s.dni === original.dni &&
    tipo.campos.every((c) => s.datos[c.nombre] === (original.datos?.[c.nombre] ?? ''))

  const continuar = async (evento: FormEvent) => {
    evento.preventDefault()
    const s = solicitud()
    const encontrados = validarSolicitud(s, tipo.campos)
    const deMotivo = reemision ? errorDeMotivo(motivo) : ''
    if (deMotivo) encontrados.motivo = deMotivo
    setErrores(encontrados)
    setErrorGeneral('')
    if (Object.keys(encontrados).length > 0) return
    if (reemision && sinCambios(s)) {
      setErrorGeneral(SIN_CAMBIOS)
      return
    }
    setOcupado(true)
    try {
      setPrevia(
        await (reemision && original
          ? vistaPreviaReemision(original.codigo, datosDeReemision(s))
          : original
            ? vistaPreviaCorreccion(original.codigo, s)
            : vistaPrevia(s)),
      )
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
      setEnviado(
        await (reemision && original
          ? reemitir(original.codigo, { ...datosDeReemision(solicitud()), motivo: motivo.trim() })
          : original
            ? corregir(original.codigo, solicitud())
            : registrar(solicitud())),
      )
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
        <p className="text-lg font-semibold text-institutional">
          {reemision
            ? '✓ Reemisión enviada a revisión'
            : original
              ? '✓ Documento corregido y reenviado a revisión'
              : '✓ Documento enviado a revisión'}
        </p>
        <p className="mt-2">
          Código de verificación: <strong className="font-mono">{enviado.codigo}</strong>
        </p>
        <p className="mt-1 text-muted">
          {reemision
            ? `Quedó Pendiente. El original (${original?.codigo}) sigue firmado hasta que el Director firme la reemisión.`
            : 'Quedó Pendiente: no se puede modificar mientras el Director lo revisa.'}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`#/mis-documentos/${enviado.codigo}`} className={BOTON_PRIMARIO}>
            Ver el documento
          </a>
          {reemision && original && (
            <a href={`#/mis-documentos/${original.codigo}`} className={BOTON_SECUNDARIO}>
              Volver al original
            </a>
          )}
          {!original && (
            <a href="#/nuevo-documento" className={BOTON_SECUNDARIO}>
              Registrar otro documento
            </a>
          )}
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
              {original && !reemision ? 'Reenviar a revisión' : 'Enviar a revisión'}
            </button>
          </div>
        </div>
      ) : (
        <form noValidate onSubmit={continuar} className="mt-6 grid gap-4 md:grid-cols-2">
          {reemision ? (
            // HU30: la reemisión mantiene el expediente del original.
            <div>
              <p className="font-medium">N.° de expediente</p>
              <p className="mt-1 rounded-lg border border-line bg-cream px-3 py-2 font-mono">
                {original?.numeroExpediente}
              </p>
            </div>
          ) : (
            <CampoFormulario
              {...campo('numeroExpediente')}
              etiqueta="N.° de expediente"
              ayuda="Ej.: EXP-2026-004817"
            />
          )}
          <CampoFormulario {...campo('dni')} etiqueta="DNI" tipo="numero" maxLength={8} />
          <CampoFormulario {...campo('nombres')} etiqueta="Nombres" />
          <CampoFormulario {...campo('apellidos')} etiqueta="Apellidos" />
          {tipo.campos.map((c) => (
            <CampoDePlantilla key={c.nombre} campo={c} {...campo(`datos.${c.nombre}`)} />
          ))}
          {reemision && (
            <div className="md:col-span-2">
              <CampoMotivoReemision
                id={`${id}-motivo`}
                valor={motivo}
                error={errores.motivo}
                onCambiar={(valor) => {
                  setMotivo(valor)
                  setErrores((e) => ({ ...e, motivo: '' }))
                }}
              />
            </div>
          )}
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className={BOTON_PRIMARIO} disabled={ocupado}>
              {ocupado ? 'Validando…' : 'Continuar a vista previa'}
            </button>
          </div>
        </form>
      )}

      {confirmando && previa && (
        <Modal
          titulo={
            reemision
              ? '¿Enviar la reemisión a revisión?'
              : original
                ? '¿Reenviar a revisión?'
                : '¿Enviar a revisión?'
          }
          onCerrar={() => setConfirmando(false)}
        >
          <p>
            Se {original && !reemision ? 'reenviará' : 'enviará'} el {previa.tipoNombre} de{' '}
            {previa.nombres} {previa.apellidos} al Director. Una vez enviado queda Pendiente y no se
            puede modificar mientras esté en revisión.
            {reemision &&
              ` Cuando el Director lo firme, el original (${original?.codigo}) se anulará automáticamente.`}
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
              {ocupado ? 'Enviando…' : original && !reemision ? 'Reenviar' : 'Enviar'}
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

/** HU30: la reemisión no envía el tipo ni el expediente: son los del original. */
function datosDeReemision({ nombres, apellidos, dni, datos }: SolicitudDocumento) {
  return { nombres, apellidos, dni, datos }
}
