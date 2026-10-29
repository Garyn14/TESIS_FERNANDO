import { useEffect, useRef, useState } from 'react'
import { alTerminarSesion, ErrorApi } from './api/cliente'
import Estructura from './estructura/Estructura'
import { MENU } from './estructura/menu'
import { PaginaInicio, PaginaPendiente, PaginaSinPermiso } from './estructura/Paginas'
import { useRuta } from './estructura/useRuta'
import { cerrarSesion, obtenerSesion, type Sesion } from './sesion/api'
import PaginaCambioObligatorio from './sesion/PaginaCambioObligatorio'
import PaginaLogin from './sesion/PaginaLogin'
import PaginaUsuarios from './usuarios/PaginaUsuarios'

const SIN_SESION = 'Inicie sesión para continuar.'

/** Raíz: inicio de sesión (HU03) y, con sesión, la estructura con el menú según el rol. */
export default function App() {
  // undefined: consultando la sesión; null: sin sesión.
  const [sesion, setSesion] = useState<Sesion | null | undefined>(undefined)
  const [aviso, setAviso] = useState('')
  const { ruta, visita, navegar } = useRuta()
  // Sube cada vez que termina la sesión: invalida las consultas de sesión que aún no respondieron.
  const generacion = useRef(0)

  useEffect(() => {
    obtenerSesion()
      .then(setSesion)
      .catch((e) => {
        if (e instanceof ErrorApi && e.message !== SIN_SESION) setAviso(e.message)
        setSesion(null)
      })
    return alTerminarSesion((mensaje) => {
      generacion.current++
      setAviso(mensaje)
      setSesion(null)
    })
  }, [])

  // Al cambiar de pantalla se vuelve a consultar la sesión: si la cuenta se desactivó o cambió de
  // rol, el menú y el acceso se actualizan aunque la pantalla no llame al servidor (RF04).
  const conSesion = sesion != null
  useEffect(() => {
    if (!conSesion) return
    // Si la sesión termina antes de la respuesta (otra solicitud recibió 401), se descarta.
    const inicio = generacion.current
    let reemplazada = false
    const vigente = () => !reemplazada && generacion.current === inicio
    obtenerSesion()
      .then((s) => vigente() && setSesion(s))
      .catch((e) => {
        if (vigente() && e instanceof ErrorApi && e.estado === 401) {
          generacion.current++
          setAviso(e.message)
          setSesion(null)
        }
      })
    return () => {
      reemplazada = true
    }
  }, [visita, conSesion])

  if (sesion === undefined) return null

  if (sesion === null)
    return (
      <PaginaLogin
        aviso={aviso}
        onIniciada={(s) => {
          setAviso('')
          setSesion(s)
          navegar('inicio')
        }}
      />
    )

  const salir = async () => {
    generacion.current++
    await cerrarSesion().catch(() => undefined)
    setSesion(null)
  }

  // HU04 (RF03): con contraseña temporal, solo se puede cambiarla.
  if (sesion.debeCambiarContrasena)
    return (
      <PaginaCambioObligatorio
        sesion={sesion}
        onCambiada={(s) => {
          setSesion(s)
          navegar('inicio')
        }}
        onCerrarSesion={salir}
      />
    )

  const opcion = MENU.find((o) => o.ruta === ruta) ?? MENU[0]
  const permitida = sesion.permisos.includes(opcion.permiso)

  let contenido
  if (!permitida) contenido = <PaginaSinPermiso />
  else if (opcion.pendiente) contenido = <PaginaPendiente mensaje={opcion.pendiente} />
  else if (opcion.ruta === 'usuarios') contenido = <PaginaUsuarios />
  // La clave recarga los tipos de documento si cambia el área de la persona.
  else contenido = <PaginaInicio key={sesion.areaNombre ?? ''} sesion={sesion} />

  return (
    <Estructura
      sesion={sesion}
      titulo={permitida ? opcion.titulo : 'Acceso restringido'}
      ruta={opcion.ruta}
      onNavegar={navegar}
      onCerrarSesion={salir}
      onSesionActualizada={setSesion}
    >
      {contenido}
    </Estructura>
  )
}
