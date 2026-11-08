/** HU25: guarda el PDF con su nombre, como lo haría un enlace de descarga. */
export function guardarPdf(pdf: Blob, nombre: string) {
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(pdf)
  enlace.download = nombre
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(enlace.href), 60_000)
}

/**
 * HU25: abre el diálogo de impresión del navegador con el PDF, sin salir de la ficha. El PDF se
 * carga en un marco oculto y se imprime desde ahí.
 */
export function imprimirPdf(pdf: Blob) {
  const marco = document.createElement('iframe')
  marco.title = 'Documento para imprimir'
  marco.style.position = 'fixed'
  marco.style.width = '0'
  marco.style.height = '0'
  marco.style.border = '0'
  marco.src = URL.createObjectURL(pdf)
  marco.onload = () => {
    marco.contentWindow?.focus()
    marco.contentWindow?.print()
  }
  document.body.appendChild(marco)
  // El marco se quita después, cuando el diálogo ya se cerró.
  setTimeout(() => {
    URL.revokeObjectURL(marco.src)
    marco.remove()
  }, 600_000)
}
