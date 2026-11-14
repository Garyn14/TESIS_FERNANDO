import type { ReactNode } from 'react'
import { RUTA_COMO_VERIFICAR } from '../ruta'

/**
 * DRA-71: preguntas frecuentes del portal público. Cada pregunta tiene un identificador fijo, que
 * es su enlace (/preguntas-frecuentes#id): no se cambia, porque la agencia puede haberlo enviado.
 * Las respuestas se basan en cómo funciona hoy el sistema (HU19–HU21, DRA-62). Lo que depende de
 * un trámite de la agencia (pedir una copia, su costo o plazo) remite a la agencia hasta que el PO
 * entregue los datos.
 */
export interface Pregunta {
  id: string
  pregunta: string
  respuesta: ReactNode
}

export interface Grupo {
  titulo: string
  preguntas: Pregunta[]
}

export const GRUPOS: Grupo[] = [
  {
    titulo: 'Sobre la verificación',
    preguntas: [
      {
        id: 'tiene-costo',
        pregunta: '¿Verificar un documento tiene algún costo?',
        respuesta: <p>No. La verificación es gratuita y puede hacerla cualquier persona.</p>,
      },
      {
        id: 'registrarse',
        pregunta: '¿Tengo que registrarme o instalar una aplicación?',
        respuesta: (
          <p>
            No. Basta con la cámara del celular para escanear el código QR, o con escribir el código
            de verificación en este portal. No se pide usuario, contraseña ni datos personales.
          </p>
        ),
      },
      {
        id: 'desde-que-equipo',
        pregunta: '¿Desde qué celular o computadora puedo verificar?',
        respuesta: (
          <p>
            Desde cualquier celular o computadora con internet y un navegador actualizado (Chrome,
            Safari, Firefox o Edge). Para escanear el QR, la cámara de la mayoría de los celulares
            lo reconoce sola; si la suya no, use el código de verificación.
          </p>
        ),
      },
      {
        id: 'hasta-cuando',
        pregunta: '¿Hasta cuándo se puede verificar un documento?',
        respuesta: (
          <p>
            Siempre. El registro de cada documento se conserva, así que puede verificarlo años
            después. Otra cosa es la vigencia: algunos documentos son válidos solo hasta una fecha,
            impresa como &quot;Válido hasta&quot;. Después de esa fecha, la verificación lo muestra
            como &quot;Documento vencido&quot;.
          </p>
        ),
      },
      {
        id: 'que-es-blockchain',
        pregunta: '¿Qué es la blockchain y por qué da confianza?',
        respuesta: (
          <>
            <p>
              Es un registro digital en el que lo que se anota ya no se puede borrar ni cambiar sin
              que se note. Cuando el Director de la agencia firma un documento, se anota en ese
              registro una huella única del documento: una especie de resumen que cambia por
              completo si se altera una sola letra.
            </p>
            <p className="mt-2">
              Al verificar, el portal compara el documento con esa huella. Por eso, si alguien
              modifica un documento, deja de coincidir y el resultado es &quot;Documento no
              válido&quot;.
            </p>
          </>
        ),
      },
      {
        id: 'muchas-consultas',
        pregunta: '¿Qué pasa si verifico muchos documentos seguidos?',
        respuesta: (
          <p>
            Para proteger el servicio, se permiten hasta 10 consultas por minuto desde la misma
            conexión. Si las supera, verá el mensaje &quot;Hizo demasiadas consultas en poco tiempo.
            Espere un minuto e intente nuevamente.&quot; Basta con esperar un minuto.
          </p>
        ),
      },
    ],
  },
  {
    titulo: 'Si usted es el titular del documento',
    preguntas: [
      {
        id: 'que-datos-se-muestran',
        pregunta: '¿Qué datos míos se muestran al verificar?',
        respuesta: (
          <p>
            El tipo de documento, su nombre, la fecha de emisión y el estado (vigente, anulado o
            vencido). <strong>Nunca se muestra su DNI.</strong> Si se verifica con el QR y el
            documento es válido, se muestra además el documento completo, igual al que usted
            recibió.
          </p>
        ),
      },
      {
        id: 'quien-puede-verlo',
        pregunta: '¿Quién puede ver mi documento completo?',
        respuesta: (
          <p>
            Cualquier persona que tenga el código QR de su documento, por ejemplo, a quien usted se
            lo entregue. Por eso, comparta el documento solo con quien lo necesite, como haría con
            el papel. Con el código de verificación escrito no se muestra el documento completo,
            solo sus datos básicos.
          </p>
        ),
      },
      {
        id: 'perdi-mi-documento',
        pregunta: 'Perdí mi documento o se dañó el código QR. ¿Qué hago?',
        respuesta: (
          <p>
            Si todavía tiene el código de verificación (está impreso debajo del QR y en la última
            línea del documento), puede seguir verificándolo con él. Para obtener una copia del
            documento, acérquese a la Agencia Agraria Satipo.
          </p>
        ),
      },
      {
        id: 'por-que-anulado',
        pregunta: 'Mi documento sale "anulado" o con "una versión corregida". ¿Por qué?',
        respuesta: (
          <p>
            La agencia lo anuló, por ejemplo, porque tenía un error. Si dice &quot;Existe una
            versión corregida de este documento&quot;, la agencia emitió otro con los datos
            corregidos: pídalo en la Agencia Agraria Satipo. El documento anulado ya no tiene valor.
          </p>
        ),
      },
      {
        id: 'por-que-vencido',
        pregunta: 'Mi documento sale "vencido". ¿Es falso?',
        respuesta: (
          <p>
            No. &quot;Documento vencido&quot; significa que es auténtico, pero que pasó la fecha
            &quot;Válido hasta&quot; impresa en él. Si lo necesita vigente, solicite uno nuevo en la
            Agencia Agraria Satipo.
          </p>
        ),
      },
    ],
  },
  {
    titulo: 'Si usted recibe un documento (empleadores y entidades)',
    preguntas: [
      {
        id: 'como-saber-si-es-autentico',
        pregunta: '¿Cómo sé si el documento que me entregan es auténtico?',
        respuesta: (
          <p>
            Escanee su código QR. Si el resultado es &quot;Documento válido&quot;, el portal muestra
            el documento tal como lo emitió la agencia: compárelo con el que le entregaron. Si
            coinciden, es auténtico. Vea también{' '}
            <a href={RUTA_COMO_VERIFICAR} className="font-medium text-institutional underline">
              cómo verificar un documento
            </a>
            .
          </p>
        ),
      },
      {
        id: 'fotocopia-o-foto',
        pregunta: '¿Sirve verificar una fotocopia o una foto del documento?',
        respuesta: (
          <p>
            Sí, si el código QR se lee bien. Pero el resultado se refiere al documento original
            registrado, no a la copia: por eso, compare siempre la copia con el documento que
            muestra el portal. Una copia puede haber sido alterada aunque su QR sea auténtico.
          </p>
        ),
      },
      {
        id: 'no-coincide',
        pregunta: 'El papel que me entregaron no coincide con el que muestra el portal. ¿Qué hago?',
        respuesta: (
          <p>
            No lo acepte como auténtico: lo que vale es el documento que muestra el portal. Puede
            comunicarse con la Agencia Agraria Satipo e indicar el código de verificación.
          </p>
        ),
      },
      {
        id: 'varios-documentos',
        pregunta: '¿Puedo verificar varios documentos?',
        respuesta: (
          <p>
            Sí, uno por uno, con su QR o su código. Se permiten hasta 10 consultas por minuto desde
            la misma conexión; si verifica muchos seguidos, espere un minuto entre tandas.
          </p>
        ),
      },
    ],
  },
]
