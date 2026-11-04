# Evidencia HU12: Revisar y firmar un lote (DRA-23)

**Prueba de punta a punta real** del 03/11/2026, sin simulaciones de la plataforma. Participan:

- navegador (Playwright), frontend y backend;
- PostgreSQL 17 y el nodo IPFS privado;
- la red Besu QBFT de 4 validadores, con la billetera de prueba del Director.

La prueba del Sprint 3 ([`plataforma/e2e/sprint3.cjs`](../../../../plataforma/e2e/sprint3.cjs)) recorre HU10, HU16, HU17, HU11 y HU12. Resultado en [`resultado.txt`](resultado.txt): **29 de 29 pasos correctos**, 5 de ellos de HU12.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu12_01_ventana_de_motivo.png` | Un beneficiario marcado y la ventana "Observar beneficiarios seleccionados" con el motivo | Observar beneficiarios individuales con motivo obligatorio |
| `hu12_02_ventana_de_rechazo.png` | "Rechazar beneficiarios seleccionados", con el aviso "El rechazo es definitivo. El documento no podrá reenviarse." | Rechazar beneficiarios individuales |
| `hu12_03_lote_con_observado_y_rechazado.png` | La relación del lote con un certificado **Observado** y otro **Rechazado**, sin casilla, y "cuenta para sus 3 certificados pendientes" | Solo cambian los Pendientes |
| `hu12_04_firma_del_lote.png` | "¡Listo! Se firmaron 3 certificados.", "1 certificado fue observado y devuelto al área." y "1 certificado fue rechazado." | Firmar el lote como unidad (flujo F3 del prototipo) |
| `hu12_05_mis_documentos_estados_del_lote.png` | Mis documentos de Rosa: el lote con "Observado 1", "Firmado 3" y "Rechazado 1" | El área ve cuántos hay en cada estado |
| `hu12_06_detalle_del_lote_con_motivos.png` | El detalle del lote con el estado y el motivo de cada certificado | El motivo llega al área |
| `hu12_07_lote_observado_completo.png` | "Observar lote" en otro lote: "2 certificados fueron observados y volvieron al área." y "El lote ya no tiene certificados pendientes." | Observar el lote completo |

## Qué comprueba la prueba

1. **Observar y rechazar con motivo.** En un lote de 5 certificados:
   - "Observar seleccionados" está deshabilitado hasta marcar a alguien, y "Confirmar", hasta escribir el motivo;
   - en PostgreSQL, el observado queda `OBSERVADO` con su motivo;
   - su historial registra "Observado por Ing. Carlos Mendoza Rivera: …", hecho por la cuenta cmendoza;
   - el rechazado queda `RECHAZADO` con su motivo;
   - las casillas de los ya decididos dejan de mostrarse.
2. **Firmar lote.** La ventana dice "Firmar 3 certificados":
   - los 3 Pendientes quedan Firmados en una sola transacción;
   - leyendo el contrato en Besu, los 3 están registrados y el observado y el rechazado **no**;
   - el lote sale de Por revisar.
3. **El área** ve en Mis documentos un estado por cada grupo de certificados ("Observado 1 · Firmado 3 · Rechazado 1"). En el detalle del lote ve el motivo de cada uno.
4. **Lote completo:** "Observar lote" deja sus 2 certificados en Observado. La pantalla ya no ofrece acciones, y el lote sale de Por revisar.
5. **Validación y acceso:**
   - un motivo vacío responde 400 ("Indique el motivo.");
   - el Área encargada recibe 403 al observar y al rechazar.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/DecisionEnLoteTest.java` | 4:<ul><li>observar y rechazar los elegidos, con su motivo en el documento y en el historial; rechazar uno ya observado no lo toca;</li><li>la bandeja cuenta solo los Pendientes, y el área ve los conteos por estado y los motivos;</li><li>"Firmar lote" solo prepara los Pendientes;</li><li>observar o rechazar el lote completo lo saca de Por revisar;</li><li>motivo obligatorio y de hasta 500 caracteres, certificados de otro lote, lote inexistente, otros roles (403) y sin sesión (401).</li></ul> |
| Frontend | `documentos/Revision.test.tsx` | 3 nuevas: observar los marcados (botones deshabilitados, ventana de motivo, cuerpo enviado, estado actualizado); el aviso de rechazo definitivo; un lote sin Pendientes no ofrece acciones |
| Frontend | `documentos/Lotes.test.tsx` | 2 nuevas: un lote con varios estados en Mis documentos; el detalle con el estado y el motivo de cada certificado |
| Frontend | `firma/VentanaDeFirma.test.tsx` | 1 nueva: en un lote habla de certificados, agrega los avisos y nombra a los beneficiarios que no se firmaron |

Totales: 158 pruebas de backend y 113 de frontend.

## Ajustes durante la verificación

Dos ejecuciones fallaron por errores del script de prueba, no de la plataforma:

- **Casilla de un certificado decidido:** la prueba esperaba que estuviera deshabilitada, pero la pantalla la oculta. Ahora comprueba que no aparezca.
- **Bandeja:** la prueba marcaba lotes antes de que terminara de cargarse. Ahora espera a que aparezca la fila del lote.

La prueba se repitió completa en un entorno limpio.
