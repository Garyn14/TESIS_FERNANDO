# E8: Ayuda y documentación para usuarios

**Objetivo:** que ciudadanos, empleadores y personal de la agencia sepan usar el portal y la plataforma sin pedir ayuda.
**Épica Jira:** DRA-69 · **Sprint:** 8 (DRA-70, DRA-71, DRA-75, DRA-74); DRA-72 y DRA-73 después de la validación del PO (DRA-48).
**Fuera del backlog original** de la tesis: se agregó el 13/11/2026. El contenido vive en el repositorio y lo muestran el portal y la plataforma (no se usa Confluence).

---

## DRA-70: "¿Cómo verificar un documento?" en el portal

**Como** ciudadano o empleador que recibe un documento de la agencia, **quiero** una guía clara de cómo verificarlo y de qué significa cada resultado, **para** saber si puedo confiar en él y qué hacer si no es válido.

**Contexto**

La portada del portal ya muestra tres pasos para el QR y el campo del código (HU19, HU20). Falta explicar:
- dónde están el QR y el código en el documento;
- qué significa cada resultado, en especial "Anulado", "Vencido" y "Existe una versión corregida", que hoy solo se ven al obtenerlos;
- qué hacer si el resultado no es el esperado.

Es la primera historia de la épica; DRA-71 (preguntas frecuentes) usará la misma página y el mismo estilo.

**Criterios de aceptación**

- [ ] Una página propia, `/como-verificar`, con el título "¿Cómo verificar un documento?", en el mismo diseño del portal y adaptada al celular (360 px).
- [ ] Se llega desde:
  - la portada, con el enlace "¿Cómo verificar un documento?";
  - el pie de todas las páginas del portal;
  - el resultado "Documento no válido", con el enlace "Vea cómo verificar un documento".
- [ ] **Con el código QR:** los pasos con la cámara del celular, y que no hace falta instalar ninguna aplicación ni registrarse.
- [ ] **Con el código de verificación:** dónde está impreso, cómo se escribe (por ejemplo `DRA-2026-F8R2MA`; no importan las mayúsculas ni los espacios) y que con el código no se muestra el documento completo, solo sus datos.
- [ ] **Dónde están en el documento:** un dibujo esquemático de un certificado que señala el QR, el código de verificación, la fecha de emisión y, si tiene, la fecha "Válido hasta". Es un dibujo, no un documento real.
- [ ] **Qué significa cada resultado**, con el mismo color e ícono que en el resultado:
  - **Documento válido:** auténtico y vigente; con el QR se ve el documento completo para compararlo con el papel;
  - **Documento anulado:** fue emitido, pero la agencia lo anuló y ya no tiene valor;
  - **Existe una versión corregida:** el documento fue reemplazado; hay que pedir la versión nueva a quien lo entregó o a la agencia;
  - **Documento vencido:** es auténtico, pero su vigencia terminó;
  - **Documento no válido:** no coincide con ningún documento emitido (código mal escrito, QR dañado o documento alterado);
  - **Verificación no disponible:** una falla temporal; se puede intentar de nuevo en unos minutos.
- [ ] **Si el resultado no es el esperado:** revisar que se escaneó el documento original o que el código está bien escrito, y comunicarse con la Agencia Agraria Satipo.
- [ ] Un botón "Verificar un documento" vuelve a la portada.
- [ ] Lenguaje claro, sin términos técnicos (no se menciona "hash", "IPFS" ni "Besu"; "blockchain" solo para decir dónde está el registro).

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Preguntas frecuentes | DRA-71 |
| Teléfono, correo o dirección de atención de la agencia | Pregunta al PO: no tenemos datos oficiales. Se agrega cuando los entregue |
| Versión en otros idiomas (quechua, asháninka) | Si el negocio lo pide |
| Video explicativo | Si el negocio lo pide |

**Notas técnicas**

