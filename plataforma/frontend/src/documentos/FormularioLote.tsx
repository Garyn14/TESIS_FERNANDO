import { useId, useRef, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import Modal from '../comun/Modal'
import {
  descargarPlantilla,
  importarExcel,
  registrarLote,
  vistaPreviaLote,
  type Beneficiario,
  type Lote,
  type SolicitudLote,
  type TipoDocumento,
  type VistaPreviaLote,
} from './api'
import { CampoDePlantilla } from './CampoFormulario'
import Certificado from './Certificado'
import { limpiar, validarBeneficiarios, validarDatos, type Errores } from './validacion'

const PASOS = ['Datos del evento', 'Beneficiarios', 'Vista previa']
const VACIA: Beneficiario = { nombres: '', apellidos: '', dni: '' }
const COLUMNAS = [
  ['nombres', 'Nombres'],
  ['apellidos', 'Apellidos'],
  ['dni', 'DNI'],
] as const

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios)

/**
 * HU09: emisión por lista. Datos del evento → relación de beneficiarios (a mano o desde la
 * plantilla Excel, validada fila por fila) → vista previa y envío del lote. El servidor vuelve a
 * validar todo y crea un documento por beneficiario.
 */
export default function FormularioLote({
  tipo,
  areaNombre,
}: {
  tipo: TipoDocumento
  areaNombre: string | null
}) {
  const id = useId()
  const archivo = useRef<HTMLInputElement>(null)
  const [paso, setPaso] = useState(0)
  const [datos, setDatos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      tipo.campos.map((c) => [c.nombre, c.nombre === 'areaOrganizadora' ? (areaNombre ?? '') : '']),
    ),
  )
  const [erroresEvento, setErroresEvento] = useState<Errores>({})
  const [filas, setFilas] = useState<Beneficiario[]>([])
  const [erroresServidor, setErroresServidor] = useState<Errores>({})
  const [intentado, setIntentado] = useState(false)
  const [aviso, setAviso] = useState('')
  const [errorGeneral, setErrorGeneral] = useState('')
  const [previa, setPrevia] = useState<VistaPreviaLote | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [enviado, setEnviado] = useState<Lote | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const normalizadas = filas.map((f) => ({
    nombres: limpiar(f.nombres),
    apellidos: limpiar(f.apellidos),
    dni: limpiar(f.dni),
  }))
  const erroresFilas: Errores = { ...erroresServidor, ...validarBeneficiarios(normalizadas) }
  // Una fila recién agregada no muestra errores hasta que se escribe en ella o se intenta seguir.
  const visible = (i: number) => intentado || Object.values(filas[i]).some((v) => v.trim())
  const filasConError = filas.filter((_, i) =>
    COLUMNAS.some(([c]) => erroresFilas[`beneficiarios[${i}].${c}`]),
  ).length
  const solicitud = (): SolicitudLote => ({
    tipo: tipo.codigo,
    datos: Object.fromEntries(Object.entries(datos).map(([k, v]) => [k, limpiar(v)])),
    beneficiarios: normalizadas,
  })

  /** Errores del servidor: los del evento vuelven al primer paso; los de las filas, al segundo. */
  const fallo = (e: unknown) => {
    setPrevia(null)
    if (!(e instanceof ErrorApi) || Object.keys(e.campos).length === 0) {
      setErrorGeneral(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.')
      return
    }
    const deEvento = Object.fromEntries(
      Object.entries(e.campos).filter(([k]) => k.startsWith('datos.')),
    )
    setErroresEvento(deEvento)
    setErroresServidor(
      Object.fromEntries(Object.entries(e.campos).filter(([k]) => !k.startsWith('datos.'))),
    )
    setIntentado(true)
    setPaso(Object.keys(deEvento).length > 0 ? 0 : 1)
  }

  const continuarEvento = (evento: FormEvent) => {
    evento.preventDefault()
    const encontrados = validarDatos(solicitud().datos, tipo.campos)
    setErroresEvento(encontrados)
    if (Object.keys(encontrados).length === 0) setPaso(1)
  }

  const cambiarFila = (i: number, campo: keyof Beneficiario, valor: string) => {
    setFilas((f) => f.map((fila, j) => (j === i ? { ...fila, [campo]: valor } : fila)))
    setErroresServidor({})
  }
  const quitarFila = (i: number) => {
    setFilas((f) => f.filter((_, j) => j !== i))
    setErroresServidor({})
  }

  const importar = async (elegido: File | undefined) => {
    if (!elegido) return
    setAviso('')
    setErrorGeneral('')
    setOcupado(true)
    try {
      const importadas = await importarExcel(elegido)
      setFilas((f) => [
        ...f.filter((fila) => Object.values(fila).some((v) => v.trim())),
        ...importadas,
      ])
      setErroresServidor({})
      setAviso(
        `Se ${plural(importadas.length, 'importó 1 beneficiario', `importaron ${importadas.length} beneficiarios`)} desde Excel.`,
      )
    } catch (e) {
      setErrorGeneral(
        e instanceof ErrorApi ? (e.campos.archivo ?? e.message) : 'No se pudo leer el archivo.',
      )
    } finally {
      setOcupado(false)
      if (archivo.current) archivo.current.value = ''
    }
  }

  const continuarBeneficiarios = async () => {
    setIntentado(true)
    setErrorGeneral('')
    if (filas.length === 0 || filasConError > 0) return
    setOcupado(true)
    try {
      setPrevia(await vistaPreviaLote(solicitud()))
      setPaso(2)
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
      setEnviado(await registrarLote(solicitud()))
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
          ✓ ¡Listo! Se{' '}
          {plural(
            enviado.documentos.length,
            'envió 1 certificado',
            `enviaron ${enviado.documentos.length} certificados`,
          )}{' '}
          a revisión (Lote {enviado.numero})
        </p>
        <p className="mt-1 text-muted">
          Quedaron Pendientes: no se pueden modificar mientras el Director los revisa.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`#/mis-documentos/lote/${enviado.numero}`} className={BOTON_PRIMARIO}>
            Ver el lote
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
        {PASOS.map((nombre, i) => (
          <li
            key={nombre}
            aria-current={paso === i ? 'step' : undefined}
            className={`flex items-center gap-2 ${paso === i ? 'font-semibold text-institutional' : ''}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line font-medium">
              {i < paso ? '✓' : i + 1}
            </span>
            {nombre}
          </li>
        ))}
      </ol>

      {errorGeneral && (
        <p role="alert" className="mt-4 rounded-lg bg-orange-pale p-3">
          {errorGeneral}
        </p>
      )}

      {paso === 0 && (
        <form noValidate onSubmit={continuarEvento} className="mt-6 grid gap-4 md:grid-cols-2">
          {tipo.campos.map((c) => (
            <CampoDePlantilla
              key={c.nombre}
              campo={c}
              id={`${id}-${c.nombre}`}
              valor={datos[c.nombre]}
              error={erroresEvento[`datos.${c.nombre}`]}
              onCambiar={(valor) => {
                setDatos((d) => ({ ...d, [c.nombre]: valor }))
                setErroresEvento((e) => ({ ...e, [`datos.${c.nombre}`]: '' }))
              }}
            />
          ))}
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className={BOTON_PRIMARIO}>
              Continuar
            </button>
          </div>
        </form>
      )}

      {paso === 1 && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={BOTON_SECUNDARIO}
              onClick={() =>
                descargarPlantilla(tipo.codigo)
                  .then(() => setAviso('Plantilla descargada.'))
                  .catch((e: Error) => setErrorGeneral(e.message))
              }
            >
              Descargar plantilla Excel
            </button>
            <button
              type="button"
              className={BOTON_SECUNDARIO}
              disabled={ocupado}
              onClick={() => archivo.current?.click()}
            >
              Importar desde Excel
            </button>
            <input
              ref={archivo}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              aria-label="Archivo Excel de beneficiarios"
              className="hidden"
              onChange={(e) => importar(e.target.files?.[0])}
            />
            <button
              type="button"
              className={BOTON_SECUNDARIO}
              onClick={() => setFilas((f) => [...f, VACIA])}
            >
              Agregar beneficiario
            </button>
          </div>
          {aviso && (
            <p role="status" className="mt-3 text-institutional">
              {aviso}
            </p>
          )}

          {filas.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-card p-6 text-center text-muted">
              Aún no hay beneficiarios. Importe la lista desde Excel o agréguelos uno por uno.
            </p>
          ) : (
            <>
              <p
                role={filasConError > 0 && intentado ? 'alert' : undefined}
                className={`mt-4 font-medium ${filasConError > 0 ? 'text-red-700' : 'text-institutional'}`}
              >
                {filasConError > 0
                  ? `Hay ${plural(filasConError, '1 error', `${filasConError} errores`)} en la lista. ${plural(filasConError, 'Corríjalo', 'Corríjalos')} para continuar.`
                  : `✓ ${plural(filas.length, '1 beneficiario listo', `${filas.length} beneficiarios listos`)}`}
              </p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-line bg-card">
                <table className="w-full text-left">
                  <thead className="border-b border-line text-sm text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">N.°</th>
                      {COLUMNAS.map(([, titulo]) => (
                        <th key={titulo} className="px-3 py-2 font-medium">
                          {titulo}
                        </th>
                      ))}
                      <th className="px-3 py-2">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, i) => {
                      const conError =
                        visible(i) &&
                        COLUMNAS.some(([c]) => erroresFilas[`beneficiarios[${i}].${c}`])
                      return (
                        <tr
                          key={i}
                          className={`border-b border-line align-top last:border-0 ${conError ? 'bg-red-50' : ''}`}
                        >
                          <td className="px-3 py-2 text-muted">{i + 1}</td>
                          {COLUMNAS.map(([c, titulo]) => {
                            const error = visible(i) ? erroresFilas[`beneficiarios[${i}].${c}`] : ''
                            return (
                              <td key={c} className="px-3 py-2">
                                <input
                                  aria-label={`${titulo} de la fila ${i + 1}`}
                                  value={fila[c]}
                                  onChange={(e) => cambiarFila(i, c, e.target.value)}
                                  inputMode={c === 'dni' ? 'numeric' : undefined}
                                  maxLength={c === 'dni' ? 8 : 100}
                                  aria-invalid={error ? true : undefined}
                                  className={`${CAMPO} mt-0 ${error ? 'border-red-600' : 'border-line'}`}
                                />
                                {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              aria-label={`Eliminar la fila ${i + 1}`}
                              className="rounded px-2 py-2 text-red-700 hover:underline"
                              onClick={() => quitarFila(i)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setPaso(0)}>
              Volver
            </button>
            <button
              type="button"
              className={BOTON_PRIMARIO}
              disabled={ocupado || filas.length === 0 || filasConError > 0}
              onClick={continuarBeneficiarios}
            >
              {ocupado ? 'Validando…' : 'Continuar a vista previa'}
            </button>
          </div>
        </div>
      )}

      {paso === 2 && previa && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <Certificado documento={previa.ejemplo} />
          <aside
            aria-label="Resumen del lote"
            className="rounded-xl border border-line bg-cream p-4"
          >
            <h3 className="font-semibold">Resumen del lote</h3>
            <p className="mt-2 text-2xl font-semibold text-institutional">
              {plural(previa.cantidad, '1 certificado', `${previa.cantidad} certificados`)}
            </p>
            <p className="mt-2">{previa.datos.nombreEvento}</p>
            <p className="text-muted">{previa.periodo}</p>
            <ol className="mt-3 max-h-64 list-decimal space-y-1 overflow-y-auto pl-6">
              {previa.beneficiarios.map((nombre, i) => (
                <li key={i}>{nombre}</li>
              ))}
            </ol>
            <p className="mt-3 border-t border-line pt-3 text-sm text-muted">
              Se generará un certificado por cada beneficiario.
            </p>
          </aside>
          <div className="flex justify-end gap-3 lg:col-span-2">
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => setPaso(1)}>
              Volver
            </button>
            <button type="button" className={BOTON_PRIMARIO} onClick={() => setConfirmando(true)}>
              Enviar a revisión
            </button>
          </div>
        </div>
      )}

      {confirmando && previa && (
        <Modal titulo="¿Enviar a revisión?" onCerrar={() => setConfirmando(false)}>
          <p>
            ¿Enviar {plural(previa.cantidad, '1 certificado', `${previa.cantidad} certificados`)} a
            revisión del Director? Mientras estén en revisión no podrá modificarlos.
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
