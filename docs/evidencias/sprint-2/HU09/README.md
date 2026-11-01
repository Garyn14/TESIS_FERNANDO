# Evidencia HU09: Registrar una emisión por lista (DRA-20)

**Prueba de punta a punta real** del 01/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. La prueba del Sprint 2 ([`plataforma/e2e/sprint2.cjs`](../../../../plataforma/e2e/sprint2.cjs)) ahora recorre HU07, HU08 y HU09. Resultado en [`resultado.txt`](resultado.txt): **23 de 23 pasos correctos**, 9 de ellos de HU09.

Se usa un Excel real ([`plataforma/e2e/datos/beneficiarios-prototipo.xlsx`](../../../../plataforma/e2e/datos/beneficiarios-prototipo.xlsx)) con los 8 beneficiarios del taller del prototipo. La fila 5 trae a propósito un DNI de 7 dígitos.

**Regresión:** en un entorno limpio, la prueba del Sprint 1 (`sprint1.cjs`, HU01–HU06) pasa sus **32 de 32 pasos**.

**Pendiente de validar con el PO:**

- los campos y textos de cada tipo de oficio (el de Reconocimiento es una propuesta propia);
- las columnas de la plantilla (Nombres, Apellidos, DNI), con la lista real de beneficiarios;
- el máximo de 300 beneficiarios por lote.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu09_01_datos_del_evento.png` | Datos del evento del Certificado de Capacitación, con el área organizadora ya completada. Sin datos no se avanza: la prueba comprueba los mensajes antes de completarlos | Datos del evento una sola vez (RF13) |
| `hu09_02_importado_con_error.png` | Tras importar el Excel aparecen las 8 filas. La fila 5 está en rojo con "El DNI debe tener 8 dígitos", y arriba se lee "Hay 1 error en la lista. Corríjalo para continuar". No se puede continuar | Se carga desde la plantilla Excel. Cada fila se valida y sus errores se señalan (RF14, RF15) |
| `hu09_03_lista_corregida.png` | Con el DNI corregido: "8 beneficiarios listos" | Validación por fila |
| `hu09_04_dni_repetido.png` | Una fila agregada a mano con el DNI de la fila 1: las dos filas se marcan ("se repite en la fila 9" y "en la fila 1") | Carga manual. DNI repetido (RF15) |
| `hu09_05_vista_previa.png` | Certificado de ejemplo de Juan Ccori Pari, con el texto del taller y las fechas en letras, la marca "VISTA PREVIA" y la firma. El resumen muestra los 8 certificados, el evento, el periodo y los 8 nombres | La vista previa muestra un ejemplo y la relación completa (RF19) |
| `hu09_06_confirmar_envio.png` | "¿Enviar 8 certificados a revisión del Director?" | Confirmación |
| `hu09_07_enviado.png` | "¡Listo! Se enviaron 8 certificados a revisión (Lote 2026-001)" | Se crea un documento por beneficiario, agrupados en un lote |
| `hu09_08_mis_documentos.png` | Mis documentos muestra el lote en una sola fila: "Lote 2026-001", 8 beneficiarios, Pendiente | Lotes en Mis documentos |
| `hu09_09_detalle_del_lote.png` | Detalle del lote: los datos del evento, el certificado de ejemplo y la tabla de los 8 certificados con su código propio. No hay botones para editar | Sin edición (RF20) |
| `hu09_10_certificado_del_lote.png` | El detalle de un certificado del lote indica su lote en lugar del expediente | Documento por beneficiario |
| `hu09_11_lote_de_otra_area.png` | Pedro (Administración) escribe la dirección del lote: "Este lote no pertenece a su área". La API también responde 403 | Regla de RF05 en el servidor |

Además, la prueba descarga la plantilla y comprueba que sea un .xlsx (`plantilla-beneficiarios.xlsx`). También consulta directamente PostgreSQL y comprueba lo siguiente:

- el lote tiene 8 documentos, con 8 códigos distintos, 8 tokens del QR distintos y 8 HMAC del DNI distintos;
- todos están Pendientes, son de oficio y no tienen expediente;
- cada documento tiene su evento en el historial.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/EmisionPorListaTest.java` | 12, con sesiones reales. Cubren:<ul><li>la plantilla .xlsx, con la columna DNI como texto;</li><li>que la plantilla solo se descarga para un tipo de oficio del área;</li><li>la importación: columnas en otro orden y con otras mayúsculas, DNI guardado como número, filas vacías;</li><li>el rechazo de un archivo que no es .xlsx, sin las columnas o con más de 300 filas;</li><li>la vista previa;</li><li>la validación por fila y el DNI repetido en las dos filas;</li><li>la validación del evento y la lista vacía;</li><li>el registro del lote, con códigos, tokens y HMAC únicos y el correlativo del número;</li><li>Mis documentos agrupado, el detalle y el lote de otra área;</li><li>la plantilla de Reconocimiento y el rechazo de un tipo a solicitud de parte;</li><li>los permisos;</li><li>las fechas en letras.</li></ul> |
| Frontend | `plataforma/frontend/src/documentos/Lotes.test.tsx` | 9: validación del evento, validación por fila con DNI repetido, importación de Excel, archivo inválido, vista previa y envío, error del servidor en una fila, lote en Mis documentos, detalle del lote y lote de otra área |

Totales: 123 pruebas de backend y 85 de frontend.

## Ajustes durante la verificación

- **Detalle del lote:** las capturas mostraron que la tabla de certificados quedaba angosta junto al certificado y cortaba el DNI. Ahora va debajo, a todo el ancho.
- **Encabezado "N.°":** se partía en dos líneas. Ya no.
