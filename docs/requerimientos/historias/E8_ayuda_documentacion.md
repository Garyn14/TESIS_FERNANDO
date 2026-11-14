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
