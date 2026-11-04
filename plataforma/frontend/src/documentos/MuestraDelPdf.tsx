/**
 * HU16: enlace a la muestra del PDF final, para que el Director vea cómo se imprimirá. La muestra
 * lleva la marca "MUESTRA – SIN VALOR" y no se guarda: el PDF definitivo se genera al firmar.
 */
export default function MuestraDelPdf({ codigo }: { codigo: string }) {
  return (
    <p className="mt-3 text-sm">
      <a
        href={`/api/revision/documentos/${encodeURIComponent(codigo)}/pdf`}
        target="_blank"
        rel="noopener"
        className="font-medium text-institutional hover:underline"
      >
        Ver muestra del PDF final ↗
      </a>
      <span className="ml-2 text-muted">
        Con fecha, QR y código de verificación, y la marca "MUESTRA – SIN VALOR".
      </span>
    </p>
  )
}
