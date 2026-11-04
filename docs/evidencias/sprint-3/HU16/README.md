# Evidencia HU16: Generar el PDF final y su hash (DRA-24)

**Prueba de punta a punta real** del 03/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. La prueba del Sprint 3 ([`plataforma/e2e/sprint3.cjs`](../../../../plataforma/e2e/sprint3.cjs)) ahora recorre HU10 y HU16. Resultado en [`resultado.txt`](resultado.txt): **10 de 10 pasos correctos**, 3 de ellos de HU16.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos.

El Director abre la **muestra** del PDF final desde la revisión. Es el mismo PDF que se generará al firmar (HU11), con la marca "MUESTRA – SIN VALOR". La prueba hace lo siguiente:

1. Descarga la muestra con la sesión del Director.
2. Lee su texto con `pdftotext`.
3. Convierte la hoja a imagen con `pdftoppm`.
4. Decodifica el código QR **desde esa imagen** con ZXing, como lo haría un lector común.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu16_muestra_certificado_de_trabajo.pdf` y `hu16_01_muestra_certificado_de_trabajo.png` | Certificado de Trabajo de Lucía Paredes Quinto en A4 horizontal:<ul><li>el marco y el encabezado del prototipo;</li><li>la fecha de emisión en letras;</li><li>el código QR con el código de verificación debajo;</li><li>la firma del Ing. Carlos Mendoza Rivera con la nota "Firmado digitalmente mediante blockchain";</li><li>la leyenda "Verifique la autenticidad de este documento en localhost:5174 con el código DRA-2026-…".</li></ul> | El PDF incluye la fecha de emisión, el código QR, el código de verificación y la leyenda del portal (RF36) |
| `hu16_muestra_certificado_del_lote.pdf` y `hu16_02_muestra_certificado_del_lote.png` | El certificado de María Elena Rojas Soto, del Lote 2026-001, con el texto del taller y su propio código | Cada documento de un lote tiene su PDF |
| `hu16_03_enlace_a_la_muestra.png` | En la revisión del lote, el enlace "Ver muestra del PDF final ↗" del certificado elegido | Acceso del Director |

La prueba comprueba además lo siguiente:

- **QR:** el código leído desde la imagen es `http://localhost:5174/verificar/` seguido del token del documento guardado en PostgreSQL. No lleva el DNI.
- **Texto:** el PDF no tiene la marca "VISTA PREVIA" ni el DNI, y tiene los datos y el texto revisados.
- **Estado:** abrir la muestra no cambia el documento, que sigue Pendiente.
- **Acceso:** el Área encargada recibe 403.

La dirección del portal se configura con `PLATAFORMA_PORTAL_URL`. En el entorno local es `http://localhost:5174`, porque el portal se construye en el Sprint 5.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/GeneradorDePdfTest.java` | 5. Cubren:<ul><li>el contenido del PDF, leído con el extractor de texto de OpenPDF;</li><li>que cabe en una sola hoja;</li><li>que el hash es el SHA-256 de los bytes exactos, recalculado en la prueba;</li><li>el QR decodificado con ZXing, con la dirección y el token y sin el DNI;</li><li>la marca de la muestra;</li><li>el título de una constancia.</li></ul> |
| Backend | `.../documentos/BandejaPorRevisarTest.java` | 1 nueva: la muestra del Director (PDF válido, documento sin cambios), uno que no está pendiente (404) y otro rol (403) |
| Frontend | `plataforma/frontend/src/documentos/Revision.test.tsx` | El enlace a la muestra en la revisión de un documento y en la de cada certificado del lote |

Totales: 135 pruebas de backend y 95 de frontend.

## Ajustes durante la verificación

- **Extracción de texto:** `pdftotext -layout` mezclaba las letras de la marca "MUESTRA" con las del texto. La prueba usa `-raw`, que lee el contenido en el orden en que se escribió.
- **Diseño:**
  - el primer diseño dejaba media hoja vacía y el logo tocaba el encabezado. Se ajustaron los tamaños y espacios;
  - un ajuste intermedio empujó la leyenda a una segunda hoja. Ahora la prueba exige que el PDF tenga una sola página.
