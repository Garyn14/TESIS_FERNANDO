# Evidencia HU29: Anular un documento firmado (DRA-30)

**Prueba de punta a punta real** del 04/11/2026. Recorre, sin simulaciones:
- navegador (Playwright) con una billetera de prueba que firma transacciones reales;
- frontend, backend y PostgreSQL 17;
- IPFS y la red Besu local (QBFT, 4 nodos), con un `RegistroDocumentos` recién desplegado.

La prueba del Sprint 4 ([`plataforma/e2e/sprint4.cjs`](../../../../plataforma/e2e/sprint4.cjs)) recorre HU13, HU14, HU15 y HU29. Resultado en [`resultado.txt`](resultado.txt): **26 de 26 pasos correctos**, 8 de ellos de HU29 y 1 de preparación de la billetera.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu29_01_documentos_firmados.png` | Documentos firmados: código, tipo, beneficiario con DNI, área, fecha de firma, estado y el botón "Anular" | Pantalla Documentos firmados |
| `hu29_02_confirmar_anulacion.png` | "Anular con su billetera". Muestra la cuenta del Director, "Anular 1 documento", el documento, la red y "Sin costo" | Se confirma desde la billetera del Director |
| `hu29_03_documento_anulado.png` | "Documento anulado", con el código y el beneficiario | Resultado |
| `hu29_04_firmados_con_anulado.png` | El documento en **Anulado** (gris, tachado), con el motivo y sin botón "Anular" | Solo se anulan firmados |
| `hu29_05_anulacion_cancelada.png` | "Anulación cancelada en la billetera. El documento sigue firmado." | Cancelar en la billetera |
| `hu29_06_mis_documentos_anulado.png` | Mis documentos del área: los dos anulados en gris y tachados. Uno fue confirmado por la pantalla y el otro por la sincronización | El área lo ve Anulado |
| `hu29_07_detalle_anulado.png` | Detalle para el área: "El Director lo anuló: ya no es válido…" y el motivo | El área ve el motivo |

## Qué comprueba la prueba

1. **Preparación.**
   - El Administrador registra la billetera del Director y le otorga el rol de firmante en el contrato.
   - El área envía tres documentos y el Director los firma desde Por revisar ("Se firmaron 3 documentos.").
2. **Documentos firmados.**
   - Tiene las columnas Código o lote, Tipo, Beneficiario(s), Área, Fecha de firma, Estado y Acciones.
   - El filtro por nombre ("nilo") deja una fila, y el filtro por código encuentra el documento.
3. **Anulación desde la pantalla.**
   - La ventana de motivo se titula "Anular documento" y muestra el aviso de que es definitiva. "Confirmar" está deshabilitado sin motivo.
   - El servidor guarda el motivo antes de ir a la blockchain, y el documento sigue Firmado.
   - La billetera envía **una** transacción real a Besu.
   - En PostgreSQL el documento queda Anulado con la transacción de la billetera y el bloque y la fecha del bloque, leídos del recibo en el nodo. Guarda también la billetera y quién anuló (cmendoza), y el motivo.
   - En el contrato, leído directo del nodo:
     - `anulacion(codigo)` devuelve `true` con la misma fecha;
     - `consultar(codigo)` sigue devolviendo el registro original, con el mismo hash del PDF.
   - El historial registra ANULADO: "Anulado por Ing. Carlos Mendoza Rivera con la billetera 0x…; transacción 0x…; bloque N. Motivo: …".
4. **Cancelación en la billetera.**
   - El documento sigue Firmado y se descartan el motivo y la solicitud.
   - El contrato no lo tiene anulado, y la fila conserva el botón "Anular".
5. **Navegador cerrado.**
   - Se guarda el motivo y la anulación se envía al contrato directamente, sin confirmarla en el servidor.
   - La sincronización (HU18) lee el evento `DocumentoAnulado` y lo marca Anulado, con la transacción, el bloque, cmendoza y el motivo guardado.
   - El historial registra "Anulación confirmada por la sincronización: anulado por…".
   - Ningún documento tiene dos eventos ANULADO.
6. **Reglas.**
   - Un documento Pendiente no se anula: 409, "Solo se anula un documento firmado.". Uno ya anulado tampoco: 409.
   - Un motivo en blanco recibe 400.
   - El contrato rechaza:
     - anular dos veces (`YaAnulado`);
     - un código no registrado (`NoRegistrado`);
     - una billetera sin el rol de firmante (`AccessControlUnauthorizedAccount`).
7. **Área encargada.** Ve el documento Anulado en gris y tachado en Mis documentos. En el detalle ve el aviso y el motivo.
8. **Acceso.**
   - Las dos áreas reciben 403 en Documentos firmados, en la solicitud y en la confirmación.
   - Sin sesión se recibe 401.
   - El área no tiene "Documentos firmados" en su menú.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Contrato | `plataforma/contracts/test/RegistroDocumentos.test.ts` | 3 nuevas: el firmante anula y el registro original no cambia; no anula un código no registrado ni uno ya anulado; solo un firmante anula, ni el Administrador |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/AnulacionDeDocumentosTest.java` | 5:<ul><li>el Director anula un firmado y queda Anulado con la fecha del bloque y el motivo;</li><li>solo se anula un firmado, con motivo y una transacción válida de su billetera;</li><li>si la anulación no se completa, sigue Firmado y se descarta el motivo;</li><li>la sincronización anula con el motivo guardado y descarta las solicitudes vencidas;</li><li>solo el Director ve los firmados y anula (401, 403).</li></ul> |
| Backend | `ContratoRegistroWeb3jTest.java` | 1 nueva: la firma del evento `DocumentoAnulado` y la lectura de su log |
| Frontend | `firma/Anulacion.test.tsx` | 4:<ul><li>la lista, con los lotes agrupados y el filtro;</li><li>la anulación con motivo y billetera;</li><li>la cancelación en la billetera;</li><li>otra billetera conectada no envía nada.</li></ul> |

Totales:
- contrato: 25 pruebas;
- backend: 184 pruebas;
- frontend: 124 pruebas.

## Ajustes durante la verificación

- La confirmación del navegador y la sincronización (cada 3 s en la prueba) pueden leer el mismo evento `DocumentoAnulado`. La que llega primero lo aplica, una sola vez, como en la firma de HU18.
  - En la primera ejecución llegó antes la sincronización. La prueba esperaba solo el texto de la confirmación desde la pantalla, y se corrigió para aceptar los dos orígenes.
  - Sigue comprobando que no haya eventos ANULADO duplicados.
- El detalle del área sigue mostrando la plantilla como vista previa, igual que en los documentos firmados. Mostrar el PDF firmado corresponde a HU25 (Sprint 6).
