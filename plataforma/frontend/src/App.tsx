import logo from './assets/logo-dra.png'
import PaginaUsuarios from './usuarios/PaginaUsuarios'

/**
 * Por ahora muestra directamente la pantalla Usuarios (HU01). El inicio de sesión y el menú según
 * el rol llegan con HU03.
 */
export default function App() {
  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-3 bg-institutional px-6 py-3 text-white">
        <img src={logo} alt="Logo de la DRA Junín" className="h-10 w-10 rounded bg-white p-0.5" />
        <div>
          <h1 className="text-lg font-semibold">Plataforma de Certificados y Constancias</h1>
          <p className="text-white/80">Agencia Agraria Satipo – DRA Junín</p>
        </div>
      </header>
      <main>
        <PaginaUsuarios />
      </main>
    </div>
  )
}
