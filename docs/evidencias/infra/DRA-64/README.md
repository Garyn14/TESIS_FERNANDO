# DRA-64 · QA en AWS: el apagado automático corre con horas de retraso

**Tarea padre:** DRA-44 · **Corrige:** DRA-52 · **Rama:** `DRA-64-apagado-fuera-de-horario` · **Fecha:** 11/11/2026

## El problema

**QA – Apagar** estaba programado a las 00:00 de Lima (`cron: '0 5 * * *'`), pero GitHub lo ejecutó unas 8 horas tarde:

| Fecha | Programado (Lima) | Ejecutado (Lima) |
|---|---|---|
| 09/11/2026 | 00:00 | 08:34 |
| 10/11/2026 | 00:00 | 08:13 |

El 10/11, QA se encendió a las 07:07 y se apagó solo a las 08:13, en pleno uso.

GitHub no garantiza la hora de los flujos programados, y en el minuto 0 los retrasa más.

## Qué se cambió

| Cambio | Archivo |
|---|---|
| El apagado programado pasa a las **00:17 de Lima** (`17 5 * * *`), fuera del minuto 0 | `.github/workflows/qa-apagar.yml` |
| Paso **"Horario del apagado"**, justo después de descargar el código: si el programado llega desde las 06:00 de Lima, no apaga nada y lo deja en el resumen del flujo | `qa-apagar.yml` |
| La regla, en un script que se puede probar con cualquier hora (`HORA_LIMA`) | `plataforma/infra/aws/acciones/horario-de-apagado.sh` |
| 8 comprobaciones nuevas | `acciones/probar-acciones.sh` |
| El horario nuevo en la guía, el guion de QA, el README de la infraestructura, el mensaje de QA – Encender y el `CLAUDE.md` | varios |

**Reglas:**
- El apagado **a mano** (Run workflow) apaga siempre, a cualquier hora.
- El **programado** apaga solo de 00:00 a 05:59 de Lima. Si GitHub lo ejecuta más tarde, el flujo termina en verde sin tocar AWS: ni siquiera configura la cuenta.
- La descarga del código sigue siendo el primer paso (DRA-56).

## Qué se comprueba

`probar-acciones.sh`, en el job "Infraestructura AWS" de la CI:

| Comprobación | Resultado esperado |
|---|---|
| A mano, a las 14:00 | Apaga |
| Programado a las 00, a las 05 | Apaga |
| Programado a las 06, a las 08 (el retraso del 10/11) y a las 23 | No apaga |
| El cron de `qa-apagar.yml` no usa el minuto 0 | ✔ |
| El paso 2 del flujo es "Horario del apagado" y la cuenta solo se configura si corresponde apagar | ✔ |

Además, `shellcheck` sobre los scripts de `acciones/` y `actionlint` sobre los flujos (en la CI).

## Evaluado y descartado por ahora: apagado con EventBridge Scheduler

Un apagado programado desde AWS sería puntual, pero solo **detendría el servidor**. El flujo actual también deja CloudFront apuntando a `servidor-apagado.invalid` (DRA-54), para que el encabezado secreto no viaje a una IP que AWS pueda reasignar. Hacerlo desde AWS exigiría una Lambda con permisos sobre CloudFront y el estado de Terraform. Con el control de horario, el riesgo que motivó el ticket (apagar QA en uso) queda resuelto. El costo de que QA quede encendido una madrugada si GitHub se retrasa es de unos centavos.

## Ajustes encontrados

- Ninguno. Las cantidades de comprobaciones se toman del registro de la CI (ver `docs/arquitectura/integracion-continua.md`).
