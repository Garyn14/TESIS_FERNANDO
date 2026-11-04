import { useEffect, useRef, useState } from 'react'
import { ErrorApi } from '../api/cliente'
import { obtenerRed, type Red } from '../billeteras/api'
import { conectar, ErrorBilletera, registrarDocumentos } from '../blockchain/billetera'
import Modal from '../comun/Modal'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from '../comun/estilos'
import { cancelar, confirmar, estadoBilletera, preparar } from './api'
import { firmar, type Paso, type Resultado } from './flujo'

/** Lo que el Director eligió firmar: documentos sueltos y lotes enteros (HU11). */
export interface Seleccion {
  codigos: string[]
  lotes: string[]
  /** Cantidad de documentos (los certificados de cada lote incluidos). */
  cantidad: number
  /** Nombre legible de cada documento o lote, para el resultado. */
  nombres?: Record<string, string>
  /** HU12: en un lote se habla de certificados. */
  unidad?: 'documento' | 'certificado'
  /** HU12: avisos que acompañan al resultado (observados y rechazados del lote). */
  notas?: string[]
}

type Estado =
  | { tipo: 'verificando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'confirmar'; red: Red; cuenta: string }
  | { tipo: 'progreso'; paso: Paso }
  | { tipo: 'resultado'; resultado: Resultado }

const corta = (direccion: string) => `${direccion.slice(0, 6)}…${direccion.slice(-4)}`
const contar = (n: number, unidad: string) => (n === 1 ? `1 ${unidad}` : `${n} ${unidad}s`)

function mensaje(e: unknown) {
  return e instanceof ErrorBilletera || e instanceof ErrorApi
    ? e.message
    : 'Ocurrió un error inesperado. Intente nuevamente.'
}

const PASOS = [
  'Verificando su billetera',
  'Preparando los documentos',
  'Registrando la firma',
  'Confirmando el registro',
]

function indice(paso: Paso) {
  return paso.tipo === 'preparando' ? 1 : paso.tipo === 'registrando' ? 2 : 3
}

interface Props {
  seleccion: Seleccion
  director: string
  onCerrar: (resultado: Resultado | null) => void
}

/**
 * HU11: firma con la billetera del Director. Verifica la billetera y la red, pide confirmación,
 * prepara los documentos (HU17), registra la firma en tandas de hasta 50 y la confirma.
 */
export default function VentanaDeFirma({ seleccion, director, onCerrar }: Props) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'verificando' })
  const iniciada = useRef(false)

  const verificar = async () => {
    setEstado({ tipo: 'verificando' })
    try {
      const [red, registrada] = await Promise.all([obtenerRed(), estadoBilletera()])
      if (!registrada.billetera || registrada.firmante !== true)
        throw new ErrorBilletera(
          registrada.aviso ?? 'Su billetera no puede firmar en este momento.',
        )
      const cuenta = await conectar(red)
      if (cuenta.toLowerCase() !== registrada.billetera.toLowerCase())
        throw new ErrorBilletera(
          `La billetera conectada (${corta(cuenta)}) no es la registrada para su cuenta (${corta(registrada.billetera)}). Cambie de cuenta en su billetera e intente nuevamente.`,
        )
      setEstado({ tipo: 'confirmar', red, cuenta })
    } catch (e) {
      setEstado({ tipo: 'error', mensaje: mensaje(e) })
    }
  }

  useEffect(() => {
    // StrictMode ejecuta el efecto dos veces en desarrollo: la billetera se consulta una vez.
    if (iniciada.current) return
    iniciada.current = true
    void verificar()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const iniciar = async (red: Red) => {
    setEstado({ tipo: 'progreso', paso: { tipo: 'preparando' } })
    try {
      const resultado = await firmar(
        {
          preparar: () => preparar(seleccion.codigos, seleccion.lotes),
          registrar: (lote, alEnviar) => registrarDocumentos(red, lote, alEnviar),
          confirmar,
          cancelar,
        },
        (paso) => setEstado({ tipo: 'progreso', paso }),
      )
      setEstado({ tipo: 'resultado', resultado })
    } catch (e) {
      // Falló la preparación: no se cambió ningún documento.
      setEstado({ tipo: 'error', mensaje: mensaje(e) })
    }
  }

  const ocupada = estado.tipo === 'verificando' || estado.tipo === 'progreso'
  const cerrar = () => {
    if (!ocupada) onCerrar(estado.tipo === 'resultado' ? estado.resultado : null)
  }
  const nombre = (codigo: string) => seleccion.nombres?.[codigo] ?? codigo
  const unidad = seleccion.unidad ?? 'documento'

  return (
    <Modal titulo="Firmar con su billetera" onCerrar={cerrar}>
      <div className="space-y-4">
        {estado.tipo === 'verificando' && (
          <p role="status" className="flex items-center gap-2 text-institutional">
            <Girando /> Verificando su billetera…
          </p>
        )}

        {estado.tipo === 'error' && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
            {estado.mensaje}
          </p>
        )}

        {estado.tipo === 'confirmar' && (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border border-line p-3">
              <dt className="text-muted">Cuenta</dt>
              <dd>
                {director} <span className="font-mono">({corta(estado.cuenta)})</span>
              </dd>
              <dt className="text-muted">Acción</dt>
              <dd className="font-semibold">Firmar {contar(seleccion.cantidad, unidad)}</dd>
              <dt className="text-muted">Red</dt>
              <dd>{estado.red.nombre}</dd>
              <dt className="text-muted">Costo de la operación</dt>
              <dd>Sin costo</dd>
            </dl>
            <p className="text-sm text-muted">
              Al confirmar, su billetera le pedirá aprobar el registro de la firma.
              {seleccion.cantidad > 50 &&
                ` Como son más de 50, se registrarán en ${Math.ceil(seleccion.cantidad / 50)} operaciones.`}
            </p>
          </>
        )}

        {estado.tipo === 'progreso' && (
          <ol aria-label="Progreso de la firma" className="space-y-2">
            {PASOS.map((texto, i) => {
              const actual = indice(estado.paso)
              const paso = estado.paso
              const detalle =
                i >= 2 && i === actual && paso.tipo !== 'preparando' && paso.tandas > 1
                  ? ` (operación ${paso.tanda} de ${paso.tandas})`
                  : ''
              return (
                <li
                  key={texto}
                  aria-current={i === actual ? 'step' : undefined}
                  className={`flex items-center gap-2 ${i > actual ? 'text-muted' : 'text-institutional'}`}
                >
                  {i < actual ? (
                    <span aria-hidden="true">✓</span>
                  ) : i === actual ? (
                    <Girando />
                  ) : (
                    <span aria-hidden="true">○</span>
                  )}
                  {texto}
                  {detalle}
                </li>
              )
            })}
            {estado.paso.tipo === 'registrando' && (
              <li className="pt-2 text-sm text-muted">Confirme la operación en su billetera.</li>
            )}
          </ol>
        )}

        {estado.tipo === 'resultado' && (
          <ResultadoDeFirma
            resultado={estado.resultado}
            nombre={nombre}
            unidad={unidad}
            notas={seleccion.notas ?? []}
          />
        )}

        <div className="flex justify-end gap-3 pt-2">
          {estado.tipo === 'confirmar' ? (
            <>
              <button type="button" onClick={cerrar} className={BOTON_SECUNDARIO}>
                Cancelar
              </button>
              <button type="button" onClick={() => iniciar(estado.red)} className={BOTON_PRIMARIO}>
                Confirmar
              </button>
            </>
          ) : estado.tipo === 'error' ? (
            <>
              <button type="button" onClick={cerrar} className={BOTON_SECUNDARIO}>
                Cerrar
              </button>
              <button type="button" onClick={verificar} className={BOTON_PRIMARIO}>
                Intentar nuevamente
              </button>
            </>
          ) : estado.tipo === 'resultado' ? (
            <button type="button" onClick={cerrar} className={BOTON_PRIMARIO}>
              Volver a Por revisar
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

function Girando() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 animate-spin rounded-full border-2 border-institutional border-t-transparent"
    />
  )
}

function ResultadoDeFirma({
  resultado,
  nombre,
  unidad,
  notas,
}: {
  resultado: Resultado
  nombre: (codigo: string) => string
  unidad: string
  notas: string[]
}) {
  const n = resultado.firmados.length
  const fallidos = resultado.noFirmados.length
  return (
    <div className="space-y-3">
      <p role="status" className="rounded-lg bg-green-pale px-4 py-3 text-institutional">
        {n === 0 ? (
          `No se firmó ningún ${unidad}.`
        ) : (
          <>
            <strong>¡Listo!</strong>{' '}
            {n === 1 ? `Se firmó 1 ${unidad}.` : `Se firmaron ${n} ${unidad}s.`}
          </>
        )}
      </p>
      {notas.map((nota) => (
        <p key={nota} className="text-muted">
          {nota}
        </p>
      ))}
      {fallidos > 0 && (
        <div className="rounded-lg bg-amber-pale px-4 py-3">
          <p>
            {fallidos === 1
              ? `1 ${unidad} no se pudo firmar y volvió a Por revisar:`
              : `${fallidos} ${unidad}s no se pudieron firmar y volvieron a Por revisar:`}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {resultado.noFirmados.map((d) => (
              <li key={d.codigo}>
                {nombre(d.codigo)}: {d.motivo}
              </li>
            ))}
          </ul>
          <p className="mt-1">Puede intentarlo nuevamente.</p>
        </div>
      )}
      {resultado.sinConfirmar.length > 0 && (
        <div className="rounded-lg bg-orange-pale px-4 py-3">
          <p>Quedaron en proceso de firma:</p>
          <ul className="mt-1 list-disc pl-5">
            {resultado.sinConfirmar.map((d) => (
              <li key={d.codigo}>
                {nombre(d.codigo)}: {d.motivo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
