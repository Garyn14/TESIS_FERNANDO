# Backlog en Jira

**Sitio:** https://dra-satipo.atlassian.net · **Proyecto:** Dra-Web (`SCRUM`) · **Tablero:** SCRUM board

Cargado el 28/10/2026 a partir de [historias_de_usuario.md](historias_de_usuario.md). Cada historia lleva en Jira su descripción, sus criterios de aceptación, la prioridad, los puntos (`Story point estimate`), la épica como padre y las etiquetas `E#` y `HU##`.

## Calendario de sprints (reprogramado)

Las fechas de la Tabla 26 de la tesis ya habían pasado, así que el calendario se reprogramó desde el Sprint 0 activo en Jira, conservando la duración relativa: semanas de 1 sprint y el Sprint 3 de dos semanas.

| Sprint | Fechas | Objetivo | Historias | Puntos |
|---|---|---|---|---|
| 0 | 28/10 – 11/11 | Infraestructura en AWS, red Besu, IPFS privado y entorno de desarrollo | Tareas SCRUM-42 a SCRUM-47 | — |
| 1 | 11/11 – 18/11 | Usuarios, roles, áreas y billetera del director | HU01–HU06 | 24 |
| 2 | 18/11 – 25/11 | Solicitudes individuales y por lista; smart contract | HU07–HU09 | 23 |
| 3 | 25/11 – 09/12 | Revisión y firma con registro en la blockchain | HU10–HU12, HU16–HU18 | 47 |
| 4 | 09/12 – 16/12 | Observar, rechazar, corregir, anular y reemitir | HU13–HU15, HU29–HU30 | 27 |
| 5 | 16/12 – 23/12 | Verificación pública de autenticidad | HU19–HU21 | 16 |
| 6 | 23/12 – 30/12 | Consulta interna, auditoría y notificaciones | HU22–HU28 | 19 |
| | | | **Total** | **156** |

> Pendiente: actualizar la Tabla 26 de la tesis con estas fechas.

## Épicas

| Épica | Jira |
|---|---|
| E1 Gestión de usuarios, roles y áreas | SCRUM-5 |
| E2 Registro de solicitudes de documentos | SCRUM-6 |
| E3 Revisión y autorización de emisión | SCRUM-7 |
| E4 Verificación pública de autenticidad | SCRUM-8 |
| E5 Consulta y trazabilidad interna | SCRUM-9 |
| E6 Notificaciones | SCRUM-10 |
| E7 Anulación y reemisión | SCRUM-11 |

## Historias de usuario

| HU | Jira | HU | Jira | HU | Jira |
|---|---|---|---|---|---|
| HU01 | SCRUM-12 | HU11 | SCRUM-22 | HU21 | SCRUM-34 |
| HU02 | SCRUM-13 | HU12 | SCRUM-23 | HU22 | SCRUM-35 |
| HU03 | SCRUM-14 | HU13 | SCRUM-27 | HU23 | SCRUM-36 |
| HU04 | SCRUM-15 | HU14 | SCRUM-28 | HU24 | SCRUM-37 |
| HU05 | SCRUM-16 | HU15 | SCRUM-29 | HU25 | SCRUM-38 |
| HU06 | SCRUM-17 | HU16 | SCRUM-24 | HU26 | SCRUM-39 |
| HU07 | SCRUM-18 | HU17 | SCRUM-25 | HU27 | SCRUM-40 |
| HU08 | SCRUM-19 | HU18 | SCRUM-26 | HU28 | SCRUM-41 |
| HU09 | SCRUM-20 | HU19 | SCRUM-32 | HU29 | SCRUM-30 |
| HU10 | SCRUM-21 | HU20 | SCRUM-33 | HU30 | SCRUM-31 |

## Tareas del Sprint 0

| Jira | Tarea |
|---|---|
| SCRUM-42 | Definir el stack técnico |
| SCRUM-43 | Configurar el repositorio, la estructura del proyecto y la integración continua |
| SCRUM-44 | Provisionar la infraestructura en AWS |
| SCRUM-45 | Desplegar la red Hyperledger Besu (QBFT, 4 validadores) |
| SCRUM-46 | Desplegar el nodo IPFS privado |
| SCRUM-47 | Procedimiento de inicialización del sistema (RF09) |

## Convención con GitHub

Usar la clave de Jira en ramas y commits para que queden enlazados (con la app "GitHub for Jira"):

- Rama: `SCRUM-14-login-por-rol`
- Commit: `SCRUM-14 Bloqueo de cuenta tras 3 intentos fallidos`
