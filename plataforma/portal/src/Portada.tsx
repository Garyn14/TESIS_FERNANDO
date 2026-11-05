/** Portada del portal (HU19): cómo verificar un documento con su código QR. */
export default function Portada() {
  return (
    <section className="rounded-xl border border-line bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-institutional">Verifique un documento</h1>
      <p className="mt-2 text-muted">
        Compruebe si un certificado o constancia de la Agencia Agraria Satipo es auténtico.
      </p>
      <ol className="mt-6 space-y-4">
        {[
          'Ubique el código QR impreso en el documento, junto a la fecha de emisión.',
          'Escanéelo con la cámara de su celular.',
          'Se abrirá esta página con el resultado y, si es válido, el documento completo.',
        ].map((paso, i) => (
          <li key={paso} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-pale font-semibold text-institutional">
              {i + 1}
            </span>
            <span className="pt-0.5">{paso}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
