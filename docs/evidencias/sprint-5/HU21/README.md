# Evidencia HU21: Comprobar la autenticidad del documento (DRA-34)

**Prueba de punta a punta real** del 05/11/2026. Recorre, sin simulaciones:
- un navegador sin sesión (Playwright);
- frontend, backend y PostgreSQL 17;
- el IPFS privado y la red Besu local (QBFT, 4 nodos), con un `RegistroDocumentos` recién desplegado.

La prueba del Sprint 5 ([`plataforma/e2e/sprint5.cjs`](../../../../plataforma/e2e/sprint5.cjs)) recorre HU21. Resultado en [`resultado.txt`](resultado.txt): **9 de 9 pasos correctos**, 6 de ellos de HU21.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos.

HU21 no tiene pantalla propia: el portal público llega con HU19. Por eso la evidencia son las respuestas de la API pública, tal como las recibió el navegador.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| [`hu21_01_valido.json`](hu21_01_valido.json) | **Válido**: el tipo, el titular y la fecha de emisión (la del bloque), sin DNI, HMAC, CID ni código | Resultado Válido, solo lectura |
| [`hu21_02_pdf_alterado.json`](hu21_02_pdf_alterado.json) | **No válido**, sin ningún dato, cuando el PDF guardado ya no es el registrado | Se recalcula el hash y se compara |
| [`hu21_03_anulado.json`](hu21_03_anulado.json) | **Anulado**, con la fecha del bloque de la anulación | Se informa la fecha |
| [`hu21_04_reemplazado.json`](hu21_04_reemplazado.json) | **Anulado** con `"versionCorregida": true`, sin el código de la reemisión | Se informa si existe una versión corregida |
| [`hu21_05_reemision_valida.json`](hu21_05_reemision_valida.json) | La reemisión, **Válida**, con el titular corregido | — |
| [`hu21_06_no_disponible.json`](hu21_06_no_disponible.json) | Con IPFS detenido: "No se pudo verificar el documento en este momento…" (503), no No válido | — |
| [`hu21_07_tiempos.txt`](hu21_07_tiempos.txt) | Los tiempos de respuesta medidos por el navegador: el máximo fue **35 ms** | Menos de dos segundos (RNF01) |

## Qué comprueba la prueba

1. **Preparación.** El área envía cuatro documentos y el Director firma tres con su billetera (una transacción real en Besu).
2. **Válido, sin sesión.**
   - La fecha de emisión es la del bloque del registro, leída directo del nodo con `consultar`.
   - La prueba descarga el PDF por la pasarela de IPFS y comprueba que su SHA-256 es el hash registrado en el contrato.
   - La respuesta no incluye el DNI, el código, el CID ni el HMAC.
   - La billetera del Director no envió ninguna transacción durante la verificación: es de solo lectura.
3. **PDF alterado.**
   - Se agrega otro PDF al mismo IPFS privado y se pone su CID en lugar del original: el resultado es No válido, sin datos.
   - Al restaurar el CID, vuelve a ser Válido.
   - También son No válidos un documento Pendiente, un token inexistente y uno mal formado.
4. **Anulado.**
   - Se anula directo en el contrato con la billetera del Director.
   - La verificación lo informa Anulado de inmediato, antes de la sincronización, porque manda el contrato.
   - La fecha es la del bloque de la anulación.
5. **Reemplazado.**
   - El área reemite el documento y el Director firma la reemisión (HU30).
   - El original se informa Anulado con "versión corregida", sin el código nuevo, aunque `reemplazadoPor` del contrato sí lo tiene.
   - La reemisión es Válida.
6. **IPFS detenido.** `docker stop e2e-ipfs` da 503 con el mensaje de "no se pudo verificar". Al volver a encenderlo, la verificación responde otra vez.
7. **Tiempo.** Las 10 verificaciones medidas tardaron entre 22 y 35 ms.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/verificacion/VerificacionDeAutenticidadTest.java` | 5, contra un nodo Kubo real:<ul><li>Válido y sin datos internos;</li><li>No válido con el PDF alterado, el HMAC distinto, sin registro en el contrato, Pendiente o con un token inválido;</li><li>Anulado con la fecha y la versión corregida sin revelar su código;</li><li>503 si la blockchain no responde;</li><li>pública y de solo lectura.</li></ul> |

Totales: 191 pruebas de backend.

## Ajustes durante la verificación

- **Script de prueba:** la primera ejecución falló porque Node resolvía `localhost` a la dirección IPv6, y el IPFS de la prueba solo escucha en `127.0.0.1`. El script usa ahora la dirección explícita.
- **Prueba automática:** buscaba la palabra "cid" en la respuesta y la encontraba dentro de "coin**cid**e". Ahora busca los nombres de campo.
