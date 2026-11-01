# Backlog en Jira

**Sitio:** https://dra-satipo.atlassian.net · **Proyecto:** Dra-Web (`DRA`) · **Tablero:** SCRUM board

Cargado el 28/10/2026 a partir de [historias_de_usuario.md](historias_de_usuario.md). Cada historia lleva en Jira su descripción, sus criterios de aceptación, la prioridad, los puntos (`Story point estimate`), la épica como padre y las etiquetas `E#` y `HU##`.

## Calendario de sprints (reprogramado)

Las fechas de la Tabla 26 de la tesis ya habían pasado, así que el calendario se reprogramó conservando la duración relativa: sprints de 1 semana y el Sprint 3 de dos semanas. El 29/10/2026, al cerrar el Sprint 0 antes de lo previsto, se **adelantó todo el calendario** y el Sprint 1 se inició ese mismo día. El 01/11/2026, tras cerrar el Sprint 1 el 31/10 (4 días antes de lo previsto), se **volvió a adelantar el calendario**: el Sprint 2 empieza el 01/11 y los siguientes se corren 4 días, con la misma duración.

| Sprint | Fechas | Estado | Objetivo | Historias | Puntos |
|---|---|---|---|---|---|
| 0 | 28/10 – 29/10 | Cerrado | Infraestructura: red Besu, IPFS privado y entorno de desarrollo | Tareas DRA-42, DRA-43, DRA-45, DRA-46, DRA-47 | — |
| 1 | 29/10 – 31/10 | Cerrado (24 de 24 puntos) | Usuarios, roles, áreas y billetera del director | HU01–HU06 | 24 |
| 2 | 01/11 – 07/11 | **Activo** | Solicitudes individuales y por lista; smart contract | HU07–HU09 + tarea DRA-44 (AWS, diferida) | 23 |
| 3 | 08/11 – 21/11 | Futuro | Revisión y firma con registro en la blockchain | HU10–HU12, HU16–HU18 | 47 |
| 4 | 22/11 – 28/11 | Futuro | Observar, rechazar, corregir, anular y reemitir | HU13–HU15, HU29–HU30 | 27 |
| 5 | 29/11 – 05/12 | Futuro | Verificación pública de autenticidad | HU19–HU21 | 16 |
| 6 | 06/12 – 12/12 | Futuro | Consulta interna, auditoría y notificaciones | HU22–HU28 | 19 |
| | | | | **Total** | **156** |

**Avance:** 24 de 156 puntos (15 %). Velocidad del Sprint 1: 24 puntos.

> Pendiente: actualizar la Tabla 26 de la tesis con estas fechas.

### Cierre del Sprint 1 (31/10/2026)

- **Finalizadas:** las 6 historias, de HU01 a HU06 (DRA-12 a DRA-17). Son 24 de 24 puntos, aprobadas con el [guion de pruebas](../scrum/sprint-1/guion-de-pruebas.md). Acta en [revision.md](../scrum/sprint-1/revision.md#acta).
- **Movida al Sprint 2:** DRA-44 (infraestructura en AWS), que sigue diferida hasta que se necesite para la demostración.
- **Pendientes para el Sprint 2:** las 3 preguntas abiertas al PO (áreas, nombre oficial y custodia del respaldo) y los insumos para las plantillas.

### Cierre del Sprint 0 (29/10/2026)

- **Finalizadas:** DRA-42 (stack técnico), DRA-43 (repositorio y CI), DRA-45 (red Besu), DRA-46 (IPFS privado) y DRA-47 (inicialización, RF09).
- **Diferida:** DRA-44 (infraestructura en AWS). Se movió al Sprint 1 por decisión: durante la construcción todo corre en local y sin costo, y AWS se usa recién cuando se necesite. Estimación de costos en [docs/arquitectura/estimacion-costos-aws.md](../arquitectura/estimacion-costos-aws.md).

## Épicas

| Épica | Jira |
|---|---|
| E1 Gestión de usuarios, roles y áreas | DRA-5 |
| E2 Registro de solicitudes de documentos | DRA-6 |
| E3 Revisión y autorización de emisión | DRA-7 |
| E4 Verificación pública de autenticidad | DRA-8 |
| E5 Consulta y trazabilidad interna | DRA-9 |
| E6 Notificaciones | DRA-10 |
| E7 Anulación y reemisión | DRA-11 |

## Historias de usuario

| HU | Jira | HU | Jira | HU | Jira |
|---|---|---|---|---|---|
| HU01 | DRA-12 | HU11 | DRA-22 | HU21 | DRA-34 |
| HU02 | DRA-13 | HU12 | DRA-23 | HU22 | DRA-35 |
| HU03 | DRA-14 | HU13 | DRA-27 | HU23 | DRA-36 |
| HU04 | DRA-15 | HU14 | DRA-28 | HU24 | DRA-37 |
| HU05 | DRA-16 | HU15 | DRA-29 | HU25 | DRA-38 |
| HU06 | DRA-17 | HU16 | DRA-24 | HU26 | DRA-39 |
| HU07 | DRA-18 | HU17 | DRA-25 | HU27 | DRA-40 |
| HU08 | DRA-19 | HU18 | DRA-26 | HU28 | DRA-41 |
| HU09 | DRA-20 | HU19 | DRA-32 | HU29 | DRA-30 |
| HU10 | DRA-21 | HU20 | DRA-33 | HU30 | DRA-31 |

## Tareas del Sprint 0

| Jira | Tarea |
|---|---|
| DRA-42 | Definir el stack técnico |
| DRA-43 | Configurar el repositorio, la estructura del proyecto y la integración continua |
| DRA-44 | Provisionar la infraestructura en AWS (diferida: movida al Sprint 1 y luego al Sprint 2; se crea cuando se necesite para la demo, la aceptación y la posprueba) |
| DRA-45 | Desplegar la red Hyperledger Besu (QBFT, 4 validadores) |
| DRA-46 | Desplegar el nodo IPFS privado |
| DRA-47 | Procedimiento de inicialización del sistema (RF09) |

## Convención con GitHub

Usar la clave de Jira en ramas y commits para que queden enlazados (con la app "GitHub for Jira"):

- Rama: `DRA-14-login-por-rol`
- Commit: `DRA-14 Bloqueo de cuenta tras 3 intentos fallidos`
