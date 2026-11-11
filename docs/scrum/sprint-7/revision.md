# Revisión del Sprint 7

- **Sprint:** 7, del 11/11 al 18/11/2026. El trabajo terminó el 11/11, así que la revisión se puede adelantar.
- **Objetivo (Jira):** ajustar roles y áreas a la organización y agregar la vigencia opcional de los documentos.
- **Resultado:** 5 de 5 historias cerradas, con 16 puntos. El Sprint se cerró el 11/11/2026 **sin la validación del PO**, que queda para el final del proyecto (DRA-48; ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

**Este Sprint está fuera del backlog original de la tesis** (HU01–HU30, cerrado en el Sprint 6). Son propuestas del equipo surgidas al revisar los flujos para la reunión con el negocio ([flujos-del-sistema.md](../../negocio/flujos-del-sistema.md)). Las aprobó el responsable del proyecto el 11/11/2026, sin esperar esa reunión.

Con ellas, la plataforma se adapta a la organización sin depender del equipo de desarrollo:
- los roles se llaman por lo que hacen;
- el Administrador mantiene las áreas y decide qué documentos emite cada una;
- hay un rol de Mesa de Partes limitado a un área;
- un tipo de documento puede tener vigencia, impresa en el PDF y comprobada en el portal.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| Nombres de los roles | DRA-59 | 2 | "Área encargada" pasa a **Emisor de área** y "Consulta interna", a **Mesa de Partes**, en todas las pantallas. Los códigos internos, los permisos y el historial ya guardado no cambian | [DRA-59](../../evidencias/sprint-7/DRA-59/) |
| Tipos de documento por área | DRA-60 | 3 | Pantalla **Áreas y documentos**: el Administrador asigna y quita tipos a cada área, con confirmación e **historial de cambios**. Quitar un tipo solo impide registrar documentos nuevos | [DRA-60](../../evidencias/sprint-7/DRA-60/) |
| Gestionar áreas | DRA-61 | 3 | **Crear, renombrar, deshabilitar y reactivar** áreas. No se deshabilita un área con personas activas, y **no se eliminan** | [DRA-61](../../evidencias/sprint-7/DRA-61/) |
| Mesa de Partes de área | DRA-58 | 3 | Rol nuevo que **busca, consulta y entrega solo los documentos de su área**. Un documento de otra área responde como inexistente | [DRA-58](../../evidencias/sprint-7/DRA-58/) |
| Vigencia de los documentos | DRA-62 | 5 | Vigencia opcional por tipo (de 1 a 120 meses): el PDF imprime **"Válido hasta …"**, el portal informa **"Documento vencido"** y la fecha se contrasta con la del PDF en cada verificación. El contrato no cambia | [DRA-62](../../evidencias/sprint-7/DRA-62/) |

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe las cinco historias y deje su ok en Jira.
- **Validación pendiente de los Sprints 3 a 6 (DRA-48):** los guiones del [Sprint 3](../sprint-3/guion-de-pruebas.md), del [Sprint 4](../sprint-4/guion-de-pruebas.md), del [Sprint 5](../sprint-5/guion-de-pruebas.md) y del [Sprint 6](../sprint-6/guion-de-pruebas.md), que ya usan los nombres de roles nuevos.
- **Evidencia por historia:** [docs/evidencias/sprint-7](../../evidencias/sprint-7/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint7.cjs](../../../plataforma/e2e/sprint7.cjs), con **26 de 26 pasos**.
  - Usa el navegador, PostgreSQL, IPFS y la red Besu reales, con una firma real del Director para la vigencia.
  - Las pruebas de los Sprints 1 a 6 siguen pasando sus 32, 23, 34, 32, 17 y 30 pasos.

## Cómo levantar la demostración

Igual que en el Sprint 6:

```bash
cd plataforma
./e2e/levantar.sh demo
```

También se puede usar **QA** (<https://d1px0ea1324c4y.cloudfront.net>), después de un **QA – Encender**. Antes de la reunión conviene un **QA – Destruir** y un **QA – Encender**, para empezar con la base limpia y las migraciones V24 a V28.

## Decisiones a validar

Las tomé al refinar o al construir cada historia, y el responsable del proyecto las validó antes de construirlas. El sistema ya funciona así. Si el PO pide cambiar alguna, se registra como un ticket nuevo.

| # | Historia | Decisión | Por qué |
|---|---|---|---|
| 1 | DRA-59 | **"Emisor de área"** en vez de "Administrador de área", que se confundía con el rol Administrador | Describe lo que hace: emite los documentos de su área |
| 2 | DRA-59 | Las historias HU01–HU30 y la tesis **conservan los nombres originales**, con una tabla de equivalencias | Son el documento de la tesis; las pantallas usan los nuevos |
| 3 | DRA-59 | **El historial no se reescribe:** los eventos ya guardados conservan el nombre con que se registraron | Es el registro auditable |
| 4 | DRA-60 | **Quitar un tipo solo impide registrar documentos nuevos.** Lo registrado se corrige, se firma y se reemite con su tipo | No deja documentos en trámite sin salida |
| 5 | DRA-60 | El cambio rige **desde la siguiente pantalla** de las personas del área, sin volver a ingresar | Se lee en cada solicitud |
| 6 | DRA-61 | El **código interno** de un área se genera de su nombre y no cambia al renombrarla | Identifica al área en la API y el historial |
| 7 | DRA-61 | **No se deshabilita un área con personas activas**; las cuentas inactivas no lo impiden | Nadie queda activo en un área sin uso |
| 8 | DRA-61 | Una cuenta de un área deshabilitada **no se reactiva** sin moverla antes a otra área | Mismo motivo; se encontró al construir |
| 9 | DRA-61 | Las áreas **no se eliminan**: se deshabilitan y conservan sus tipos | Tienen documentos e historial |
| 10 | DRA-58 | **Mesa de Partes de área entrega** (ve, descarga e imprime), igual que Mesa de Partes | Atiende al ciudadano de su área |
| 11 | DRA-58 | **No recibe avisos** | Es un perfil de consulta |
| 12 | DRA-58 | **Un documento de otra área responde como inexistente** (404) | No revela qué documentos existen en otras áreas |
| 13 | DRA-58 | Qué roles exigen área lo decide **una propiedad del rol** (`limitado_al_area`), no su nombre | Un rol futuro limitado a un área no exige cambiar la lógica |
| 14 | DRA-62 | **Opción A:** la fecha de vencimiento va impresa en el PDF, cuya huella ya está en la blockchain | No cambia el contrato desplegado |
| 15 | DRA-62 | La vigencia se cuenta **desde la fecha de emisión**: el documento es válido **hasta ese día inclusive** | Es la fecha que el ciudadano ve impresa |
| 16 | DRA-62 | Un documento vencido **no se entrega** y el portal **no muestra su PDF**, igual que uno anulado | Ya no está vigente |
| 17 | DRA-62 | La fecha guardada **se contrasta con la del PDF** en cada verificación; si no coincide, sale No válido | Nadie puede alargar la vigencia cambiando la base |

**Preguntas nuevas al PO:**

1. **¿Qué tipos de documento deben vencer, y a los cuántos meses?** Por ejemplo, la Constancia de Productor Activo. Hoy ninguno vence (DRA-62).
2. ¿La vigencia debe contarse **desde la fecha de emisión**, o desde otra fecha, como el fin del periodo del certificado? (DRA-62)
3. **¿Quiénes usarían Mesa de Partes de área?** Por ejemplo, los jefes de área o quien atiende en cada área. ¿Necesitan avisos? (DRA-58)
4. **¿Cuáles son las áreas reales de la agencia** y qué documentos emite cada una? Desde este Sprint, el Administrador las configura sin el equipo de desarrollo (DRA-60, DRA-61). Reemplaza la pregunta del Sprint 1 sobre los nombres de las áreas.
5. ¿Los nombres **"Emisor de área"** y **"Mesa de Partes"** se entienden en la agencia? (DRA-59)
6. Al reorganizar áreas, ¿hace falta **mover en bloque** a las personas de un área a otra? Hoy se hace cuenta por cuenta (DRA-61).

**Preguntas abiertas de Sprints anteriores**, todavía sin respuesta:
- **Sprint 6:**
  - registrar quién busca o consulta;
  - "Imprimir lote";
  - los indicadores de impresiones y duplicados;
  - cuánto tiempo conservar los avisos;
  - los avisos a quien cambia de área;
  - avisar a Mesa de Partes las anulaciones.
- **Sprint 5:** el dominio del portal (va impreso en cada PDF).
- **Sprint 2:**
  - formato del número de expediente;
  - campos y textos de cada documento a solicitud de parte;
  - columnas de la lista real de beneficiarios.
- **Sprint 1:**
  - nombre oficial en pantalla;
  - custodia de la billetera de respaldo (ver también el spike DRA-63).

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| Validación del PO de los Sprints 3 a 7 (DRA-48) | Las 26 historias se cerraron sin las pruebas del PO | Al final del proyecto, en una sola sesión |
| QA con la versión del Sprint 7 | Las migraciones V24 a V28 llegan con el próximo **QA – Encender**; conviene un **QA – Destruir** antes para empezar limpio | Antes de la reunión con el negocio |
| Spike de seguridad de la billetera del Director (DRA-63) | Investigar cómo proteger la clave del Director | Antes de PROD |
| PROD en AWS (DRA-65) | El dominio de la DRA y el alcance | Antes de emitir documentos reales |
| Tabla 26 de la tesis | Actualizar las fechas de los sprints con el calendario de [jira.md](../../requerimientos/jira.md) | Al redactar el informe final |
| Pruebas de punta a punta intermitentes | Dos pasos de la regresión fallaron una vez por tiempo de espera (HU23 del Sprint 6 y HU06 del Sprint 1) y pasaron al repetirlos | Vigilar; si se repiten, ampliar las esperas |

## Calidad del incremento

- **Integración continua:** cada historia se integró a `main` con los **7 jobs** en verde:
  - 42968075589 (DRA-59);
  - 42971967758 (DRA-60);
  - 43039211874 (DRA-61);
  - 43052543667 (DRA-58);
  - 43076723574 (DRA-62).
- **Pruebas automáticas al cierre** (según la CI 43076723574):
  - 272 de backend (eran 240 al empezar el Sprint, según la CI 42448485785);
  - 199 de frontend;
  - 13 del portal;
  - 28 del contrato;
  - en infraestructura: 11 de Terraform, 11 de la cuenta, 4 de CloudFront, 26 de los disparadores y 16 del servidor.
- **Migraciones nuevas:**
  - V24 (nombres de los roles);
  - V25 (configuración de áreas e historial del catálogo);
  - V26 (nombre único de las áreas);
  - V27 (Mesa de Partes de área y `rol.limitado_al_area`);
  - V28 (vigencia).
- **Problemas reales encontrados y corregidos:**
  - corregir o reemitir un documento exigía que su tipo siguiera asignado al área; quitar un tipo los habría bloqueado (DRA-60);
  - una cuenta de un área deshabilitada podía reactivarse (DRA-61);
  - el texto de ayuda del nombre de un área formaba parte del nombre accesible del campo (DRA-61);
  - las áreas que creaban las pruebas seguían activas en la base compartida y rompían otra prueba según el orden; la primera CI de DRA-61 falló por eso (DRA-61);
  - la consulta del rol de la sesión fallaba fuera de una transacción (DRA-58);
  - para probar el vencimiento sin esperar meses se agregó un reloj inyectable en hora de Lima (DRA-62).

## Acta

- **Cierre del Sprint 7:** 11/11/2026, por decisión del equipo, **sin la validación del PO**, igual que en los Sprints 3 a 6.
- **Cómo se cerró:** las 5 historias estaban construidas, integradas a `main` con la CI en verde (7 jobs) y verificadas con la prueba de punta a punta. Pasaron a **Listo** en Jira, con un comentario que deja constancia de que la validación del PO está pendiente.
- **Validación pendiente:** el PO probará los Sprints 3 a 7 **al final del proyecto**, en **DRA-48**, con los guiones de cada Sprint. **Cada observación del PO se registrará como un ticket nuevo**; las historias cerradas no se reabren.
- **Quedan en el backlog:** DRA-48 (validación del PO), DRA-63 (spike de la billetera) y DRA-65 (PROD en AWS).

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| Nombres de los roles | DRA-59 | 2 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 11/11; validación en DRA-48 |
| Tipos de documento por área | DRA-60 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 11/11; validación en DRA-48 |
| Gestionar áreas | DRA-61 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 11/11; validación en DRA-48 |
| Mesa de Partes de área | DRA-58 | 3 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 11/11; validación en DRA-48 |
| Vigencia de los documentos | DRA-62 | 5 | Cerrada sin validación del PO (Listo) | Comentario de cierre del 11/11; validación en DRA-48 |

**Resultado:** 5 de 5 historias cerradas, con 16 puntos. En Jira, el Sprint 7 se cerró el 11/11/2026. La velocidad del Sprint 7 es de 16 puntos. Sumados a los 156 del backlog original, se cerraron **172 puntos**.
