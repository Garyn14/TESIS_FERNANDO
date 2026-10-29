import { useEffect, useState } from 'react'

const leer = () => window.location.hash.replace(/^#\/?/, '') || 'inicio'

/**
 * Ruta actual en el hash de la dirección (#/usuarios), para que sobreviva a recargar la página.
 * `visita` aumenta en cada navegación, aunque se pulse la opción en la que ya se está: así cada
 * clic en el menú vuelve a validar la sesión (HU03).
 */
export function useRuta(): { ruta: string; visita: number; navegar: (ruta: string) => void } {
  const [estado, setEstado] = useState({ ruta: leer(), visita: 0 })
  useEffect(() => {
    const alCambiar = () => setEstado((e) => ({ ruta: leer(), visita: e.visita + 1 }))
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])
  const navegar = (ruta: string) => {
    // Si la dirección cambia, el evento hashchange cuenta la visita; si es la misma, se cuenta
    // aquí. Contarla dos veces lanzaría dos validaciones de sesión que compiten entre sí.
    if (leer() === ruta) setEstado((e) => ({ ruta, visita: e.visita + 1 }))
    else window.location.hash = `/${ruta}`
  }
  return { ...estado, navegar }
}
