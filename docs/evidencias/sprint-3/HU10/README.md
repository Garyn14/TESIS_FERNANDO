# Evidencia HU10: Ver los documentos pendientes de revisión (DRA-21)

**Prueba de punta a punta real** del 03/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. Es la primera prueba del Sprint 3 ([`plataforma/e2e/sprint3.cjs`](../../../../plataforma/e2e/sprint3.cjs)). Resultado en [`resultado.txt`](resultado.txt): **7 de 7 pasos correctos**.

Las áreas envían en este orden un Certificado de Trabajo, un lote de 3 Certificados de Capacitación y otro Certificado de Trabajo. Lo hacen por la API desde el navegador, porque la pantalla de registro ya la recorre `sprint2.cjs`. El Director trabaja desde la pantalla.

**Regresión** en entornos limpios:

- **Sprint 1** (`sprint1.cjs`): 32 de 32 pasos. Un paso usaba "Por revisar" como ejemplo de pantalla aún no construida; ahora usa "Documentos firmados".
- **Sprint 2** (`sprint2.cjs`): 23 de 23 pasos.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu10_01_bandeja_sin_revisar.png` | Bandeja "Por revisar": el certificado de Lucía, el Lote 2026-001 con el evento y "3 certificados", y el certificado de Kevin, en el orden de envío. Se ven el área, quién lo envió, la fecha y el expediente. Los tres están "Sin revisar" | Del más antiguo al más reciente. Los lotes aparecen como un solo elemento (RF21) |
| `hu10_02_revision_de_documento.png` | Revisión del Certificado de Trabajo de Lucía: sus datos, con el expediente, y la vista previa con la firma del Ing. Carlos Mendoza Rivera | Se ve el documento antes de firmarlo |
| `hu10_03_revision_de_lote.png` | Revisión del lote: los datos del evento y quién lo envió. A la izquierda, el certificado de Pedro ("Certificado 3 de 3", al que se llegó con "Siguiente ›" y luego pulsando su nombre); a la derecha, la relación con los DNI | Revisar un lote |
| `hu10_04_bandeja_con_revisados.png` | De vuelta en la bandeja, el documento de Lucía y el lote dicen "✓ Revisado". El de Kevin sigue "Sin revisar" | Se registra qué documentos fueron revisados (RF22) |

La prueba consulta además PostgreSQL y comprueba lo siguiente:

- el documento de Lucía quedó revisado por `cmendoza`, con fecha;
- volver a abrirlo no agrega un segundo evento REVISADO al historial;
- los 3 documentos del lote quedaron revisados al abrir el lote;
- el de Kevin no.

El último paso comprueba que el Área encargada no ve la opción, que su dirección le muestra "No tiene permiso para ver esta sección" y que la API le responde 403.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/BandejaPorRevisarTest.java` | 6, con sesiones reales. Cubren:<ul><li>el orden de la bandeja, con el lote en una fila con su evento y cantidad;</li><li>la revisión de un documento registrada una sola vez;</li><li>4 aperturas simultáneas que dejan una sola revisión;</li><li>el lote, que revisa todos sus documentos;</li><li>un documento o lote que no está pendiente;</li><li>los permisos de las rutas.</li></ul> |
| Frontend | `plataforma/frontend/src/documentos/Revision.test.tsx` | 5: la bandeja con el lote en una fila, la bandeja vacía ("¡Todo al día!"), abrir un documento con POST, la navegación del lote (Anterior, Siguiente y elegir un beneficiario) y un documento que ya no está pendiente |

Totales: 129 pruebas de backend y 95 de frontend.

## Hallazgo durante la verificación

La prueba de punta a punta encontró que, al abrir un documento, el evento REVISADO podía quedar **dos veces** en el historial.

- **Causa:** en modo desarrollo, React ejecuta dos veces la apertura de la pantalla, casi al mismo tiempo. Las dos solicitudes veían el documento sin revisar.
- **Corrección:** la revisión se registra con una sola sentencia condicional en PostgreSQL (`UPDATE … WHERE revisado_en IS NULL`). Así solo una de las solicitudes la registra, aunque lleguen a la vez.
- **Prueba:** la nueva prueba del backend lanza 4 aperturas simultáneas y comprueba que quede un solo registro.
