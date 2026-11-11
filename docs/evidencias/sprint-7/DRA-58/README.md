# Evidencia DRA-58: Nuevo rol "Mesa de Partes de área"

**Sprint 7 · Fecha:** 11/11/2026 · **Rama:** `DRA-58-mesa-de-partes-de-area`

**Prueba de punta a punta real** ([`plataforma/e2e/sprint7.cjs`](../../../../plataforma/e2e/sprint7.cjs)): navegador (Chromium, Playwright), frontend, backend y PostgreSQL 17, con cuentas creadas desde la pantalla Usuarios. Resultado en [`resultado.txt`](resultado.txt): **20 de 20 pasos correctos** (9 de DRA-60, 7 de DRA-61 y 4 de DRA-58).

**Regresión** en entornos limpios ([`regresion.txt`](regresion.txt)): Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23; Sprint 3, 34 de 34; Sprint 4, 32 de 32; Sprint 5, 17 de 17; Sprint 6, 30 de 30 en la segunda ejecución.

## Qué se construyó

- **Migración V27:**
  - el rol `MESA_PARTES_AREA` ("Mesa de Partes de área"), con los permisos de Mesa de Partes menos los avisos: `CUENTA_PROPIA`, `DOCUMENTO_BUSCAR`, `AUDITORIA_VER` y `DOCUMENTO_IMPRIMIR`;
  - la columna `rol.limitado_al_area`, verdadera para Emisor de área y Mesa de Partes de área.
- **Esa propiedad del rol decide quién tiene área**, en vez del código `AREA_ENCARGADA`. La usan:
  - `AlcanceDeArea`: la regla de RF05 y el área de consulta de la sesión;
  - `GestionUsuarios`: el área obligatoria y el bloqueo de reactivación de DRA-61;
  - el formulario de cuentas, la validación y el aviso "Sin área asignada" del frontend, que la reciben en `GET /api/roles`.
- **`/api/consulta`** (búsqueda, ficha, auditoría, ver y entregar):
  - la búsqueda filtra por el área de la sesión;
  - las demás consultas responden a un documento de otra área con el mismo 404 que a uno inexistente ("No se encontró el documento …").

## Qué se comprueba

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `dra58_01_area_obligatoria.png` | Al elegir "Mesa de Partes de área" sin área: "Seleccione el área de la persona." | Área obligatoria |
| `dra58_02_menu_de_ana.png` | El menú de Ana (Inicio y Buscar documentos) y el encabezado "Mesa de Partes de área – Área de Administración" | Menú y encabezado |
| `dra58_03_busqueda_solo_su_area.png` | Al buscar el DNI 45829364, que tienen dos documentos, solo aparece el de Administración | Búsqueda limitada a su área |
| `dra58_04_ficha_de_su_area.png` | La ficha del documento de su área | Ficha |
| `dra58_05_documento_de_otra_area.png` | El documento de Sanidad Agraria y Forestal, abierto por su dirección: "No se encontró el documento …" | Otra área = inexistente |

La prueba de punta a punta también comprueba:
- con el documento de otra área, la API responde **404** a la ficha, la auditoría y el PDF; con el suyo, la auditoría responde 200;
- **403** al pedir los tipos de documento, los avisos y al registrar un documento.

## Pruebas automáticas

- **Backend:**
  - `MesaDePartesDeAreaTest`, 6 pruebas:
    - busca solo en su área, mientras Mesa de Partes sigue viendo todas;
    - abre la ficha y la auditoría, ve el PDF e imprime dos veces: el historial dice "(Mesa de Partes de área)" y la segunda es un duplicado;
    - un documento de otra área recibe el mismo 404 y el mismo mensaje que uno inexistente en la ficha, la auditoría, el PDF y la entrega, y no queda nada en su historial;
    - no registra, no ve Mis documentos, no revisa, no anula, no configura áreas y no recibe avisos;
    - el cambio de área rige en la siguiente consulta;
    - el Administrador crea la cuenta con el área obligatoria, y `GET /api/roles` marca qué roles están limitados.
  - Ajustes en `CatalogosInicialesTest` (cinco roles, roles limitados y permisos del nuevo) y en `CrearCuentaTest` (cinco roles en el formulario).
- **Frontend:**
  - una prueba nueva en `FormularioCuenta.test.tsx`: pide el área y la envía;
  - los roles de prueba ahora traen `limitadoAlArea`.
- Las cantidades totales se toman del registro de la CI (ver `docs/arquitectura/integracion-continua.md`).

## Ajustes encontrados

- **Al construir:**
  - el controlador de la consulta no tiene una transacción abierta, así que leer el rol de la sesión fallaba (`LazyInitializationException`). La consulta del área se movió a `AlcanceDeArea`, con `@Transactional(readOnly = true)`;
  - `CrearCuentaTest` esperaba exactamente cuatro roles en el formulario; ahora son cinco.
- **En la regresión:** la primera ejecución del Sprint 6 falló en HU23: "No se cumplió a tiempo: la búsqueda de «45829364» muestra …", con la cuenta de Mesa de Partes, que no está limitada a un área. Al repetirla en un entorno limpio pasó 30 de 30. Fue una espera que venció, no un cambio de comportamiento: esa búsqueda no pasa por el filtro de área, y las mismas búsquedas por DNI de HU22 pasaron en esa misma ejecución.
- **No probado de punta a punta:** ver, descargar e imprimir un documento **firmado** de su área (necesita la firma con la billetera). Está cubierto por `MesaDePartesDeAreaTest` y usa la misma entrega de HU25, que ya se prueba de punta a punta en el Sprint 6.
