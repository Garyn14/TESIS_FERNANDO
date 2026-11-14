import type { ReactNode } from 'react'
import { ENCABEZADOS } from '../resultados'
import DibujoDocumento from './DibujoDocumento'

/**
 * DRA-70: guía "¿Cómo verificar un documento?" del portal público. Explica las dos formas de
 * verificar (QR y código), dónde están en el documento, qué significa cada resultado y qué hacer
 * si no es el esperado. Los resultados usan el título, el ícono y los colores de TarjetaResultado,
 * para que la guía se vea igual que lo que la persona obtiene al verificar.
 */
export default function ComoVerificar() {
  return (
    <article className="space-y-6">
      <header className="rounded-xl border border-line bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-institutional">¿Cómo verificar un documento?</h1>
        <p className="mt-2 text-muted">
          Cualquier persona puede comprobar si un certificado o constancia de la Agencia Agraria
          Satipo es auténtico, gratis y sin registrarse. Hay dos formas: con el código QR o con el
          código de verificación.
        </p>
      </header>

      <Seccion titulo="Con el código QR (recomendado)">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Abra la cámara de su celular. No hace falta instalar ninguna aplicación.</li>
          <li>Apunte al código QR impreso en el documento y toque el enlace que aparece.</li>
          <li>
            Se abrirá este portal con el resultado. Si el documento es válido, verá también el
            documento completo: compárelo con el papel que tiene en la mano.
          </li>
        </ol>
      </Seccion>

      <Seccion titulo="Con el código de verificación">
        <p>Úselo si el QR está dañado o si no tiene un celular con cámara.</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Ubique el código impreso debajo del QR. Tiene la forma <Codigo>DRA-2026-F8R2MA</Codigo>.
          </li>
          <li>
            En la página principal de este portal, escríbalo en &quot;Código de verificación&quot; y
            pulse <strong>Verificar</strong>. No importa si lo escribe en minúsculas o con espacios.
          </li>
        </ol>
        <p className="mt-3 rounded-lg bg-cream p-3 text-sm">
          El código no usa la letra O ni el número 0, ni las letras I y L ni el número 1, para que
          no se confundan. Con el código verá el resultado y los datos del documento, pero{' '}
          <strong>no el documento completo</strong>: para verlo, escanee el QR.
        </p>
      </Seccion>

      <Seccion titulo="Dónde están en el documento">
        <DibujoDocumento />
      </Seccion>

      <Seccion titulo="Qué significa cada resultado">
        <ul className="space-y-3">
          <Resultado tipo="VALIDO">
            El documento es auténtico: fue emitido y firmado por la agencia y no fue modificado. Si
            verificó con el QR, compare el documento que se muestra con el papel.
          </Resultado>
          <Resultado tipo="ANULADO">
            El documento fue emitido por la agencia, pero luego se anuló y{' '}
            <strong>ya no tiene valor</strong>. Se muestra la fecha de anulación.
          </Resultado>
          <Resultado tipo="VENCIDO">
            El documento es auténtico, pero su vigencia terminó: se muestra la fecha en que venció.
            Solicite uno nuevo si lo necesita vigente.
          </Resultado>
          <Resultado tipo="NO_VALIDO">
            No coincide con ningún documento emitido por la agencia. Puede ser un código mal
            escrito, un QR dañado o un documento alterado.
          </Resultado>
          <Aviso titulo="Existe una versión corregida" icono="↻" clase={ENCABEZADOS.ANULADO.clase}>
            Aparece junto a un documento anulado: la agencia lo reemplazó por otro con los datos
            corregidos. Pida la versión nueva a quien le entregó el documento o a la agencia.
          </Aviso>
          <Aviso
            titulo="No se pudo verificar en este momento"
            icono="!"
            clase="border-amber bg-amber-pale"
          >
            Es una falla temporal del servicio, no del documento. Intente nuevamente en unos
            minutos.
          </Aviso>
        </ul>
      </Seccion>

      <Seccion titulo="Si el resultado no es el esperado">
        <ul className="list-disc space-y-2 pl-5">
          <li>Compruebe que escaneó el QR del documento original, no de una copia borrosa.</li>
          <li>Si escribió el código, revise cada letra y número.</li>
          <li>
            Si aun así cree que es un error, comuníquese con la{' '}
            <strong>Agencia Agraria Satipo</strong> e indique el código de verificación del
            documento.
          </li>
        </ul>
      </Seccion>

      <a
        href="/"
        className="inline-block rounded-lg bg-institutional px-5 py-2 font-medium text-white hover:bg-institutional-soft"
      >
        Verificar un documento
      </a>
    </article>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section aria-label={titulo} className="rounded-xl border border-line bg-card p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  )
}

function Resultado({ tipo, children }: { tipo: keyof typeof ENCABEZADOS; children: ReactNode }) {
  const { titulo, icono, clase } = ENCABEZADOS[tipo]
  return (
    <li className={`flex gap-3 rounded-lg border-2 p-4 ${clase}`}>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card font-bold"
      >
        {icono}
      </span>
      <div>
        <h3 className="font-semibold">{titulo}</h3>
        <p className="mt-1">{children}</p>
      </div>
    </li>
  )
}

/** Mensajes que no son un resultado propio: van con los colores con que aparecen en pantalla. */
function Aviso({
  titulo,
  icono,
  clase,
  children,
}: {
  titulo: string
  icono: string
  clase: string
  children: ReactNode
}) {
  return (
    <li className={`flex gap-3 rounded-lg border-2 p-4 ${clase}`}>
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card font-bold"
      >
        {icono}
      </span>
      <div>
        <h3 className="font-semibold">{titulo}</h3>
        <p className="mt-1">{children}</p>
      </div>
    </li>
  )
}

function Codigo({ children }: { children: ReactNode }) {
  return <span className="rounded bg-cream px-1.5 py-0.5 font-mono font-semibold">{children}</span>
}