- Ruta `/como-verificar` en `ruta.ts`. CloudFront ya la sirve sin cambios: entrega `index.html` para toda ruta sin extensión (`rutas-del-portal.js`).
- El contenido va en `portal/src/ayuda/`, en componentes de React con el texto en español. Los colores e íconos de los resultados salen de `TarjetaResultado`, para que no se desalineen.
- El dibujo es un SVG en línea, accesible con `role="img"` y una descripción.
- Pruebas con Vitest y en la prueba de punta a punta del Sprint 8 (`e2e/sprint8.cjs`), en escritorio y en celular.

| Prioridad | Puntos | Sprint |
|---|---|---|
| Media | 2 | 8 |

---

## DRA-71: Preguntas frecuentes del portal

**Como** ciudadano o empleador, **quiero** respuestas cortas a las dudas comunes sobre la verificación, **para** resolverlas solo, sin acudir a la agencia.

**Contexto**

DRA-70 explica cómo verificar y qué significa cada resultado. Quedan dudas que no son un paso:
- si cuesta;
- si sirve una fotocopia;
- qué datos se muestran y quién puede verlos;
- qué hacer si se perdió el documento;
- por qué "blockchain";
- qué pasa si se verifica muchas veces seguidas.

Las respuestas se basan en cómo funciona hoy el sistema (HU19–HU21, DRA-62). Las que dependen de un trámite de la agencia (pedir una copia, el costo, el plazo) se dejan generales y se listan como preguntas para el PO.

**Criterios de aceptación**

- [ ] Una página propia, `/preguntas-frecuentes`, con el título "Preguntas frecuentes", en el diseño del portal y adaptada al celular.
- [ ] Se llega desde la portada, desde el pie de todas las páginas (junto a "¿Cómo verificar un documento?") y desde la guía de DRA-70.
- [ ] Las preguntas van en tres grupos:
  - **Sobre la verificación:** si tiene costo, si hay que registrarse o instalar algo, desde qué celular o computadora, hasta cuándo se puede verificar, qué es la blockchain y por qué da confianza, y qué pasa si se hacen muchas consultas seguidas (el límite de 10 por minuto, HU20);
  - **Si usted es el titular del documento:** qué datos suyos se muestran (nunca el DNI), quién puede ver el documento completo (quien tenga el QR), qué hacer si lo perdió o se dañó el QR, por qué sale anulado, con una versión corregida o vencido;
  - **Si usted recibe un documento (empleadores y entidades):** cómo saber si es auténtico, si sirve una fotocopia o una foto, qué hacer si el papel no coincide con el documento que muestra el portal, y si se pueden verificar varios documentos.
- [ ] Cada pregunta se abre y se cierra (acordeón), con todas cerradas al inicio. Funcionan con el teclado y con lectores de pantalla.
- [ ] Cada pregunta tiene su propio enlace (por ejemplo `/preguntas-frecuentes#perdi-mi-documento`). Al abrir ese enlace, la pregunta aparece abierta.
- [ ] Las respuestas enlazan a la guía de DRA-70 cuando corresponde.
- [ ] Lenguaje claro, sin términos técnicos, igual que DRA-70.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Buscador de preguntas | Son unas 15; si crecen, se agrega |
| Preguntas de la plataforma interna | DRA-73, después de DRA-48 |
| Datos de atención, costo y plazo de una copia nueva | Preguntas al PO; por ahora la respuesta remite a la Agencia Agraria Satipo |

**Notas técnicas**

- Las preguntas van en un archivo de datos (`portal/src/ayuda/preguntas.ts`): título, enlace, grupo y respuesta. DRA-73 usará el mismo formato en la plataforma.
- Acordeón con `<details>` y `<summary>` del navegador: accesible y sin código extra.
- Pruebas con Vitest y en `e2e/sprint8.cjs`.

| Prioridad | Puntos | Sprint |
|---|---|---|
| Media | 3 | 8 |
