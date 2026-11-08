# Evidencia HU23: Ver el estado de un documento (DRA-36)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright);
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local, donde se firman, anulan y reemiten los documentos con la billetera del Director.

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) recorre HU22 y HU23 con los mismos datos (ver la [evidencia de HU22](../HU22/README.md)). Resultado en [`resultado.txt`](resultado.txt): **15 de 15 pasos correctos**, 5 de ellos de HU23.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos; Sprint 5, 17 de 17 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu23_01_firmado.png` | La ficha abierta desde Buscar documentos: "Firmado y registrado en la blockchain. Se puede entregar al ciudadano.", las fechas de envío y de firma, y los datos básicos | Estado y datos básicos |
| `hu23_02_rechazado.png` | Un rechazado: la explicación ("Es definitivo…") y el motivo del rechazo | Explicación y motivo |
| `hu23_03_anulado.png` | Un anulado en la blockchain: "Fue anulado y ya no es válido.", la fecha de la anulación y su motivo | Explicación, fecha y motivo |
| `hu23_04_certificado_de_lote.png` | Un certificado de lote: el lote, el evento y el origen "De oficio", sin expediente | Datos de un lote |
| `hu23_05_reemision_en_revision.png` | Un firmado con una reemisión en revisión, con el enlace a ella | Reemisiones |
| `hu23_06_reemplazado.png` | El mismo documento después de firmarse la reemisión: Anulado, con "Fue reemplazado por el documento …" y su enlace | Reemisiones |

## Qué comprueba la prueba

1. **Desde un resultado.**
   - Mesa de Partes busca un DNI y pulsa el código del resultado.
   - La dirección queda `#/buscar/{código}?texto=45829364`.
   - Se ven el estado con su explicación, las fechas de envío y de firma, y los datos básicos: beneficiario, DNI, tipo, origen, expediente y área.
   - La página no contiene el HMAC del DNI, el CID ni la transacción.
   - "← Volver a Buscar documentos" regresa con el mismo texto y el mismo resultado.
2. **Cada estado.**
   - Rechazado: la explicación y el motivo del rechazo.
   - Anulado (en la blockchain): la explicación, "Anulado el" con fecha y hora, y el motivo de la anulación.
   - Pendiente: la explicación, sin fecha de firma.
3. **Certificado de lote.** El lote, el evento y el origen "De oficio", sin N.° de expediente.
4. **Reemisión.**
   - El área reemite un documento firmado. Su ficha dice "Tiene una reemisión en revisión", con el enlace.
   - La ficha de la reemisión dice "Reemplaza al documento …".
   - El Director la firma con su billetera: el original pasa a Anulado y su ficha dice "Fue reemplazado por el documento …", con el enlace.
5. **Código inexistente y permisos.**
   - "No se encontró el documento DRA-2026-NOEXST.", con el enlace para volver.
   - El Área encargada y el Director reciben 403 en la API de la ficha.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/FichaDelDocumentoTest.java` | 6:<ul><li>un pendiente muestra sus datos básicos, sin el HMAC del DNI ni el token del QR;</li><li>observado y rechazado muestran el motivo;</li><li>firmado con su fecha, la reemisión en curso, y el original anulado y reemplazado al firmarse la reemisión;</li><li>un certificado de lote muestra el lote y el evento;</li><li>un código inexistente responde 404 con el mensaje;</li><li>solo Consulta interna ve la ficha (401 y 403).</li></ul> |
| Frontend | `plataforma/frontend/src/consulta/Ficha.test.tsx` | 13:<ul><li>los datos básicos y las fechas en hora de Lima;</li><li>la explicación de cada uno de los otros cinco estados;</li><li>el motivo;</li><li>la fecha de firma;</li><li>el anulado reemplazado, con su enlace;</li><li>la reemisión y el original en revisión;</li><li>el certificado de lote;</li><li>el código inexistente y el enlace para volver con la búsqueda.</li></ul> |
| Frontend | `plataforma/frontend/src/consulta/Busqueda.test.tsx` | 1 nueva: el código abre la ficha (también dentro de un lote) y la búsqueda queda en la dirección |

## Ajustes durante la verificación

- **Script de prueba:** la primera ejecución falló porque la variable `URL` del script tapaba al constructor `URL` de Node. Se corrigió la comprobación de la dirección.
- **Sesiones de prueba:** en el modo de prueba la sesión expira tras 1 minuto sin uso. Los pasos que vuelven a usar las cuentas del área y del Director primero comprueban la sesión y, si expiró, vuelven a ingresar.
