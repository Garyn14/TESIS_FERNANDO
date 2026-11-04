# Revisión del Sprint 3

- **Sprint:** 3, del 03/11 al 16/11/2026. El trabajo terminó el 04/11, así que la revisión se puede adelantar.
- **Objetivo (Jira):** revisión y firma con registro en la blockchain.
- **Resultado:** 6 de 6 historias construidas e integradas, con 47 puntos, todas **En revisión**. Falta la aprobación del PO (ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

Con este Sprint, la plataforma ya emite documentos de punta a punta. El Área encargada registra, el Director revisa y firma con su billetera, el PDF definitivo queda en el IPFS privado y su hash, en la blockchain.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| HU10: Ver los documentos por revisar | DRA-21 | 3 | Bandeja del Director con los pendientes de todas las áreas, del más antiguo al más reciente, con cada lote en una fila. Abrir un documento o un lote queda registrado como revisión | [HU10](../../evidencias/sprint-3/HU10/) |
| HU16: Generar el PDF final y su hash | DRA-24 | 5 | PDF definitivo con fecha de emisión, QR, código de verificación y leyenda del portal, y su SHA-256. El Director ve una muestra antes de firmar | [HU16](../../evidencias/sprint-3/HU16/) |
| HU17: Almacenar el PDF en IPFS | DRA-25 | 5 | Al firmar, cada PDF final se guarda en el IPFS privado, fijado y con su CID. Si falla, el documento vuelve a Pendiente | [HU17](../../evidencias/sprint-3/HU17/) |
| HU11: Firmar uno o varios documentos | DRA-22 | 13 | Firma con MetaMask desde la revisión o desde la bandeja (selección múltiple), en transacciones de hasta 50. Lo firmado queda en el contrato con su hash, y cada falla devuelve su documento a Pendiente | [HU11](../../evidencias/sprint-3/HU11/) |
| HU12: Revisar y firmar un lote | DRA-23 | 8 | Observar o rechazar beneficiarios (o el lote completo) con un motivo, y firmar el resto como unidad | [HU12](../../evidencias/sprint-3/HU12/) |
| HU18: Sincronizar los estados con la blockchain | DRA-26 | 13 | Una tarea del servidor lee los eventos del contrato. Confirma las firmas que el navegador no alcanzó a confirmar y devuelve a Pendiente lo detenido | [HU18](../../evidencias/sprint-3/HU18/) |

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe cada historia, con MetaMask real, y deje su ok en Jira.
- **Evidencia por historia:** [docs/evidencias/sprint-3](../../evidencias/sprint-3/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint3.cjs](../../../plataforma/e2e/sprint3.cjs), 34 de 34 pasos, con Besu, IPFS y PostgreSQL reales. Las pruebas de los Sprints 1 y 2 siguen pasando sus 32 y 23 pasos.

## Cómo levantar la demostración

```bash
cd plataforma
./e2e/levantar.sh demo
```

Es el mismo comando de los Sprints 1 y 2. Además de la base vacía, levanta:

- la red Besu, si no está corriendo, con un contrato recién desplegado;
- un IPFS privado vacío.

Al terminar muestra las dos claves de prueba (Administrador del contrato y Director) para importarlas en MetaMask.

Para ver lo que la pantalla todavía no muestra (CID, transacción, bloque e historial; la auditoría es HU24): `./e2e/ver-registro.sh` y `./e2e/ver-registro.sh <código>`.

## Decisiones a validar

Las tomé al refinar cada historia. El sistema ya funciona así; si el PO pide cambiar alguna, se corrige en el Sprint 4.

| # | Historia | Decisión | Por qué |
|---|---|---|---|
| 1 | HU10 | Abrir un lote cuenta como revisión de todos sus certificados | Criterio de HU12. El certificado de ejemplo y la relación son lo que se revisa |
| 2 | HU16 | **La fecha impresa es la del día de la firma**. La fecha oficial es la del bloque (RF32) | RF30 pide el PDF y su hash antes de registrar. Las dos coinciden en el día |
| 3 | HU16 | El certificado no imprime el DNI | Como el prototipo. El DNI queda en la base y, en la blockchain, solo como HMAC (RF17) |
| 4 | HU16 | En vez de una firma manuscrita: "Firmado digitalmente mediante blockchain" | La firma es la de la billetera del Director |
| 5 | HU16 | Muestra del PDF con la marca "MUESTRA – SIN VALOR", que no se guarda | Para revisar cómo se imprimirá |
| 6 | HU17 | "Procesando firma" es un estado que se guarda, y el área lo ve en azul | Lo necesita HU18 para corregir lo detenido |
| 7 | HU17 | Si IPFS falla, el documento vuelve a Pendiente, todavía revisado, y se puede reintentar | Criterio de la tesis |
| 8 | HU11 | En la bandeja, un lote se selecciona entero | Para firmar un evento en una sola operación |
| 9 | HU11 | Hasta 50 documentos por transacción; una selección mayor se divide | Criterio de la tesis. En Besu, 50 usan unos 3,7 millones de gas, sin costo |
| 10 | HU11 | No se muestra "Mesa de Partes fue notificada" | Los avisos llegan en el Sprint 6 |
| 11 | HU12 | Además de los botones del prototipo, **"Rechazar seleccionados"** | El criterio dice "observar o rechazar beneficiarios individuales o el lote completo" |
| 12 | HU12 | Motivo obligatorio, de hasta 500 caracteres | RF24–RF26 |
| 13 | HU12 | En Mis documentos, un lote con certificados en varios estados muestra cada uno ("Observado 1 · Firmado 6 · Rechazado 1") | Antes mostraba solo el del primer certificado |
| 14 | HU18 | **Sincronización cada 30 segundos** | Una firma no confirmada se refleja en menos de un minuto |
| 15 | HU18 | **Plazo de 15 minutos en Procesando firma** antes de volver a Pendiente | Da tiempo de sobra para confirmar en MetaMask |

**Preguntas abiertas de Sprints anteriores**, todavía sin respuesta:

- **Sprint 2:**
  - formato del número de expediente;
  - campos y textos de cada documento a solicitud de parte;
  - columnas de la lista real de beneficiarios.
- **Sprint 1:**
  - nombres de las áreas;
  - nombre oficial en pantalla;
  - custodia de la billetera de respaldo.

Los textos son los que ya van en el PDF final y en la blockchain. Conviene cerrarlos antes de la demostración pública del Sprint 5.

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| Infraestructura en AWS (DRA-44) | Sigue diferida para no gastar crédito. Con varias instancias del backend, la sincronización (HU18) debe correr en una sola | Antes del portal público (Sprint 5) |
| Prueba con MetaMask real | La prueba automática usa una billetera de prueba que firma transacciones reales. MetaMask real se prueba en esta revisión | En la revisión |
| Archivos huérfanos en IPFS | Si una firma no se completa, su PDF queda fijado en IPFS sin uso. No afecta la verificación | Limpieza en un Sprint posterior |
| Sprint 4 | Observar, rechazar y corregir documentos a solicitud de parte (HU13–HU15), y anular y reemitir (HU29–HU30). La anulación agrega su evento al contrato y a la sincronización | Del 17/11 al 23/11 (se puede adelantar) |

## Calidad del incremento

- **Integración continua:** cada historia se integró a `main` con los 5 jobs en verde (ejecuciones 41743421533, 41745602040, 41749276488, 41753614314, 41758193909 y 41779637849). La CI también registra 50 documentos en una transacción en la red Besu real.
- **Pruebas automáticas al cierre:**
  - 164 de backend (las de IPFS, contra un nodo Kubo real);
  - 113 de frontend;
  - 22 del contrato.
- **Problemas reales encontrados en la verificación y corregidos:**
  - el PDF se desbordaba a una segunda hoja (HU16);
  - la barra de selección se metía bajo el menú (HU11);
  - la confirmación del navegador y la sincronización podían aplicar la misma firma a la vez (HU18).

## Acta

*Se completa en la reunión de revisión.*

- **Fecha de la validación:**
- **Cómo se validó:** con el [guion de pruebas](guion-de-pruebas.md). La decisión sobre cada historia queda en su ticket de Jira.

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| HU10: Ver los documentos por revisar | DRA-21 | 3 | | |
| HU16: Generar el PDF final y su hash | DRA-24 | 5 | | |
| HU11: Firmar uno o varios documentos | DRA-22 | 13 | | |
| HU12: Revisar y firmar un lote | DRA-23 | 8 | | |
| HU17: Almacenar el PDF en IPFS | DRA-25 | 5 | | |
| HU18: Sincronizar los estados con la blockchain | DRA-26 | 13 | | |
