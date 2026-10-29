import logo from './assets/logo-dra.png'

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-line bg-card p-8 text-center shadow-sm">
        <img src={logo} alt="Logo de la DRA Junín" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 text-2xl font-semibold text-institutional">
          Plataforma de Certificados y Constancias
        </h1>
        <p className="mt-1 text-muted">Agencia Agraria Satipo – DRA Junín</p>
        <p className="mt-6 rounded-lg bg-amber-pale px-4 py-3 text-ink">En construcción</p>
      </section>
    </main>
  )
}
