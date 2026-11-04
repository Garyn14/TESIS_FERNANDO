# Evidencia HU30: Reemitir un documento con datos corregidos (DRA-31)

**Prueba de punta a punta real** del 04/11/2026. Recorre, sin simulaciones:
- navegador (Playwright) con una billetera de prueba que firma transacciones reales;
- frontend, backend y PostgreSQL 17;
- IPFS y la red Besu local (QBFT, 4 nodos), con un `RegistroDocumentos` recién desplegado.

La prueba del Sprint 4 ([`plataforma/e2e/sprint4.cjs`](../../../../plataforma/e2e/sprint4.cjs)) recorre HU13, HU14, HU15, HU29 y HU30. Resultado en [`resultado.txt`](resultado.txt): **32 de 32 pasos correctos**, 6 de ellos de HU30.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu30_01_formulario_de_reemision.png` | "Reemitir con corrección": el aviso "Reemisión de [código]…", el formulario precargado, el expediente fijo, el motivo y el aviso "Corrija al menos un dato del documento." | Formulario precargado, motivo obligatorio |
| `hu30_02_reemision_enviada.png` | "✓ Reemisión enviada a revisión" con el código nuevo; el original sigue firmado | Sigue el flujo normal de revisión |
| `hu30_03_bandeja_con_reemision.png` | Por revisar: el documento con la etiqueta **Reemisión** | El Director ve que es una reemisión |
| `hu30_04_revision_con_cambios.png` | "Este documento reemplaza a [código]", el cambio "Apellidos: Huamán Soto → Huamán Sotomayor" y el motivo | El Director visualiza los cambios |
| `hu30_05_reemision_firmada.png` | "Se firmó 1 documento." | Firma de la reemisión |
| `hu30_06_original_reemplazado.png` | El original Anulado: "Se anuló al firmarse su reemisión", "Reemplazado por [código]" y el motivo | El original se anula |
| `hu30_07_detalle_de_la_reemision.png` | La reemisión Firmada: "Reemisión de [código]" y el motivo | Historial vinculado |
| `hu30_08_reemitir_certificado_del_lote.png` | "Reemitir certificado" desde la fila del lote, con el motivo | Certificado de un lote |
| `hu30_09_lote_con_reemision.png` | La revisión del lote: "↻ Reemisión de [código]: Apellidos: Ccori Pari → Ccori Párraga" | El Director visualiza los cambios |
| `hu30_10_lote_con_certificado_reemplazado.png` | El lote del área: el certificado original Anulado con "Reemplazado por…" y la reemisión Firmada en el mismo lote | Mismo lote |

## Qué comprueba la prueba

1. **Formulario.** El área abre un documento firmado y pulsa "Reemitir con corrección".
   - Viene precargado y el número de expediente es el del original, sin poder cambiarlo.
   - Sin motivo se avisa "Ingrese el motivo de la reemisión.", y sin cambios, "Corrija al menos un dato del documento."
   - La vista previa muestra el apellido corregido y la confirmación avisa que el original se anulará.
2. **En PostgreSQL:**
   - la reemisión queda Pendiente con otro código, el mismo expediente, el vínculo al original y el motivo;
   - el original registra REEMISION_SOLICITADA a nombre de pmorales ("Reemisión solicitada por Pedro Morales Ccanto (Área de Administración): [código]. Motivo: …");
   - la reemisión registra REGISTRADO con el motivo y "Cambios: Apellidos: Huamán Soto → Huamán Sotomayor."
3. **Mientras está en curso:**
   - el original sigue Firmado y muestra "Reemisión en revisión";
   - una segunda reemisión recibe 409;
   - el Director no lo anula por separado (409) y en Documentos firmados no tiene el botón "Anular".
4. **Revisión y firma.**
   - El Director ve la etiqueta "Reemisión", el documento que reemplaza, los cambios y el motivo, y lo firma con su billetera.
   - La billetera envía **una** transacción real a Besu. Su recibo tiene 3 eventos: `DocumentoRegistrado`, `DocumentoAnulado` y `DocumentoReemplazado`.
   - En el contrato, leído directo del nodo: la reemisión está registrada, el original está anulado, `reemplazadoPor(original)` devuelve el código nuevo y el registro del original se conserva.
   - En PostgreSQL:
     - la reemisión está Firmada con esa transacción;
     - el original está Anulado con **la misma** transacción y el motivo "Reemplazado por [código]. Motivo de la reemisión: …";
     - el historial del original registra ANULADO "por reemisión (reemplazado por [código])".
5. **Área encargada.** El original se ve Anulado, con "Reemplazado por" y un enlace a la reemisión. La reemisión se ve Firmada, con "Reemisión de [código]" y el motivo.
6. **Certificado de un lote.**
   - El Director firma el lote ("Se firmaron 3 certificados.").
   - El área reemite un certificado desde su fila. El DNI de otro certificado del lote se rechaza ("El DNI ya está en otro certificado de este lote."); el DNI del propio original sí se acepta.
   - El certificado nuevo queda Pendiente **en el mismo lote**, y el lote aparece en Por revisar con "Reemisión".
   - La relación del lote muestra los cambios. "Firmar lote" firma solo ese certificado y anula al original en la blockchain (`reemplazadoPor`).
7. **Reglas y acceso.**
   - Un documento Pendiente no se reemite (409, "Solo se reemite un documento firmado."), ni uno ya anulado (409).
   - Otra área y el Director reciben 403.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Contrato | `plataforma/contracts/test/RegistroDocumentos.test.ts` | 3 nuevas:<ul><li>registra el nuevo y anula el original en la misma transacción;</li><li>si el original no está registrado o ya está anulado, no se aplica ninguna;</li><li>cantidades, longitudes y solo el firmante.</li></ul>Además, `scripts/probar-registro-besu.ts` registra 50 reemisiones en una sola transacción en Besu. |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/ReemisionDeDocumentosTest.java` | 5:<ul><li>la reemisión sigue la revisión y al firmarse anula al original en la misma transacción;</li><li>solo se reemite un firmado del área propia, con motivo y algún cambio (400, 401, 403, 409);</li><li>una rechazada deja Firmado al original, y una observada se corrige conservando el expediente;</li><li>la sincronización aplica la reemisión si el navegador se cierra;</li><li>un certificado de un lote se reemite en el mismo lote sin repetir un DNI vigente.</li></ul> |
