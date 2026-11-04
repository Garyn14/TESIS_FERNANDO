# Evidencia HU11: Firmar uno o varios documentos (DRA-22)

**Prueba de punta a punta real** del 03/11/2026, sin simulaciones de la plataforma. Participan:

- navegador (Playwright), frontend y backend;
- PostgreSQL 17 y un nodo IPFS privado nuevo;
- la **red Besu QBFT de 4 validadores**, con un `RegistroDocumentos` recién desplegado.

La billetera del navegador es [`billetera-de-prueba.cjs`](../../../../plataforma/e2e/billetera-de-prueba.cjs). Hace lo mismo que MetaMask y firma transacciones **reales** en la red Besu con claves de prueba. También puede simular que la persona cancela una transacción.

La prueba del Sprint 3 ([`plataforma/e2e/sprint3.cjs`](../../../../plataforma/e2e/sprint3.cjs)) recorre HU10, HU16, HU17 y HU11. Resultado en [`resultado.txt`](resultado.txt): **24 de 24 pasos correctos**, 8 de ellos de HU11 y uno de preparación (el Administrador registra la billetera del Director y le otorga el rol de firmante).

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu11_01_confirmar_firma.png` | La ventana de firma de un documento, después de verificar la billetera: cuenta "Ing. Carlos Mendoza Rivera (0x…)", "Firmar 1 documento", la red y "Sin costo" | Se verifica la billetera y la red antes de firmar |
| `hu11_02_firma_lista.png` | "¡Listo! Se firmó 1 documento." | Firma desde la revisión |
| `hu11_pdf_firmado_desde_ipfs.pdf` | El PDF de ese documento recuperado de IPFS, cuyo SHA-256 es el registrado en el contrato | Lo impreso es lo registrado (RF30, RF31) |
| `hu11_03_barra_de_seleccion.png` | Por revisar con un lote seleccionado: "1 seleccionado (3 certificados)" y "Firmar seleccionados". El documento sin revisar tiene la casilla deshabilitada | Solo se firman documentos revisados |
| `hu11_04_firma_cancelada.png` | El Director cancela en la billetera: "No se firmó ningún documento" y los 3 certificados vuelven a Por revisar | Un documento que falla vuelve a Pendiente |
| `hu11_05_firma_en_dos_operaciones.png` | 55 certificados de dos lotes, en 2 transacciones. La segunda se cancela: "Se firmaron 50 documentos" y los 5 restantes vuelven a Por revisar | Más de 50 se dividen en varias transacciones; un fallo no detiene al resto |
| `hu11_06_bandeja_despues_de_firmar.png` | La bandeja tras firmar los 5 restantes: solo queda el documento sin revisar | Los firmados salen de Por revisar |
| `hu11_07_mis_documentos_firmado.png` y `hu11_08_mis_documentos_lote_firmado.png` | Mis documentos de cada área con **Firmado** en verde | El área ve el resultado |

## Qué comprueba la prueba

1. **Cancelación de lo que dejó HU17.** Los documentos preparados por la API y nunca registrados se devuelven a Pendiente:
   - el servidor consulta antes el contrato;
   - siguen revisados, sin CID, y su historial termina en FIRMA_CANCELADA;
   - el contrato los da por no registrados.
2. **Selección:** el documento sin revisar tiene la casilla deshabilitada, con el aviso "Revise el documento antes de seleccionarlo."
3. **Firma de un documento desde su revisión.** Queda Firmado con la transacción, el bloque, la billetera y la cuenta que firmó. Luego, **leyendo directamente el contrato en Besu**, sin pasar por el backend:
   - el hash registrado es el `hash_pdf` de PostgreSQL;
   - la billetera es la del Director;
   - la fecha del bloque es `firmado_en`, la fecha oficial de emisión (RF32);
   - el recibo está confirmado, en ese bloque y con precio de gas 0;
   - el SHA-256 del PDF recuperado de IPFS es el hash registrado.
4. **Cancelar en la billetera:** el lote vuelve a Pendiente con FIRMA_CANCELADA, y el contrato no lo registró.
5. **Más de 50.** Un lote nuevo de 52 certificados más el de 3 dan 55 documentos:
   - la ventana avisa que se registrarán en 2 operaciones;
   - la primera transacción tiene **50 eventos** `DocumentoRegistrado` en Besu;
   - la segunda se cancela: quedan 50 Firmados y 5 Pendientes.
6. **Reintento:** los 5 se firman en una nueva transacción. El lote de 52 queda Firmado con 2 transacciones distintas, comprobado en el contrato.
7. **Área y costo:**
   - Mis documentos muestra Firmado;
   - el detalle dice "Firmado por el Director y registrado en la blockchain.";
   - la billetera del Director sigue con saldo 0, porque la red no cobra (RNF11).
8. **Acceso:** el Área encargada recibe 403 en la billetera, la confirmación y la cancelación.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Contrato | `plataforma/contracts/test/RegistroDocumentos.test.ts` | 7 nuevas (22 en total). Cubren:<ul><li>registro, eventos y consulta con la fecha del bloque;</li><li>solo el firmante registra, ni el Administrador;</li><li>un firmante revocado no registra y lo anterior se mantiene;</li><li>no se registra un código dos veces, ni en la misma transacción, y si uno falla no se registra ninguno;</li><li>de 1 a 50 por transacción;</li><li>listas de distinto largo, códigos vacíos o largos, y hashes vacíos.</li></ul> |
| Contrato en Besu (CI) | `plataforma/contracts/scripts/probar-registro-besu.ts` | Registra **50 documentos en una transacción** en la red real y los consulta. Usa unos 3,7 millones de gas, sin costo |
| Backend | `FirmaDeDocumentosTest.java` | 7, con un nodo Kubo real y el contrato en memoria:<ul><li>billetera y rol leídos del contrato;</li><li>confirmación con la fecha del bloque, que no se duplica al repetirla;</li><li>transacción inválida, inexistente, de otra billetera o con la blockchain caída: no se marca nada;</li><li>un hash distinto al del PDF no se marca;</li><li>cancelación con su motivo;</li><li>un documento ya registrado no vuelve a Pendiente, y sin blockchain no se cambia nada;</li><li>acceso.</li></ul> |
| Backend | `PreparacionDeFirmaTest.java` | 2 nuevas: sin billetera, sin el rol o sin blockchain no se prepara nada; un lote se selecciona entero y la respuesta trae el HMAC del DNI |
| Backend | `ContratoRegistroWeb3jTest.java` | 3 nuevas: la firma del evento coincide con el contrato; se leen los documentos de un recibo; un recibo fallido o de otro contrato no cuenta |
| Frontend | `firma/Flujo.test.ts` | 5:<ul><li>tandas de 50;</li><li>121 documentos en 3 transacciones;</li><li>si una transacción falla, sus documentos vuelven y las demás siguen;</li><li>cancelar en la billetera;</li><li>una transacción enviada pero no confirmada queda en proceso, sin devolverse.</li></ul> |
| Frontend | `firma/VentanaDeFirma.test.tsx` | 3: flujo completo con el resultado; otra billetera conectada; sin el rol de firmante |
| Frontend | `documentos/Revision.test.tsx` y `Estado.test.tsx` | Casillas y barra de selección, botón Firmar, estado Firmado en verde |

Totales: 157 pruebas de backend, 107 de frontend y 22 del contrato.

## Ajustes durante la verificación

- **Barra de selección:** se extendía bajo el menú lateral. Ahora empieza donde termina el menú.
- **Script de prueba:** tres ejecuciones fallaron por errores del script, no de la plataforma. El script contaba filas o marcaba casillas mientras la bandeja se recargaba, o navegaba a la misma pantalla sin recargarla. Ahora espera a que la bandeja se actualice, y la prueba se repitió completa en un entorno limpio.
