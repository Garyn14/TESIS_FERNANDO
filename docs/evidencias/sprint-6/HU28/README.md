# Evidencia HU28: Avisos de entrega y rechazo a Mesa de Partes (DRA-41)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright);
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local. Las firmas que originan los avisos "Listo para entregar" son transacciones reales, incluida la firma de un certificado de lote con "Firmar lote".

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) recorre HU22 a HU28 con los mismos datos (ver la [evidencia de HU22](../HU22/README.md)). Resultado en [`resultado.txt`](resultado.txt): **30 de 30 pasos correctos**, 2 de ellos de HU28.

**Regresión** en entornos limpios: ver la sección final.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu28_01_avisos_de_mesa_de_partes.png` | La campana de Mesa de Partes con **4** avisos: "Listo para entregar" de los tres firmados, con su expediente, y el rechazo con expediente y motivo | El aviso de rechazo incluye el motivo y el expediente |
| `hu28_02_aviso_abre_la_ficha.png` | El aviso de la reemisión abre su ficha, con los botones para imprimir (HU25) | Listo para entregar |
| `hu28_03_aviso_de_lote.png` | La firma del tercer certificado del lote 2026-001 llega como un solo aviso, "Listo para entregar: Lote 2026-001 – Manejo integrado de plagas en café: 1 certificado firmado" | Un aviso por lote |

## Qué comprueba la prueba

1. **Entregas y rechazo.** Mesa de Partes tiene exactamente 4 avisos:
   - "Listo para entregar" de Lucía, Kevin y la reemisión de Lucía, cada uno con su expediente;
   - "Rechazado: … Martha Rojas Inga (expediente EXP-2026-005401). Motivo: …".
   - Las observaciones y las anulaciones no se le avisan.
2. **Abre la ficha para imprimir.**
   - El aviso de la reemisión abre `#/buscar/{código}`, con los botones de entrega.
   - El aviso queda leído.
   - El área y el Director no recibieron avisos "Listo para entregar".
3. **Un lote, un aviso.**
   - El Director firma con su billetera el certificado pendiente del lote 2026-001 ("Firmar lote").
   - Mesa de Partes recibe un solo aviso con la cantidad.
   - Al pulsarlo, Buscar documentos busca el lote.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/AvisosAMesaDePartesTest.java` | 4:<ul><li>un firmado llega como "Listo para entregar" con su expediente a cada persona de Mesa de Partes, no al área ni al Director, y repetir la confirmación no lo duplica;</li><li>un rechazo lleva el expediente y el motivo, y una observación no se avisa;</li><li>un lote es un solo aviso por rechazo y por firma, que abre la búsqueda del lote;</li><li>la anulación por reemisión no se avisa, pero la reemisión firmada sí.</li></ul> |

## Ajustes durante la verificación

- **Una comprobación de HU27 en la prueba de punta a punta** decía que Mesa de Partes no recibía avisos de resultado. Con esta historia sí los recibe: los suyos, que abren Buscar documentos. Ahora comprueba que los avisos del área (los que abren Mis documentos) no le llegan.
- **Un enlace repetido en la prueba:** en la ficha hay dos enlaces con "Buscar documentos" (el del menú y "← Volver a Buscar documentos"). Ahora la prueba usa el del menú.
