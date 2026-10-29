import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import { cambiarContrasena, type Sesion } from './api'
import { validarCambio, type Campo, type Errores } from './validacionContrasena'

interface Props {
  /** Texto del campo de la contraseña actual: "Contraseña temporal" en el cambio obligatorio. */
  etiquetaActual?: string
  onCambiada: (sesion: Sesion) => void
  onCancelar?: () => void
}

/** HU04: cambio de la contraseña propia. */
export default function FormularioCambioContrasena({
  etiquetaActual = 'Contraseña actual',
  onCambiada,
  onCancelar,
}: Props) {
  const id = useId()
  const [valores, setValores] = useState<Record<Campo, string>>({
    contrasenaActual: '',
    contrasenaNueva: '',
    confirmacion: '',
  })
  const [ver, setVer] = useState(false)
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cambiar = (campo: Campo, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const { contrasenaActual, contrasenaNueva, confirmacion } = valores
    const encontrados = validarCambio(contrasenaActual, contrasenaNueva, confirmacion)
    setErrores(encontrados)
    setErrorGeneral('')
    if (Object.keys(encontrados).length > 0) return

    setEnviando(true)
    try {
      onCambiada(await cambiarContrasena(contrasenaActual, contrasenaNueva))
    } catch (e) {
      if (e instanceof ErrorApi && Object.keys(e.campos).length > 0) setErrores(e.campos)
      else setErrorGeneral(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setEnviando(false)
    }
  }

  const campo = (nombre: Campo, etiqueta: string, ayuda?: string) => (
    <div>
      <label htmlFor={`${id}-${nombre}`} className="font-medium">
        {etiqueta}
      </label>
      <input
        id={`${id}-${nombre}`}
        type={ver ? 'text' : 'password'}
        value={valores[nombre]}
        onChange={(e) => cambiar(nombre, e.target.value)}
        autoComplete={nombre === 'contrasenaActual' ? 'current-password' : 'new-password'}
        maxLength={nombre === 'contrasenaActual' ? undefined : 20}
        aria-invalid={errores[nombre] ? true : undefined}
        aria-describedby={errores[nombre] ? `${id}-${nombre}-error` : undefined}
        className={`${CAMPO} ${errores[nombre] ? 'border-red-600' : 'border-line'}`}
      />
      {errores[nombre] ? (
        <p id={`${id}-${nombre}-error`} className="mt-1 text-red-700">
          {errores[nombre]}
        </p>
      ) : (
        ayuda && <p className="mt-1 text-muted">{ayuda}</p>
      )}
    </div>
  )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      {campo('contrasenaActual', etiquetaActual)}
      {campo('contrasenaNueva', 'Contraseña nueva', 'De 8 a 20 caracteres.')}
      {campo('confirmacion', 'Repita la contraseña nueva')}

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
        Mostrar contraseñas
      </label>

      {errorGeneral && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
          {errorGeneral}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancelar && (
          <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
          {enviando ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}