| Frontend | `documentos/Reemision.test.tsx` | 5:<ul><li>el botón en el detalle;</li><li>la reemisión en curso y "Reemplazado por";</li><li>el formulario precargado con el motivo y el envío;</li><li>la reemisión de un certificado del lote;</li><li>lo que ve el Director.</li></ul> |
| Frontend | `firma/Flujo.test.ts` | 1 nueva: las reemisiones van en su propia transacción, separadas de los documentos nuevos |

Totales:
- contrato: 28 pruebas;
- backend: 186 pruebas;
- frontend: 130 pruebas.

## Ajustes durante la verificación

- **Motivo de anulación.** Tenía hasta 500 caracteres y no alcanzaba para "Reemplazado por [código]. Motivo de la reemisión: …" con un motivo de 500. La migración V20 lo amplía a 600.
- **Vista previa.** La vista previa de la reemisión leía el original con bloqueo de fila dentro de una transacción de solo lectura, y la prueba de backend lo detectó. Ahora solo el envío bloquea la fila.
- **Fila del certificado en el lote.** La fila del certificado reemplazado repetía "Reemplazado por…" dos veces: en el motivo y en una línea aparte. Se dejó solo el motivo.
- **El certificado de ejemplo del lote** sigue siendo el primero del lote, aunque esté anulado por una reemisión. Es solo una muestra de la plantilla con los datos del evento.
