# Evidencia DRA-60: Configurar qué tipos de documento emite cada área

**Sprint 7 · Fecha:** 11/11/2026 · **Rama:** `DRA-60-areas-y-documentos`

**Prueba de punta a punta real** ([`plataforma/e2e/sprint7.cjs`](../../../../plataforma/e2e/sprint7.cjs)): navegador (Chromium, Playwright), frontend, backend y PostgreSQL 17, con cuentas creadas desde la pantalla Usuarios. Resultado en [`resultado.txt`](resultado.txt): **9 de 9 pasos correctos**.

**Regresión** en entornos limpios ([`regresion.txt`](regresion.txt)): Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23; Sprint 3, 34 de 34; Sprint 4, 32 de 32; Sprint 5, 17 de 17; Sprint 6, 30 de 30.

## Qué se construyó

- **Pantalla "Áreas y documentos"** en el menú del Administrador (permiso nuevo `CATALOGO_GESTIONAR`, migración **V25**): cada área activa con sus tipos, su origen y sus personas activas (Emisor de área); asignar un tipo que el área no tiene y quitar uno que tiene, con confirmación; advertencia si un área queda sin tipos; **historial de cambios** (tabla nueva `catalogo_historial`, 30 cambios más recientes).
- **Quitar un tipo solo impide registrar documentos nuevos.** La corrección (HU15) y la reemisión (HU30) ahora validan con el tipo del propio documento, sin exigir que siga asignado al área. Para eso, el formulario y la vista previa de la corrección tienen consultas propias: `GET /api/documentos/{codigo}/formulario` y `POST /api/documentos/{codigo}/correccion/vista-previa`.

## Qué se comprueba

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `dra60_01_areas_y_documentos.png` | Las tres áreas con sus tipos, su origen y sus personas ("2 personas del área"), y "Todavía no hay cambios." | Pantalla, personas activas |
| `dra60_02_tipo_asignado.png` | "Área de Capacitación ya puede emitir Constancia de Productor Activo.", y el tipo sigue en Desarrollo Agrario | Asignar; un tipo en varias áreas |
| `dra60_03_rosa_ve_el_tipo_nuevo.png` | Rosa, sin volver a ingresar, ve la Constancia en Nuevo documento | Rige desde la siguiente pantalla |
| `dra60_04_confirmar_quitar.png` | "¿Quitar «Certificado de Trabajo» del Área de Administración? 2 personas del área dejarán de poder registrar documentos de este tipo. Los documentos ya registrados siguen su trámite." | Confirmación con las personas afectadas |
| `dra60_05_pedro_sin_certificado_de_trabajo.png` | Pedro solo ve el Certificado de Prácticas; la API rechaza un Certificado de Trabajo nuevo (403) | Ya no se registran nuevos |
| `dra60_06_observado_corregido.png` | Pedro corrige su Certificado de Trabajo observado: "✓ Documento corregido y reenviado a revisión" | Lo registrado sigue su trámite |
| `dra60_07_area_sin_tipos_e_historial.png` | "Esta área no puede emitir documentos." y el historial con los tres cambios | Área sin tipos; historial |

También se comprueba que Pedro y el Director no ven la opción, que `#/areas` les dice "No tiene permiso para ver esta sección" y que `GET /api/catalogo` les responde 403.

## Pruebas automáticas

- **Backend:** `ConfiguracionDeAreasTest` (7 pruebas: permisos, consulta, personas activas, asignar y quitar con efecto inmediato e historial, sin cambios dobles, inexistentes y área sin tipos) y `TipoQuitadoDelAreaTest` (con el tipo quitado: no se registra uno nuevo, pero el formulario, la vista previa y la corrección del observado y la reemisión del firmado funcionan, y otra área no ve el formulario). `TipoQuitadoDelAreaTest` **falla sin la corrección** de la validación (403 al corregir), lo que confirma que detecta el problema.
- **Frontend:** `PaginaAreas.test.tsx` (6 pruebas) y los ajustes de las pruebas de corrección, reemisión y menú.
- Las cantidades totales se toman del registro de la CI (ver `docs/arquitectura/integracion-continua.md`).

## Ajustes encontrados

- **Al refinar:** la corrección y la reemisión comprobaban que el tipo siguiera asignado al área; quitar un tipo las habría bloqueado. Se corrigió en el servidor.
- **En la prueba de punta a punta:** con el tipo quitado, la pantalla de corrección no cargaba, porque pedía el formulario y la vista previa a las consultas del registro nuevo. Se agregaron consultas propias para el documento.
- **En la regresión:** la prueba del Sprint 1 esperaba el menú del Administrador sin "Áreas y documentos"; se actualizaron la prueba y los guiones del Sprint 1 y de QA.
- **No probado de punta a punta:** la reemisión con el tipo quitado (necesita la firma con la billetera). Está cubierta por `TipoQuitadoDelAreaTest` y usa la misma consulta de formulario que la corrección.
