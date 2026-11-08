# Evidencia HU24: Consultar el historial y la auditoría (DRA-37)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright);
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local. El detalle técnico se comprueba **contra ellos**, no contra la base de la plataforma.

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) recorre HU22, HU23 y HU24 con los mismos datos (ver la [evidencia de HU22](../HU22/README.md)). Resultado en [`resultado.txt`](resultado.txt): **18 de 18 pasos correctos**, 3 de ellos de HU24.

**Regresión** en entornos limpios: ver la sección final.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu24_01_historial.png` | La ficha de un documento firmado y luego anulado en la blockchain. El historial tiene 5 eventos: registrado, revisado, firma iniciada, firmado y anulado. Cada uno lleva su fecha, hora y responsable con su rol, y su detalle. La anulación va en rojo. El detalle técnico, plegado | Fecha, hora y responsable; plegado por defecto |
| `hu24_02_detalle_tecnico.png` | El detalle técnico desplegado: hash del PDF, CID, transacción y bloque de la firma, billetera firmante, fecha del registro, transacción y bloque de la anulación, fecha de la anulación y contrato, cada uno con "Copiar" | Detalle técnico |
| `hu24_03_sin_registro.png` | Un documento pendiente: "Todavía no tiene registro en la blockchain." | Detalle técnico |

## Qué comprueba la prueba

1. **Historial.**
   - El documento firmado y anulado tiene, en orden, los eventos "Registrado y enviado a revisión", "Revisado por el Director", "Firma iniciada: PDF final guardado en IPFS", "Firmado y registrado en la blockchain" y "Anulado".
   - Cada evento muestra la fecha y la hora (dd/mm/aaaa hh:mm) y el responsable con su rol: "Pedro Morales Ccanto (Área encargada)", "Ing. Carlos Mendoza Rivera (Director)".
   - La cantidad de eventos es la de `documento_historial` en la base.
   - El rechazo muestra su motivo en el historial.
2. **Detalle técnico.**
   - Está plegado al abrir la ficha: no se ve el hash.
   - Al desplegarlo, la huella del PDF es el **SHA-256 del PDF descargado del IPFS** con ese CID, y es el **hash registrado en el contrato** (lectura directa del nodo Besu).
   - La transacción de la firma existe en la red, en el bloque indicado, y fue enviada por la billetera firmante indicada.
   - La transacción de la anulación existe en el bloque indicado.
   - El contrato es el desplegado en la prueba.
   - Cada valor tiene su botón "Copiar". Al pulsar de nuevo, el detalle se pliega.
3. **Sin firma y permisos.**
   - Un pendiente dice "Todavía no tiene registro en la blockchain."
   - El Área encargada y el Director reciben 403 en la API de auditoría. Mesa de Partes recibe 200.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/AuditoriaDelDocumentoTest.java` | 6:<ul><li>un firmado muestra cada evento con su fecha y su responsable con su rol, y el detalle técnico igual al de la base, con el contrato;</li><li>un pendiente no tiene detalle técnico ni datos sensibles (HMAC del DNI, token del QR);</li><li>un evento del sistema no tiene responsable;</li><li>un anulado por reemisión muestra la transacción de la anulación;</li><li>un código inexistente responde 404;</li><li>solo `AUDITORIA_VER` consulta la auditoría (401 y 403).</li></ul> |
| Frontend | `plataforma/frontend/src/consulta/Auditoria.test.tsx` | 6:<ul><li>título, fecha, hora y responsable de cada evento, y "Sistema (sincronización con la blockchain)";</li><li>el detalle técnico plegado que se despliega y se vuelve a plegar;</li><li>el botón Copiar;</li><li>los datos de la anulación;</li><li>sin registro en la blockchain;</li><li>el error del servidor.</li></ul> |
| Frontend | `plataforma/frontend/src/consulta/Ficha.test.tsx` | 2 nuevas: con el permiso de auditoría la ficha muestra el historial; sin él, no lo consulta |

## Ajustes durante la verificación

- **Pasos de HU23 en la prueba de punta a punta:** dos fallaron al agregar el historial, porque ahora la ficha también muestra los motivos y las transacciones en el historial.
  - La comprobación de que la ficha no trae datos técnicos ahora se hace sobre la respuesta de su API.
  - Los textos del estado se buscan en la sección "Estado del trámite".
