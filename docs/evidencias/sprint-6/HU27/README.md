# Evidencia HU27: Avisos de resultado al Área encargada (DRA-40)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright), con las sesiones de dos áreas, del Director y de Mesa de Partes;
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local. Las firmas y las anulaciones que originan los avisos son transacciones reales.

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) recorre HU22 a HU27 con los mismos datos (ver la [evidencia de HU22](../HU22/README.md)). Resultado en [`resultado.txt`](resultado.txt): **28 de 28 pasos correctos**, 2 de ellos de HU27.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos; Sprint 5, 17 de 17 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu27_01_avisos_del_area.png` | La campana del Área de Administración con **6** avisos sin leer: firmados, el rechazo con su motivo y las dos anulaciones con su motivo (la de la blockchain y la de la reemisión) | El aviso incluye el motivo |
| `hu27_02_aviso_abre_el_documento.png` | El aviso del rechazo abre el documento en Mis documentos, con el motivo | Abre el documento |
| `hu27_03_aviso_de_lote.png` | El Área de Capacitación: la observación de 2 certificados de un lote es **un solo aviso**, "Lote 2026-001 – Manejo integrado de plagas en café: 2 certificados observados. Motivo: …" | Un aviso por lote |

## Qué comprueba la prueba

1. **Un aviso por cada resultado, con el motivo.** El Área de Administración tiene exactamente 6 avisos:
   - "Firmado: …" de Lucía, de Kevin y de la reemisión de Lucía;
   - "Rechazado: … Martha Rojas Inga. Motivo: La persona no laboró…";
   - "Anulado: … Kevin Ramos Ccanto. Motivo: Anulado en la blockchain; el motivo no llegó a registrarse en la plataforma." (se anuló directamente en el contrato);
   - "Anulado: … Lucía Paredes Quinto. Motivo: Reemplazado por {código}. Motivo de la reemisión: …".
2. **Abre el documento.**
   - El aviso del rechazo abre `#/mis-documentos/{código}`, donde se ve el motivo.
   - El aviso queda leído y la campana baja a 5.
3. **Solo el área.** El Director, Mesa de Partes y el Área de Capacitación no recibieron avisos de resultado de estos documentos.
4. **Un lote, un aviso.**
   - El Director observa 2 de los 3 certificados del lote 2026-001.
   - El Área de Capacitación recibe un solo aviso con la cantidad y el motivo, que abre `#/mis-documentos/lote/2026-001`.
   - El Área de Administración no lo recibe.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/AvisosAlAreaTest.java` | 6:<ul><li>un firmado avisa a cada persona del área y a nadie más (ni a otra área, ni al Director, ni a Mesa de Partes); repetir la confirmación no lo duplica;</li><li>observado y rechazado llevan el motivo;</li><li>una decisión sobre un lote es un solo aviso con la cantidad;</li><li>la firma de un lote es un solo aviso con la cantidad;</li><li>un aviso con la misma clave se actualiza y vuelve a quedar sin leer;</li><li>la reemisión firmada avisa el firmado y el anulado del original con su motivo.</li></ul> |

La campana del frontend (HU26) muestra cualquier tipo de aviso, así que no necesitó cambios.

## Ajustes durante la verificación

Ninguno: las pruebas automáticas y la prueba de punta a punta pasaron en la primera ejecución.
