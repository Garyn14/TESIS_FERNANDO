import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import {
  crearCuenta,
  AREA_ENCARGADA,
  type Area,
  type Cuenta,
  type NuevaCuenta,
  type Rol,
} from './api'
import CampoArea from './CampoArea'
import { validarCuenta, type Errores } from './validacion'

interface Props {
  roles: Rol[]
  areas: Area[]
  onCreada: (cuenta: Cuenta) => void
  onCancelar: () => void
}

export default function FormularioCuenta({ roles, areas, onCreada, onCancelar }: Props) {
  const id = useId()
  const [datos, setDatos] = useState<NuevaCuenta>({
    nombreUsuario: '',
    nombreCompleto: '',
    rol: '',
    area: '',
    contrasenaTemporal: '',
  })
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo: keyof NuevaCuenta, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const normalizados = {
      ...datos,
      nombreUsuario: datos.nombreUsuario.trim().toLowerCase(),
      nombreCompleto: datos.nombreCompleto.trim(),
    }
    const encontrados = validarCuenta(normalizados)
    setErrores(encontrados)
    setErrorGeneral('')
    if (Object.keys(encontrados).length > 0) return

    setGuardando(true)
    try {
      onCreada(await crearCuenta(normalizados))
    } catch (e) {
      if (e instanceof ErrorApi) {
        setErrores(e.campos)
        if (Object.keys(e.campos).length === 0) setErrorGeneral(e.message)
      } else {
        setErrorGeneral('Ocurrió un error inesperado.')
      }
    } finally {
      setGuardando(false)
    }
  }

  const campo = (nombre: keyof NuevaCuenta) => ({
    id: `${id}-${nombre}`,
    'aria-invalid': errores[nombre] ? true : undefined,
    'aria-describedby': errores[nombre] ? `${id}-${nombre}-error` : undefined,
    className: `${CAMPO} ${errores[nombre] ? 'border-red-600' : 'border-line'}`,
  })

  const error = (nombre: keyof NuevaCuenta) =>
    errores[nombre] && (
      <p id={`${id}-${nombre}-error`} className="mt-1 text-red-700">
        {errores[nombre]}
      </p>
    )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div>
        <label htmlFor={`${id}-nombreUsuario`} className="font-medium">
          Nombre de usuario
        </label>
        <input
          {...campo('nombreUsuario')}
          value={datos.nombreUsuario}
          onChange={(e) => cambiar('nombreUsuario', e.target.value)}
          placeholder="Ej.: jperez"
          autoComplete="off"
          maxLength={30}
        />
        {error('nombreUsuario') || (
          <p className="mt-1 text-muted">No se puede cambiar después de crear la cuenta.</p>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-nombreCompleto`} className="font-medium">
          Nombre completo
        </label>
        <input
          {...campo('nombreCompleto')}
          value={datos.nombreCompleto}
          onChange={(e) => cambiar('nombreCompleto', e.target.value)}
          autoComplete="off"
          maxLength={150}
        />
        {error('nombreCompleto')}
      </div>

      <div>
        <label htmlFor={`${id}-rol`} className="font-medium">
          Rol
        </label>
        <select
          {...campo('rol')}
          value={datos.rol}
          onChange={(e) => cambiar('rol', e.target.value)}
        >
          <option value="">Seleccione un rol</option>
          {roles.map((r) => (
            <option key={r.codigo} value={r.codigo}>
              {r.nombre}
            </option>
          ))}
        </select>
        {error('rol') ||
          (datos.rol && (
            <p className="mt-1 text-muted">
              {roles.find((r) => r.codigo === datos.rol)?.descripcion}
            </p>
          ))}
      </div>

      {datos.rol === AREA_ENCARGADA && (
        <CampoArea
          id={`${id}-area`}
          valor={datos.area}
          areas={areas}
          error={errores.area}
          onCambiar={(a) => cambiar('area', a)}
        />
      )}

      <div>
        <label htmlFor={`${id}-contrasenaTemporal`} className="font-medium">
          Contraseña temporal
        </label>
        <div className="relative">
          <input
            {...campo('contrasenaTemporal')}
            type={verContrasena ? 'text' : 'password'}
            value={datos.contrasenaTemporal}
            onChange={(e) => cambiar('contrasenaTemporal', e.target.value)}
            autoComplete="new-password"
            maxLength={20}
          />
          <button
            type="button"
            onClick={() => setVerContrasena((v) => !v)}
            className="absolute top-1/2 right-2 mt-0.5 -translate-y-1/2 rounded px-2 py-1 text-institutional-soft hover:underline"
          >
            {verContrasena ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {error('contrasenaTemporal') || (
          <p className="mt-1 text-muted">
            De 8 a 20 caracteres. La persona deberá cambiarla en su primer inicio de sesión.
          </p>
        )}
      </div>

      {errorGeneral && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-red-800">
          {errorGeneral}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button type="submit" disabled={guardando} className={BOTON_PRIMARIO}>
          {guardando ? 'Guardando…' : 'Crear cuenta'}
        </button>
      </div>
    </form>
  )
}
