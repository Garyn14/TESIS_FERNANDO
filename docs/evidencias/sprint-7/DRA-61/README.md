# Evidencia DRA-61: Crear, renombrar, deshabilitar y reactivar áreas

**Sprint 7 · Fecha:** 11/11/2026 · **Rama:** `DRA-61-gestionar-areas`

**Prueba de punta a punta real** ([`plataforma/e2e/sprint7.cjs`](../../../../plataforma/e2e/sprint7.cjs)): navegador (Chromium, Playwright), frontend, backend y PostgreSQL 17, con cuentas creadas desde la pantalla Usuarios. Resultado en [`resultado.txt`](resultado.txt): **16 de 16 pasos correctos** (9 de DRA-60 y 7 de DRA-61).

**Regresión** en entornos limpios ([`regresion.txt`](regresion.txt)): Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23; Sprint 3, 34 de 34; Sprint 4, 32 de 32; Sprint 5, 17 de 17; Sprint 6, 30 de 30.

## Qué se construyó

- **En la pantalla "Áreas y documentos" de DRA-60:**
  - el botón **"Nueva área"**;
  - "Cambiar nombre" y "Deshabilitar" en cada área activa;
  - la sección **"Áreas deshabilitadas"**, con lo que conserva cada una y el botón "Reactivar".
- Cada acción pide confirmación en una ventana, y el error del servidor se muestra dentro de ella. **No existe la opción de eliminar**, ni en la pantalla ni en la API.
- **Nombre único sin mayúsculas ni tildes** (migración **V26**, un índice único sobre el nombre normalizado).
- **Código interno generado del nombre** (`Área de Sanidad Agraria` → `SANIDAD_AGRARIA`, con `_2`, `_3`… si se repite). No cambia al renombrar el área.
- **Deshabilitar** es una sola sentencia `UPDATE … WHERE activa AND NOT EXISTS (personas activas)`. Si hay personas activas, responde con su cantidad.
- Cada creación, cambio de nombre, deshabilitación y reactivación queda en el historial de cambios de DRA-60.

## Qué se comprueba

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `dra61_01_area_creada.png` | "Área de Sanidad Agraria", recién creada, con "Esta área no puede emitir documentos." | Crear: activa y sin tipos |
| `dra61_02_nombre_repetido.png` | "AREA DE SANIDAD AGRARIA" → "Ya existe un área con ese nombre.", dentro de la ventana | Nombre único sin mayúsculas ni tildes |
| `dra61_03_cambiar_nombre.png` | La ventana "Cambiar el nombre del área", con el nombre actual y el nuevo | Cambiar el nombre |
| `dra61_04_luis_con_el_nombre_nuevo.png` | El encabezado de Luis: "Emisor de área – Área de Sanidad Agraria y Forestal" | El nombre nuevo se ve en la plataforma |
| `dra61_05_area_con_personas.png` | "No se puede deshabilitar: el área tiene 1 persona activa. Muévalas a otra área desde Usuarios." | Bloqueo con personas activas |
| `dra61_06_area_deshabilitada.png` | La sección "Áreas deshabilitadas" ("Conserva: Certificado de Trabajo") y el historial | Deshabilitar; conserva sus tipos |
| `dra61_07_cuenta_en_area_deshabilitada.png` | "El área «Área de Sanidad Agraria y Forestal» está deshabilitada. Edite la cuenta y asígnele otra área antes de reactivarla." | Ajuste: sin personas activas en un área deshabilitada |
| `dra61_08_area_reactivada_e_historial.png` | El área reactivada con su Certificado de Trabajo, y el historial con "se deshabilitó" y "se reactivó" | Reactivar; historial |

La prueba de punta a punta también comprueba:
- **Al crear:**
  - el área nueva aparece en el formulario de cuentas;
  - Luis, creado en ella, registra un Certificado de Trabajo;
  - no hay ningún botón "Eliminar".
- **Al cambiar el nombre:**
  - el código sigue siendo `SANIDAD_AGRARIA`;
  - el historial anterior conserva el nombre de entonces;
  - la ficha del documento de Luis muestra el nombre nuevo.
- **Con el área deshabilitada:**
  - deja de aparecer en el formulario de cuentas;
  - el Director revisa y observa el documento de Luis, que sigue su trámite.
- **Al reactivarla:**
  - se puede reactivar la cuenta de Luis;
  - Luis vuelve a ver el Certificado de Trabajo en Nuevo documento.

## Pruebas automáticas

- **Backend:**
  - `GestionDeAreasTest`, 10 pruebas:
    - solo el Administrador, sin opción de eliminar;
    - crear y verla en el formulario de cuentas;
    - nombre obligatorio, de 3 a 100 caracteres y único sin mayúsculas ni tildes, también frente a un área deshabilitada;
    - código desde el nombre y sufijo `_2`;
    - el nombre nuevo en la sesión, con el código y el historial anterior intactos;
    - validaciones del cambio de nombre;
    - bloqueo con 2 personas y con 1 persona activa;
    - deshabilitar y reactivar conservando los tipos, con la cuenta bloqueada mientras tanto;
    - un Emisor de un área deshabilitada no registra documentos.
  - `AreaDeshabilitadaTest`: con el área ya deshabilitada, el Director firma lo pendiente, el firmado sale **válido** en la verificación del portal y el Director lo anula.
- **Frontend:** `PaginaAreas.test.tsx`, 5 pruebas nuevas, 11 en total:
  - crear, sin opción de eliminar;
  - el error se muestra dentro de la ventana;
  - cambiar el nombre;
  - deshabilitar con el mensaje de personas activas;
  - lista de áreas deshabilitadas y reactivación.
- Las cantidades totales se toman del registro de la CI (ver `docs/arquitectura/integracion-continua.md`).

## Ajustes encontrados

- **Al construir:**
  - **Una cuenta desactivada de un área deshabilitada podía reactivarse**, y quedaba una persona activa en un área deshabilitada. Ahora la reactivación se bloquea con un mensaje que indica qué hacer. Se agregó como criterio en la historia.
  - **Corregir o reemitir** un documento de un área deshabilitada necesita una persona activa del área, así que primero se reactiva el área. Se aclaró en el criterio. La firma, la verificación y la anulación no dependen del área.
- **En la prueba de punta a punta:** el texto de ayuda del nombre ("De 3 a 100 caracteres…") estaba dentro de la etiqueta y formaba parte del nombre accesible del campo. Se movió fuera, enlazado con `aria-describedby`.
- **No probado de punta a punta:** la firma y la anulación de documentos de un área deshabilitada (necesitan la billetera). Están cubiertas por `AreaDeshabilitadaTest`.
