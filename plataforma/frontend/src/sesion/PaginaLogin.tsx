import { useState, type FormEvent } from 'react'
import { ErrorApi } from '../api/cliente'
import logo from '../assets/logo-dra.png'
import { BOTON_PRIMARIO, CAMPO } from '../comun/estilos'
import { iniciarSesion, type Sesion } from './api'

interface Props {
  aviso?: string
  onIniciada: (sesion: Sesion) => void
}

/** Inicio de sesión único para todos los roles (HU03, prototipo §6.1). */
export default function PaginaLogin({ aviso, onIniciada }: Props) {
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!usuario.trim() || !contrasena) {
      setError('Ingrese su usuario y su contraseña.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      onIniciada(await iniciarSesion(usuario.trim(), contrasena))
    } catch (e) {
      // El usuario escrito se conserva; la contraseña se borra.
      setContrasena('')
      setError(e instanceof ErrorApi ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-line bg-card p-8 shadow-sm">
        <div className="text-center">
          <img src={logo} alt="Logo de la DRA Junín" className="mx-auto h-20 w-20" />
          <h1 className="mt-4 text-2xl font-semibold text-institutional">
            Plataforma de Certificados y Constancias
          </h1>
          <p className="mt-1 text-muted">Agencia Agraria Satipo – DRA Junín</p>
        </div>

        {aviso && (
          <p role="status" className="mt-6 rounded-lg bg-amber-pale px-4 py-3 text-ink">
            ⏱ {aviso}
          </p>
        )}

        <form onSubmit={enviar} noValidate autoComplete="off" className="mt-6 space-y-4">
          <div>
            <label htmlFor="login-usuario" className="font-medium">
              Usuario
            </label>
            <input
              id="login-usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ingrese su usuario"
              autoComplete="off"
              autoCapitalize="none"
              className={`${CAMPO} border-line`}
            />
          </div>
          <div>
            <label htmlFor="login-contrasena" className="font-medium">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="login-contrasena"
                type={verContrasena ? 'text' : 'password'}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="Ingrese su contraseña"
                autoComplete="off"
                className={`${CAMPO} border-line pr-12`}
              />
              <button
                type="button"
                onClick={() => setVerContrasena((v) => !v)}
                aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute top-1/2 right-2 mt-0.5 -translate-y-1/2 rounded px-2 py-1 text-muted hover:text-institutional"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {verContrasena && <path d="M3 3l18 18" />}
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="flex items-start gap-2 text-red-700">
              <span aria-hidden="true">⚠</span>
              {error}
            </p>
          )}

          <button type="submit" disabled={enviando} className={`${BOTON_PRIMARIO} w-full py-3`}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  )
}
