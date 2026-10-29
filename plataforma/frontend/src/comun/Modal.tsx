import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  titulo: string
  onCerrar: () => void
  children: ReactNode
}

/** Ventana modal de la guía visual (§2.5). Se cierra con Escape o con onCerrar. */
export default function Modal({ titulo, onCerrar, children }: Props) {
  const id = useId()
  const dialogo = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = dialogo.current
    if (!d || d.open) return
    // jsdom (pruebas) no implementa showModal: ahí basta con marcarla abierta.
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '')
    // Sin limpieza: al desmontar, el diálogo sale del DOM. Llamar a close() dispararía onClose,
    // y en StrictMode (efecto doble en desarrollo) cerraría la ventana apenas se abre.
  }, [])

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={`${id}-titulo`}
      onClose={onCerrar}
      className="m-auto w-full max-w-lg rounded-xl border border-line bg-card p-6 text-ink shadow-lg backdrop:bg-black/40"
    >
      <h3 id={`${id}-titulo`} className="mb-4 text-xl font-semibold text-institutional">
        {titulo}
      </h3>
      {children}
    </dialog>
  )
}
