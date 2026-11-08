# Backlog en Jira

**Sitio:** https://dra-satipo.atlassian.net · **Proyecto:** Dra-Web (`DRA`) · **Tablero:** SCRUM board

Cargado el 28/10/2026 a partir de [historias_de_usuario.md](historias_de_usuario.md). Cada historia lleva en Jira su descripción, sus criterios de aceptación, la prioridad, los puntos (`Story point estimate`), la épica como padre y las etiquetas `E#` y `HU##`.

## Calendario de sprints (reprogramado)

Las fechas de la Tabla 26 de la tesis ya habían pasado, así que el calendario se reprogramó conservando la duración relativa: sprints de 1 semana y el Sprint 3 de dos semanas. El 29/10/2026, al cerrar el Sprint 0 antes de lo previsto, se **adelantó todo el calendario** y el Sprint 1 se inició ese mismo día. El 01/11/2026, tras cerrar el Sprint 1 el 31/10 (4 días antes de lo previsto), se **volvió a adelantar el calendario**: el Sprint 2 empieza el 01/11 y los siguientes se corren 4 días, con la misma duración. El 03/11/2026, al cerrar el Sprint 2 cuatro días antes, se **adelantó una vez más**: el Sprint 3 empieza el 03/11 y el Sprint 6 termina el 07/12. El 05/11/2026 se cerraron los Sprints 3 y 4 y se **adelantó otra vez**: el Sprint 5 va del 05/11 al 12/11 y el Sprint 6, del 12/11 al 19/11. El 08/11/2026, tras cerrar el Sprint 5 el 07/11, el **Sprint 6 se inició ese día**: va del 08/11 al 15/11.

| Sprint | Fechas | Estado | Objetivo | Historias | Puntos |
|---|---|---|---|---|---|
| 0 | 28/10 – 29/10 | Cerrado | Infraestructura: red Besu, IPFS privado y entorno de desarrollo | Tareas DRA-42, DRA-43, DRA-45, DRA-46, DRA-47 | — |
| 1 | 29/10 – 31/10 | Cerrado (24 de 24 puntos) | Usuarios, roles, áreas y billetera del director | HU01–HU06 | 24 |
| 2 | 01/11 – 03/11 | Cerrado (23 de 23 puntos) | Solicitudes individuales y por lista | HU07–HU09 | 23 |
| 3 | 03/11 – 05/11 | Cerrado (47 de 47 puntos; validación del PO en el Sprint 5) | Revisión y firma con registro en la blockchain | HU10–HU12, HU16–HU18 | 47 |
| 4 | 04/11 – 05/11 | Cerrado (27 de 27 puntos; validación del PO en el Sprint 5) | Observar, rechazar, corregir, anular y reemitir | HU13–HU15, HU29–HU30 | 27 |
| 5 | 05/11 – 07/11 | Cerrado (16 de 16 puntos; validación del PO al final, en DRA-48) | Verificación pública de autenticidad | HU19–HU21 | 16 |
| 6 | 08/11 – 15/11 | En curso | Consulta interna, auditoría y notificaciones | HU22–HU28 | 19 |
| | | | | **Total** | **156** |

**Avance:** 137 de 156 puntos cerrados (88 %). De ellos, 47 (Sprints 1 y 2) están aprobados por el PO; los 90 de los Sprints 3, 4 y 5 esperan la validación final del PO (DRA-48). Velocidad: 24 puntos en el Sprint 1, 23 en el Sprint 2, 47 en el Sprint 3, 27 en el Sprint 4 y 16 en el Sprint 5.

> Pendiente: actualizar la Tabla 26 de la tesis con estas fechas.

### Avance del Sprint 6 (08/11/2026)

- **Iniciado en Jira** el 08/11, con fin el 15/11 y el objetivo "Implementar la consulta interna, la auditoría y las notificaciones".
- **En revisión:** HU22 (DRA-35), Buscar documentos, 3 puntos; HU23 (DRA-36), Ver el estado de un documento, 2 puntos; HU24 (DRA-37), Consultar el historial y la auditoría, 5 puntos; HU25 (DRA-38), Descargar o imprimir un documento, 3 puntos; HU26 (DRA-39), Aviso de documento pendiente al director, 2 puntos; y HU27 (DRA-40), Avisos de resultado al Área encargada, 2 puntos (17 en total). Cada una está integrada a `main`, con la CI en verde (6 jobs) y un comentario de cierre en su ticket. Evidencia en [HU22](../evidencias/sprint-6/HU22/README.md), [HU23](../evidencias/sprint-6/HU23/README.md), [HU24](../evidencias/sprint-6/HU24/README.md), [HU25](../evidencias/sprint-6/HU25/README.md), [HU26](../evidencias/sprint-6/HU26/README.md) y [HU27](../evidencias/sprint-6/HU27/README.md).

