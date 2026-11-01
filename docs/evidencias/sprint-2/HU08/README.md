# Evidencia HU08: Registrar un documento a solicitud de parte (DRA-19)

**Prueba de punta a punta real** del 01/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. La prueba del Sprint 2 ([`plataforma/e2e/sprint2.cjs`](../../../../plataforma/e2e/sprint2.cjs)) ahora recorre HU07 y HU08. Resultado en [`resultado.txt`](resultado.txt): **14 de 14 pasos correctos**, 7 de ellos de HU08.

**Regresión:** en un entorno limpio, la prueba del Sprint 1 (`sprint1.cjs`, HU01–HU06) pasa sus **32 de 32 pasos**. En la primera corrida falló un paso, y eso llevó al hallazgo descrito al final.

**Pendiente de validar con el PO:**

- El formato del número de expediente es **provisional** (`EXP-AAAA-NNNNNN`, tomado del prototipo).
- Los campos y los textos de cada tipo vienen del prototipo.

Cambiar cualquiera de ellos es un cambio acotado: una validación o una plantilla.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu08_01_validaciones.png` | Sin expediente, con DNI de 7 dígitos, sin nombres y con la fecha de fin anterior a la de inicio, cada campo se señala con su mensaje y no se pasa a la vista previa. El expediente sin el formato también se rechaza | Se exige el número de expediente. Se validan los campos antes del envío |
| `hu08_02_vista_previa.png` | Certificado de Trabajo con la plantilla del tipo: encabezado de la agencia, CERTIFICADO, nombre, texto con el cargo y las fechas, y firma del Director. Lleva la marca de agua "VISTA PREVIA" e indica que la fecha y el QR se asignan al firmar. Al costado, el expediente y el DNI | Se muestra una vista previa (RF18) |
| `hu08_03_confirmar_envio.png` | Enviar pide confirmación y avisa que el documento no se podrá modificar mientras esté en revisión | Confirmación del envío |
| `hu08_04_enviado.png` | "Documento enviado a revisión" con el código de verificación, de la forma DRA-2026-XXXXXX | Al enviar se genera el código (RF16) |
| `hu08_05_mis_documentos.png` | Mis documentos lista el documento con su código, tipo, beneficiario, expediente, fecha de envío y estado Pendiente | Queda Pendiente. Solo ve los documentos de su área (HU05) |
| `hu08_06_detalle_pendiente.png` | El detalle muestra los datos y la vista previa, sin ningún botón para editarlo | Sin posibilidad de edición (RF20) |
| `hu08_07_expediente_repetido.png` | Un Certificado de Prácticas con el mismo expediente no se envía: "El número de expediente ya está registrado en otro documento" | El expediente no se repite |
| `hu08_08_documento_de_otra_area.png` | Rosa (Desarrollo Agrario) no ve el documento de Administración en su lista, y al escribir su dirección se indica "Este documento no pertenece a su área". La API también responde 403 | Regla de RF05 en el servidor |

Además, la prueba consulta directamente PostgreSQL y comprueba lo siguiente:

- el documento quedó PENDIENTE, con el expediente normalizado a mayúsculas;
- tiene un token del QR de 43 caracteres (256 bits) y el HMAC del DNI en hexadecimal (64 caracteres);
- su historial tiene el evento REGISTRADO;
- la respuesta de la API no incluye ni el HMAC ni el token.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/RegistroSolicitudDeParteTest.java` | 11, con sesiones reales. Cubren:<ul><li>campos de la plantilla;</li><li>vista previa que no guarda nada;</li><li>validación de cada campo;</li><li>formato del expediente y orden de las fechas;</li><li>registro Pendiente con el código, el token y el HMAC (comparado con un cálculo independiente);</li><li>expediente repetido;</li><li>tipo de otra área y tipo de oficio;</li><li>Mis documentos por área;</li><li>detalle de otra área;</li><li>sin rutas para modificar (PUT y DELETE responden 405);</li><li>permisos.</li></ul> |
| Backend | `.../documentos/RegistroSinClaveHmacTest.java` | 1: sin la clave del HMAC configurada, la vista previa funciona pero no se registra ningún documento (503) |
| Frontend | `plataforma/frontend/src/documentos/Documentos.test.tsx` | 9: validaciones en el navegador, formato del expediente, vista previa con los datos normalizados, volver sin perder datos, confirmación y código, expediente repetido, Mis documentos, estado vacío, detalle sin edición y documento de otra área |
| Frontend | `plataforma/frontend/src/App.test.tsx` | 1: si varias solicitudes reciben 401 a la vez, el aviso conserva el primer motivo (ver el hallazgo) |

Totales: 111 pruebas de backend y 76 de frontend.

## Hallazgo durante la verificación

La regresión del Sprint 1 falló en el paso "Restablecer cierra la sesión abierta de la persona":

- **Qué pasaba:** Rosa veía un aviso genérico en lugar de "El Administrador restableció su contraseña".
- **Causa:** antes, Mis documentos no llamaba al servidor. Ahora sí, y al pulsarla salen dos solicitudes a la vez: la validación de la sesión y la lista. La primera en llegar cierra la sesión con el motivo. La segunda llega cuando la sesión ya no existe, y su aviso genérico reemplazaba al motivo.
- **Corrección:** la sesión ahora termina una sola vez y conserva el primer motivo.
- **Prueba:** la nueva prueba de frontend falla sin la corrección y pasa con ella.
