# Revisión del Sprint 5

- **Sprint:** 5, del 05/11 al 12/11/2026. El trabajo terminó el 05/11, así que la revisión se puede adelantar.
- **Objetivo (Jira):** habilitar la verificación pública de autenticidad y validar con el PO los Sprints 3 y 4.
- **Resultado:** 3 de 3 historias construidas e integradas, con 16 puntos, todas **En revisión**. Falta la aprobación del PO (ver [Acta](#acta)). La validación de los Sprints 3 y 4 (DRA-48) también está pendiente y se puede hacer en la misma sesión.
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

Con este Sprint se cierra el ciclo del documento: ahora **cualquier persona puede comprobar, desde su celular y sin registrarse, que un certificado es auténtico**. El portal compara el PDF guardado con su registro en la blockchain.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| HU21: Comprobar la autenticidad del documento | DRA-34 | 8 | El servidor lee el registro del contrato (solo lectura), recalcula el SHA-256 del PDF guardado en IPFS y lo compara. El resultado es **Válido**, **Anulado** (con la fecha y si existe una versión corregida) o **No válido**. Se hizo antes que HU19 porque el portal muestra este resultado | [HU21](../../evidencias/sprint-5/HU21/) |
| HU19: Verificar mediante el código QR | DRA-32 | 5 | **Portal público** nuevo, sin registro, al que lleva el QR de cada documento. Muestra el resultado en menos de dos segundos y, si es válido, el documento completo | [HU19](../../evidencias/sprint-5/HU19/) |
| HU20: Verificar mediante el código de verificación | DRA-33 | 3 | Verificar escribiendo el código impreso, con solo los datos básicos y sin el documento. Límite de 10 consultas por minuto por IP | [HU20](../../evidencias/sprint-5/HU20/) |

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe el portal con **su propio celular** y deje su ok en Jira.
- **Validación pendiente de los Sprints 3 y 4 (DRA-48):** guiones del [Sprint 3](../sprint-3/guion-de-pruebas.md) y del [Sprint 4](../sprint-4/guion-de-pruebas.md). Conviene hacerlos primero en la misma sesión: dejan documentos firmados, anulados y reemitidos que luego se verifican en el portal.
- **Evidencia por historia:** [docs/evidencias/sprint-5](../../evidencias/sprint-5/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint5.cjs](../../../plataforma/e2e/sprint5.cjs), 17 de 17 pasos.
  - Usa celulares emulados sin sesión, la red Besu, IPFS y PostgreSQL reales.
  - Las pruebas de los Sprints 1 a 4 siguen pasando sus 32, 23, 34 y 32 pasos.

## Cómo levantar la demostración

Para escanear el QR con un celular real, la plataforma se levanta con la dirección de la computadora en la red local. El celular debe estar en la misma red Wi-Fi:

```bash
cd plataforma
PLATAFORMA_PORTAL_URL=http://<IP de la computadora>:5174 ./e2e/levantar.sh demo
```

- La plataforma interna sigue en <http://localhost:5173>, solo en la computadora.
- El portal público queda en la dirección indicada, también para los celulares de la red.
- Sin `PLATAFORMA_PORTAL_URL`, el portal queda en <http://localhost:5174> y solo se puede probar en la computadora.

Para abrir en pantalla el PDF firmado y escanear su QR, ejecute `./e2e/ver-registro.sh`. La descarga desde la plataforma interna llega con HU25.

## Decisiones a validar

Las tomé al refinar cada historia. El sistema ya funciona así; si el PO pide cambiar alguna, se corrige en el Sprint 6.

| # | Historia | Decisión | Por qué |
|---|---|---|---|
| 1 | HU21 | **Manda la blockchain:** un documento anulado en el contrato se informa Anulado aunque la plataforma todavía no lo haya sincronizado | RNF10: la blockchain es la fuente de verdad |
| 2 | HU21 | Además del hash del PDF, se compara el HMAC del DNI de la plataforma con el del contrato | Detecta un cambio del beneficiario en la base |
| 3 | HU21 | Un resultado **No válido** no muestra ningún dato. El motivo exacto queda solo en el registro del servidor | Para no orientar a quien intente falsificar |
| 4 | HU21 | Si la blockchain o IPFS no responden: "No se pudo verificar en este momento", **nunca** "No válido" | Un documento auténtico no debe parecer falso por una falla técnica |
| 5 | HU21 | La fecha de emisión que muestra el portal es la del **bloque** del registro | RF32 |
| 6 | HU19 | El portal es un **proyecto aparte** de la plataforma interna, sin inicio de sesión | Se publica en internet; la plataforma interna no |
| 7 | HU19 | El documento completo se muestra **solo si es Válido**. Un anulado muestra sus datos, pero no el documento | Para que no se use como válido |
| 8 | HU19 | El documento se dibuja en la página con pdf.js, que se descarga solo cuando hace falta (unos 130 kB) | Los celulares no muestran un PDF incrustado |
| 9 | HU19 | En un reemplazado: "Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo.", sin su código | RF41 |
| 10 | HU20 | Con el código **no** se muestra el documento, solo el tipo, el titular, la fecha de emisión y el estado | RF40: el código está a la vista y es corto |
| 11 | HU20 | El código se acepta en minúsculas, con espacios o sin guiones | Lo dictan por teléfono o lo copian a mano |
| 12 | HU20 | **10 consultas por minuto por IP**, entre código y QR. La descarga del documento no cuenta | RNF04. La descarga solo funciona con un token de 256 bits |

**Preguntas abiertas de Sprints anteriores**, todavía sin respuesta:

- **Sprint 2:**
  - formato del número de expediente;
  - campos y textos de cada documento a solicitud de parte;
  - columnas de la lista real de beneficiarios.
- **Sprint 1:**
  - nombres de las áreas;
  - nombre oficial en pantalla;
  - custodia de la billetera de respaldo.

**Una pregunta nueva:** ¿con qué dominio se publicará el portal? El prototipo mencionaba `verifica.agrojunin.gob.pe`. El dominio va impreso en cada PDF (leyenda y QR), así que conviene definirlo antes de emitir documentos reales.

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| Validación del PO de los Sprints 3 y 4 (DRA-48) | Las 11 historias se cerraron el 05/11 sin las pruebas del PO | En la misma sesión que esta revisión |
| Infraestructura en AWS (DRA-44) | El portal solo funciona en la red local. Para el público hacen falta un servidor, un dominio y un certificado HTTPS. Sigue diferida para no gastar crédito | Antes de emitir documentos reales |
| Límite de consultas con varias instancias | El límite vive en la memoria de cada instancia del backend. Con varias en AWS habrá que compartirlo | Con DRA-44 |
| Dominio del portal | Va impreso en cada PDF: un documento emitido con otra dirección no se puede cambiar | Antes de emitir documentos reales |

## Calidad del incremento

- **Integración continua:** cada historia se integró a `main` con todos los jobs en verde (ejecuciones 41967370698, 41969603568 y 41972278652). Desde HU19 son **6 jobs**: se sumó "Portal (React + Vite)".
- **Pruebas automáticas al cierre** (según la CI):
  - 195 de backend;
  - 11 del portal;
  - 130 de frontend;
  - 28 del contrato.
- **Tiempos de respuesta medidos** (RNF01 pide menos de dos segundos):
  - verificación por la API: entre 22 y 35 ms;
  - desde que se abre el enlace del QR hasta ver el resultado: 226 ms;
  - desde que se pulsa "Verificar" con el código: 125 ms.
- **Problemas reales encontrados en la verificación y corregidos:**
  - el PDF incrustado se veía en blanco en los celulares, y ahora se dibuja con pdf.js (HU19);
  - en modo desarrollo cada visita contaba dos veces para el límite, y ahora cuenta una (HU20);
  - Spring Security impedía mostrar el PDF en un marco del propio portal (HU19).

## Acta

*Se completa en la reunión de revisión.*

- **Fecha de la validación:**
- **Cómo se validó:** con el [guion de pruebas](guion-de-pruebas.md). La decisión sobre cada historia queda en su ticket de Jira.

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| HU21: Comprobar la autenticidad del documento | DRA-34 | 8 | | |
| HU19: Verificar mediante el código QR | DRA-32 | 5 | | |
| HU20: Verificar mediante el código de verificación | DRA-33 | 3 | | |
| Validación del PO de los Sprints 3 y 4 | DRA-48 | — | | |
