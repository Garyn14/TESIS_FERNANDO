# Evidencia HU05: Asignar el área a un usuario (DRA-16)

**Prueba de punta a punta real** del 29/10/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. La prueba del sprint ([`plataforma/e2e/sprint1.cjs`](../../../../plataforma/e2e/sprint1.cjs)) ahora recorre HU01 a HU05. Resultado en [`resultado.txt`](resultado.txt): **25 de 25 pasos correctos**.

Áreas usadas: las del prototipo (Capacitación, Desarrollo Agrario y Administración). **Están pendientes de validar con el Product Owner**; si cambian, se corrigen con una migración nueva.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu05_01_area_obligatoria.png` | Con el rol Área encargada aparece el campo Área; sin área no se guarda. Al elegirla, se ve qué documentos emite | El área es obligatoria para ese rol |
| `hu05_02_inicio_con_area.png` | El encabezado dice "Área encargada – Área de Capacitación" y en Inicio se ven solo los dos tipos de su área. La API devuelve solo esos dos | Solo ve los tipos de documento de su área |
| `hu05_03_editar_area.png` | El Administrador cambia el área de la persona | Edición del área |
| `hu05_04_lista_con_area.png` | La lista de Usuarios muestra el área bajo el rol | Área visible para el Administrador |
| `hu05_05_area_cambiada_en_sesion.png` | Con la sesión abierta, en su siguiente pantalla la persona ya ve los tipos de su nueva área | El cambio rige desde la siguiente pantalla |

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/areas/AreaDeUsuarioTest.java` | 11, con sesiones reales: área obligatoria, área inválida, roles sin área, historial, cuenta antigua sin área, catálogo, tipos por área, sin área no ve tipos, cambio con sesión abierta y permisos |
| Frontend | `plataforma/frontend/src/usuarios/PaginaUsuarios.test.tsx` | 2 nuevas: área obligatoria y aviso "Sin área asignada" |
| Frontend | `plataforma/frontend/src/App.test.tsx` | 3 nuevas: área en el encabezado y tipos en Inicio, aviso sin área, roles que no consultan tipos |

## Qué queda para el Sprint 2

El segundo criterio de la tesis dice "El usuario solo ve los documentos y tipos de documento de su área". La parte de **tipos** queda cumplida aquí. La de **documentos** se completa cuando existan los documentos (HU07–HU09), usando el mismo componente de la regla RF05 (`areas/AlcanceDeArea`).

## Hallazgo durante la verificación

En la captura de la lista, la etiqueta "✓ Activa" se partía en dos líneas, un efecto del ajuste de HU04 para que la tabla quepa a 1280 px. Ahora solo la etiqueta "Bloqueada hasta…" puede ocupar dos líneas.
