import { useId, useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO } from '../comun/estilos'
import {
  editarCuenta,
  AREA_ENCARGADA,
  type Area,
  type Cuenta,
  type EdicionCuenta,
  type Rol,
} from './api'
import CampoArea from './CampoArea'
import { validarEdicion, type Errores } from './validacion'

interface Props {
  cuenta: Cuenta
  roles: Rol[]
  areas: Area[]
  onGuardada: (cuenta: Cuenta) => void
  onCancelar: () => void
}

/** HU02: edita el nombre completo y el rol. El nombre de usuario se muestra pero no se edita. */
export default function FormularioEdicion({ cuenta, roles, areas, onGuardada, onCancelar }: Props) {
  const id = useId()
  const [datos, setDatos] = useState<EdicionCuenta>({
    nombreCompleto: cuenta.nombreCompleto,
    rol: cuenta.rol,
    area: cuenta.area ?? '',
  })
  const [errores, setErrores] = useState<Errores>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo: keyof EdicionCuenta, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    const normalizados = { ...datos, nombreCompleto: datos.nombreCompleto.trim() }
    const encontrados = validarEdicion(normalizados)
    setErrores(encontrados)
    setErrorGeneral('')
    if (Object.keys(encontrados).length > 0) return

    setGuardando(true)
    try {
      onGuardada(await editarCuenta(cuenta.id, normalizados))
    } catch (e) {
      if (e instanceof ErrorApi && Object.keys(e.campos).length > 0) setErrores(e.campos)
      else setErrorGeneral(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setGuardando(false)
    }
  }

  const props = (nombre: keyof EdicionCuenta) => ({
    id: `${id}-${nombre}`,
    'aria-invalid': errores[nombre] ? true : undefined,
    'aria-describedby': errores[nombre] ? `${id}-${nombre}-error` : undefined,
    className: `${CAMPO} ${errores[nombre] ? 'border-red-600' : 'border-line'}`,
  })

  const error = (nombre: keyof EdicionCuenta) =>
    errores[nombre] && (
      <p id={`${id}-${nombre}-error`} className="mt-1 text-red-700">
        {errores[nombre]}
      </p>
    )

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div>
        <p className="font-medium">Nombre de usuario</p>
        <p className="mt-1 rounded-lg bg-neutral-pale px-3 py-2">{cuenta.nombreUsuario}</p>
        <p className="mt-1 text-muted">El nombre de usuario no se puede cambiar.</p>
      </div>

      <div>
        <label htmlFor={`${id}-nombreCompleto`} className="font-medium">
          Nombre completo
        </label>
        <input
          {...props('nombreCompleto')}
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
          {...props('rol')}
          value={datos.rol}
          onChange={(e) => cambiar('rol', e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.codigo} value={r.codigo}>
              {r.nombre}
            </option>
          ))}
        </select>
        {error('rol') || (
          <p className="mt-1 text-muted">
            {roles.find((r) => r.codigo === datos.rol)?.descripcion}
          </p>
        )}
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
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  )
}
