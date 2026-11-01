# Evidencia HU07: Seleccionar el tipo de documento (DRA-18)

**Prueba de punta a punta real** del 01/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. Es la primera prueba del Sprint 2 ([`plataforma/e2e/sprint2.cjs`](../../../../plataforma/e2e/sprint2.cjs)). El Administrador crea las cuentas desde la pantalla Usuarios y luego se recorre HU07. Resultado en [`resultado.txt`](resultado.txt): **7 de 7 pasos correctos**.

**Regresión:** en un entorno limpio, la prueba del Sprint 1 (`sprint1.cjs`, HU01–HU06) sigue pasando sus **32 de 32 pasos** con los cambios de esta historia.

Las descripciones de cada tipo de documento (migración V9) **están pendientes de validar con el Product Owner**, igual que los nombres de las áreas.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu07_01_seleccion_capacitacion.png` | Rosa (Área de Capacitación) ve solo sus dos tipos, cada uno con su descripción y "Emisión por lista", y la nota "Solo se muestran los tipos de documento asignados a su área" | Solo se listan los tipos asignados al área |
| `hu07_02_registro_por_lista.png` | Al elegir el Certificado de Capacitación se abre "Emisión por lista", con "Origen: De oficio" y los pasos Datos del evento · Beneficiarios · Vista previa | Los tipos de oficio abren el registro por lista |
| `hu07_03_tipo_de_otra_area.png` | Al escribir la dirección de la Constancia de Productor Activo, que no es de su área, no se abre el formulario. La API también responde 403 | La regla de RF05 se aplica en el servidor |
| `hu07_04_seleccion_administracion.png` | Pedro (Área de Administración) ve sus dos tipos, "A solicitud de parte" | Solo se listan los tipos asignados al área |
| `hu07_05_registro_individual.png` | El Certificado de Trabajo abre el registro individual, con "Origen: A solicitud de parte" | Los tipos a solicitud de parte abren el registro individual |
| `hu07_06_area_cambiada_en_sesion.png` | El Administrador cambia el área de Rosa con su sesión abierta; al volver a "Nuevo documento" ve solo la Constancia de Productor Activo | El cambio de área rige con la sesión abierta |

El último paso de la prueba comprueba además que el Director no ve "Nuevo documento", que su dirección le muestra "No tiene permiso para ver esta sección" y que la API le responde 403.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/areas/SeleccionDeTipoDeDocumentoTest.java` | 7 nuevas, con sesiones reales: descripción y origen en la lista, abrir un tipo de oficio y uno a solicitud de parte, tipo de otra área, tipo inexistente o inactivo, cuenta sin área y permisos de la ruta (401 y 403 para los otros tres roles) |
| Frontend | `plataforma/frontend/src/App.test.tsx` | 7 nuevas: tarjetas con origen, aviso sin área, registro por lista, registro individual, tipo de otra área, otro rol por la dirección y nueva consulta al volver a la pantalla |

Totales: 99 pruebas de backend y 66 de frontend.

## Qué falta

Los formularios se construyen en las siguientes historias del sprint: el registro a solicitud de parte en HU08 y la emisión por lista en HU09. Mientras tanto, cada formulario indica en qué historia se habilita.
