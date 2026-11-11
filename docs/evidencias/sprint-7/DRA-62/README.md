# Evidencia DRA-62: Vigencia opcional por tipo de documento

**Sprint 7 · Fecha:** 11/11/2026 · **Rama:** `DRA-62-vigencia-de-documentos`

**Prueba de punta a punta real** ([`plataforma/e2e/sprint7.cjs`](../../../../plataforma/e2e/sprint7.cjs)): navegador (Chromium, Playwright), frontend, portal, backend, PostgreSQL 17, IPFS y la red Besu local. La firma es una transacción real de la billetera de prueba del Director. Resultado en [`resultado.txt`](resultado.txt): **26 de 26 pasos correctos** (9 de DRA-60, 7 de DRA-61, 4 de DRA-58 y 6 de DRA-62, uno de ellos de preparación).

**Regresión** en entornos limpios ([`regresion.txt`](regresion.txt)): Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23; Sprint 3, 34 de 34; Sprint 4, 32 de 32; Sprint 5, 17 de 17; Sprint 6, 30 de 30.

## Qué se construyó (opción A: la fecha va en el PDF y el contrato no cambia)

- **Migración V28:**
  - `tipo_documento.vigencia_meses` (nulo = sin vencimiento, de 1 a 120);
  - `documento.vence_en`, que solo existe con la fecha de emisión y es posterior a ella;
  - `catalogo_historial.area_id` admite nulo, porque un cambio de vigencia es de un tipo y no de un área.
- **Configuración:**
  - la sección "Vigencia de los documentos" en "Áreas y documentos";
  - `PUT /api/catalogo/tipos-documento/{tipo}/vigencia`, solo con `CATALOGO_GESTIONAR`;
  - cada cambio queda en el historial ("Certificado de Trabajo: vigencia de 12 meses").
- **Emisión:**
  - al preparar la firma, `vence_en` es la fecha de emisión impresa más los meses de vigencia, y el PDF imprime "Válido hasta el …" debajo de esa fecha;
  - la vista previa del registro muestra "Vigencia: 12 meses desde la fecha de emisión";
  - la muestra que revisa el Director imprime la fecha que tendría si se firmara ese día.
- **Verificación** (`VerificacionDeAutenticidad`):
  - extrae el texto del PDF ya comprobado con la blockchain y exige que "Válido hasta …" coincida con `vence_en`, o que no aparezca si no vence; si no coincide, el resultado es **No válido**;
  - suma el resultado `VENCIDO`, que se calcula con el reloj de Lima (`RelojConfig`).
- **Portal:**
  - "Documento vencido", con la fecha en que venció y sin el PDF;
  - en un documento válido que vence, "Vigente hasta …".
- **Uso interno:**
  - la ficha muestra "Válido hasta" y la etiqueta "Vencido";
  - la entrega rechaza un documento vencido;
  - la búsqueda tiene el filtro "Vencidos";
  - "Listos para entregar" excluye los vencidos.

## Qué se comprueba

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `dra62_01_vigencia_configurada.png` | La sección "Vigencia de los documentos" con el Certificado de Trabajo en "Ahora: 12 meses", y el cambio en el historial | Configuración e historial |
| `dra62_02_vista_previa_con_vigencia.png` | La vista previa del Emisor de área: "Vigencia: 12 meses desde la fecha de emisión" | Vista previa |
| `dra62_03_portal_vigente_hasta.png` | El portal, con el QR de un documento firmado: "Documento válido", "Vigente hasta 11 de noviembre de 2027", y el PDF con "Válido hasta el 11 de noviembre de 2027" | PDF y portal |
| `dra62_04_fecha_alterada_no_valido.png` | La misma verificación después de cambiar `vence_en` en la base: "Documento no válido" | La fecha no se altera sin que se note |

La prueba de punta a punta también comprueba:
- que el Director firma con una transacción real y que `vence_en` es la fecha de emisión más 12 meses;
- que al devolver la fecha original, el documento vuelve a ser válido.

## Pruebas automáticas

- **Backend:** `VigenciaDeDocumentosTest`, 6 pruebas, con un reloj de prueba (`RelojDePrueba`) que se adelanta:
  - sin vigencia todo sigue igual, también diez años después;
  - solo el Administrador cambia la vigencia: los valores 0, 121 y -3 se rechazan, un valor igual al actual responde 409, el tipo inexistente 404, y el cambio queda en el historial, sin área;
  - al firmar se imprime la fecha, la vista previa la informa, y un cambio posterior no toca los documentos ya firmados;
  - **el último día es válido y desde el siguiente está vencido**, por el QR y por el código, con el mensaje, sin PDF en el portal, con la ficha marcada, la entrega rechazada, el filtro "Vencidos" y fuera de "Listos para entregar";
  - un documento vencido y anulado se informa Anulado;
  - si la fecha guardada no es la del PDF (alargada, borrada o inventada en un tipo sin vigencia), el documento sale No válido.
- **Frontend:**
  - `PaginaAreas.test.tsx`: guardar la vigencia y el error del servidor;
  - `Entrega.test.tsx`: la ficha vencida no ofrece entregar; la vigente sí;
  - `Busqueda.test.tsx`: la etiqueta "Vencido" y el filtro;
  - `Certificado.test.tsx` (nuevo): la vista previa con vigencia y sin ella.
- **Portal:** `App.test.tsx`: el resultado "Documento vencido" sin documento, y "Vigente hasta" en un documento válido.
- Las cantidades totales se toman del registro de la CI (ver `docs/arquitectura/integracion-continua.md`).

## Ajustes encontrados

- **Al construir:**
  - para probar el vencimiento sin esperar meses, agregué un `Clock` inyectable en hora de Lima (`RelojConfig`), que las pruebas reemplazan;
  - una fecha de calendario ("2027-11-11") se muestra sin pasar por `Date`, para que la zona horaria no la mueva un día;
  - los meses se escriben como en el PDF ("setiembre").
- **En la prueba de punta a punta:** el Director llamaba a la API antes de terminar de ingresar (401). Ahora se espera a que aparezca su menú.
- **En la regresión:**
  - **Sprint 5:** HU21 compara la respuesta exacta de un resultado No válido, que ahora trae el campo nuevo `venceEn: null`. Agregué ese campo a la respuesta esperada (`e2e/sprint5.cjs`) y pasó 17 de 17.
  - **Sprint 1:** la primera ejecución falló a destiempo en HU06 (la ventana de la billetera del director no mostró a tiempo el aviso "EIP-55"). Esa pantalla no cambió en esta historia, y al repetirla en un entorno limpio pasó 32 de 32.
- **No probado de punta a punta:** el resultado "Documento vencido", porque necesitaría esperar a que pase la fecha. Lo cubren `VigenciaDeDocumentosTest` (con el reloj adelantado) y la prueba del portal.
