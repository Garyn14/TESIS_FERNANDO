import logo from './assets/logo-dra.png'
import PaginaVerificacion from './PaginaVerificacion'
import Portada from './Portada'
import ComoVerificar from './ayuda/ComoVerificar'
import { esComoVerificar, RUTA_COMO_VERIFICAR, tokenDeLaRuta } from './ruta'

/**
 * Portal público de verificación (HU19–HU21, RF37): sin registro ni inicio de sesión. Se abre al
 * escanear el código QR de un documento.
 */
export default function App({ ruta = window.location.pathname }: { ruta?: string }) {
  const token = tokenDeLaRuta(ruta)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-institutional text-white">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-4">
          <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-full bg-white" />
          <div>
            <p className="leading-tight font-semibold">Agencia Agraria Satipo – DRA Junín</p>
            <p className="text-sm text-white/80">Verificación de documentos</p>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        {token ? (
          <PaginaVerificacion token={token} />
        ) : esComoVerificar(ruta) ? (
          <ComoVerificar />
        ) : (
          <Portada />
        )}
      </main>
      <footer className="border-t border-line bg-card">
        <div className="mx-auto max-w-4xl space-y-2 px-4 py-4 text-sm text-muted">
          <p>
            Portal público de la Agencia Agraria Satipo. La verificación no requiere registro:
            compara el documento con su registro en la blockchain de la agencia.
          </p>
          <nav aria-label="Ayuda">
            <a href={RUTA_COMO_VERIFICAR} className="font-medium text-institutional underline">
              ¿Cómo verificar un documento?
            </a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