### Cierre del Sprint 5 (07/11/2026)

- **Finalizadas sin la validación del PO**, por decisión del equipo: HU21, HU19 y HU20 (DRA-34, DRA-32 y DRA-33), 16 puntos. Cada ticket tiene un comentario de cierre.
- **Validación del PO al final del proyecto:** DRA-48 se amplió a los Sprints 3, 4 y 5 y pasó al Sprint 6. Cada observación del PO será un ticket nuevo.
- **Movida al Sprint 6:** DRA-44 (infraestructura en AWS), que sigue diferida.
- **En Jira,** el Sprint 5 se cerró el 07/11, con su fecha de fin planificada (12/11) sin cambios.

### Avance del Sprint 5 (05/11/2026)

- **En revisión:** HU21, HU19 y HU20 (DRA-34, DRA-32 y DRA-33), 16 puntos. Se hizo HU21 primero porque el portal muestra su resultado. Cada una está integrada a `main`, con la CI en verde (6 jobs) y un comentario de cierre en su ticket.
- **Revisión:** material en el [guion de pruebas](../scrum/sprint-5/guion-de-pruebas.md) y en [revision.md](../scrum/sprint-5/revision.md). El PO prueba el portal con su celular. En la misma sesión se puede hacer la validación pendiente de los Sprints 3 y 4 (DRA-48).
- **Sigue diferida:** DRA-44 (infraestructura en AWS). La necesita el portal para publicarse en internet.

### Cierre de los Sprints 3 y 4 (05/11/2026)

- **Finalizadas sin la validación del PO**, por decisión del equipo:
  - Sprint 3: HU10, HU16, HU17, HU11, HU12 y HU18 (DRA-21 a DRA-26), 47 puntos;
  - Sprint 4: HU13, HU14, HU15, HU29 y HU30 (DRA-27 a DRA-31), 27 puntos.
- **Cómo se cerraron:** cada historia estaba integrada a `main`, con la CI en verde y verificada con su prueba de punta a punta. Cada ticket tiene un comentario que deja constancia de que la validación del PO está pendiente.
- **Validación del PO:** queda para el Sprint 5, en la tarea **DRA-48**, con los guiones de pruebas del [Sprint 3](../scrum/sprint-3/guion-de-pruebas.md) y del [Sprint 4](../scrum/sprint-4/guion-de-pruebas.md). Actas en la [revisión del Sprint 3](../scrum/sprint-3/revision.md#acta) y la [del Sprint 4](../scrum/sprint-4/revision.md#acta).
- **En Jira,** el Sprint 4 se inició y se cerró el mismo día, con las fechas reales del trabajo (04/11 al 05/11). El Sprint 5 empezó el 05/11.
- **Movida al Sprint 5:** DRA-44 (infraestructura en AWS), que sigue diferida.

### Cierre del Sprint 2 (03/11/2026)

- **Finalizadas:** HU07, HU08 y HU09 (DRA-18 a DRA-20). Son 23 de 23 puntos, aprobadas con el [guion de pruebas](../scrum/sprint-2/guion-de-pruebas.md). Acta en [revision.md](../scrum/sprint-2/revision.md#acta).
- **Observación atendida:** las fechas se muestran ahora en día/mes/año (DRA-19 y DRA-20).
- **Movida al Sprint 3:** DRA-44 (infraestructura en AWS), que sigue diferida.

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
| DRA-44 | Provisionar la infraestructura en AWS (diferida: movida a los Sprints 1, 2 y 3; se crea cuando se necesite para la demo, la aceptación y la posprueba) |
| DRA-45 | Desplegar la red Hyperledger Besu (QBFT, 4 validadores) |
| DRA-46 | Desplegar el nodo IPFS privado |
| DRA-47 | Procedimiento de inicialización del sistema (RF09) |

## Convención con GitHub

Usar la clave de Jira en ramas y commits para que queden enlazados (con la app "GitHub for Jira"):

- Rama: `DRA-14-login-por-rol`
- Commit: `DRA-14 Bloqueo de cuenta tras 3 intentos fallidos`
