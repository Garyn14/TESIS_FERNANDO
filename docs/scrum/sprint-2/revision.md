# Revisión del Sprint 2

- **Sprint:** 2, del 01/11 al 07/11/2026. El trabajo terminó el 01/11, así que la revisión se puede adelantar.
- **Objetivo (Jira):** registrar solicitudes individuales y por lista, y construir el smart contract.
- **Resultado:** 3 de 3 historias aprobadas, 23 de 23 puntos. El Sprint se cerró el 03/11/2026 (ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

**Sobre el objetivo:** el smart contract ya se construyó en el Sprint 1, con la HU06 (`RegistroDocumentos`, con los roles de administrador y firmante). En este Sprint no hubo trabajo de contrato. Registrar los documentos en él es parte de HU16–HU18, en el Sprint 3, cuando exista la firma. Conviene confirmarlo con el PO y ajustar el objetivo del Sprint 2 en Jira.

## Historias entregadas

| Historia | Jira | Puntos | Qué permite | Evidencia |
|---|---|---|---|---|
| HU07: Seleccionar el tipo de documento | DRA-18 | 2 | El Área encargada elige entre los tipos de su área. Los de oficio abren el registro por lista y los de solicitud de parte, el registro individual | [6 capturas](../../evidencias/sprint-2/HU07/) |
| HU08: Registrar un documento a solicitud de parte | DRA-19 | 8 | Formulario con expediente y validaciones, vista previa con la plantilla, envío con código de verificación, token del QR y HMAC del DNI. Mis documentos y detalle sin edición | [8 capturas](../../evidencias/sprint-2/HU08/) |
| HU09: Registrar una emisión por lista | DRA-20 | 13 | Datos del evento una vez, relación de beneficiarios desde la plantilla Excel o a mano, validada fila por fila, vista previa con resumen y lote con un documento por beneficiario | [11 capturas](../../evidencias/sprint-2/HU09/) |

Con HU08 también se completa la parte pendiente de HU05: "el usuario solo ve los documentos de su área".

## Material de la reunión

- **[Guion de pruebas](guion-de-pruebas.md):** para que el PO pruebe cada historia y deje su ok en Jira.
- **Evidencia por historia:** [docs/evidencias/sprint-2](../../evidencias/sprint-2/).
- **Prueba de punta a punta del Sprint:** [plataforma/e2e/sprint2.cjs](../../../plataforma/e2e/sprint2.cjs), 23 de 23 pasos. La prueba del Sprint 1 sigue pasando sus 32 pasos.

## Cómo levantar la demostración

```bash
cd plataforma
./e2e/levantar.sh demo
```

Es el mismo comando del Sprint 1. Ahora además genera la clave del HMAC del DNI. La base empieza vacía, así que primero se crean las cuentas (paso 0 del guion). El Excel de prueba está en `plataforma/e2e/datos/beneficiarios-prototipo.xlsx`.

## Decisiones a validar

Las tomé al refinar cada historia. El sistema ya funciona así; si el PO pide cambiar alguna, se corrige en el Sprint 3.

| # | Historia | Decisión o pregunta | Por qué |
|---|---|---|---|
| 1 | HU08 | **¿Cuál es el formato del número de expediente de Mesa de Partes?** Hoy es provisional: `EXP-AAAA-NNNNNN` | Es el del prototipo; cambiarlo es una sola validación |
| 2 | HU08 | **¿Qué campos y qué texto lleva cada documento a solicitud de parte?** Hoy son los del prototipo | Se pidieron ejemplos reales de cada documento en la revisión del Sprint 1 |
| 3 | HU09 | **¿Qué columnas tiene la lista de beneficiarios que arma hoy el área?** Hoy: Nombres, Apellidos, DNI | Se pidió una lista real en la revisión del Sprint 1 |
| 4 | HU09 | Campos y texto del Certificado de Reconocimiento (motivo, evento, fecha, lugar, área organizadora) | El prototipo solo tenía un ejemplo individual; es una propuesta propia |
| 5 | HU07 | Descripciones de cada tipo en la pantalla "Nuevo documento" | El prototipo solo tenía dos |
| 6 | HU07 | Ningún tipo del área aparece como "Disponible próximamente" | Con HU08 y HU09, todos los tipos se pueden emitir |
| 7 | HU07, HU08 | Un tipo o documento de otra área, inexistente o inactivo, da el mismo mensaje | No revela qué existe |
| 8 | HU08 | El número de expediente no se repite entre documentos | Evita registrar dos veces la misma solicitud |
| 9 | HU08, HU09 | La fecha de fin no puede ser anterior a la de inicio ni posterior a hoy | No se certifica un periodo que no terminó |
| 10 | HU08 | El DNI se guarda también en claro en la base; a la blockchain solo irá el HMAC | Se imprime en el documento y lo ve el Director (RNF03) |
| 11 | HU08 | La firma de la vista previa lleva el nombre de la cuenta activa con rol Director | Como en el prototipo |
| 12 | HU09 | Un lote tiene de 1 a 300 beneficiarios | Cubre un taller grande y mantiene la vista previa manejable |
| 13 | HU09 | El número de lote es correlativo por año: Lote 2026-001 | Formato del prototipo |
| 14 | HU09 | El área organizadora se completa con la de la persona, pero se puede cambiar | Un evento puede organizarlo otra área |
| 15 | HU09 | Importar agrega las filas del Excel a las ya escritas | Permite combinar Excel y carga manual |

## Pendientes y riesgos

| Tema | Qué falta | Cuándo |
|---|---|---|
| Insumos del PO | Ejemplos reales de los 5 documentos, lista real de beneficiarios y formato del expediente. Sin ellos, los textos y campos siguen siendo los del prototipo | Antes del Sprint 3, para no rehacer las plantillas del PDF (HU16) |
| Preguntas abiertas del Sprint 1 | Nombres de las áreas, nombre oficial en pantalla y custodia de la billetera de respaldo | Siguen sin respuesta |
| Infraestructura en AWS (DRA-44) | Sigue diferida, para no gastar crédito | Antes de la demostración pública y la posprueba |
| Sprint 3 | Es el más grande (47 puntos): firma, PDF con hash, IPFS y registro en la blockchain | Del 08/11 al 21/11 |

## Calidad del incremento

- Cada historia se integró a `main` con la CI en verde en sus 5 jobs (ejecuciones 41333365036, 41335816519 y 41347416010).
- Pruebas automáticas al cierre: 123 de backend y 85 de frontend.
- La regresión del Sprint 1 encontró un problema real con HU08. Al restablecerse la contraseña de una persona con la sesión abierta, se mostraba un aviso genérico en vez del motivo. Se corrigió y quedó cubierto con una prueba.

## Acta

- **Fecha de la validación:** 03/11/2026, en el entorno local levantado con `./e2e/levantar.sh demo`.
- **Cómo se validó:** con el [guion de pruebas](guion-de-pruebas.md). La aprobación de cada historia quedó registrada en su ticket de Jira, que pasó a **Finalizada**.
- **Cierre del Sprint 2:** 03/11/2026, antes de la fecha prevista (07/11).

### Decisión sobre cada historia

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| HU07: Seleccionar el tipo de documento | DRA-18 | 2 | Aprobada | Comentario "Se da el OK al ticket", con captura |
| HU08: Registrar un documento a solicitud de parte | DRA-19 | 8 | Aprobada con observaciones | Comentario "OK con las siguientes observaciones": 1) fechas en día/mes/año; 2) espacio en blanco en la firma de la vista previa. Con capturas |
| HU09: Registrar una emisión por lista | DRA-20 | 13 | Aprobada con una observación | Comentario: OK, con la salvedad de que la fecha se registraba en mes/día/año |

**Resultado:** 3 de 3 historias aprobadas, con 23 de 23 puntos. La velocidad del Sprint 2 es de 23 puntos; en los Sprints 1 y 2 se completaron 47 de 156 puntos (30 %).

### Observaciones y cómo se resolvieron

| Observación | Historia | Resolución |
|---|---|---|
| Las fechas se muestran en mes/día/año y deben ser día/mes/año | HU08, HU09 | **Corregida el 03/11/2026.** El selector del navegador tomaba el formato del idioma del sistema. Se reemplazó por un campo propio `dd/mm/aaaa`, que no depende del navegador y conserva el botón del calendario. Commit `aa6e3f2`, CI [41677224185](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/41677224185). Evidencia en [observacion-fechas](../../evidencias/sprint-2/observacion-fechas/) |
| En la vista previa, la firma del Director aparece en blanco | HU08 | **Explicada, sin cambio.** Eran dos cosas:<ul><li>Bajo la línea salía "cmendoza" porque la cuenta se creó con ese nombre completo. El guion no indicaba qué nombre poner; ya lo indica.</li><li>El espacio sobre la línea está en blanco a propósito: no va una firma manuscrita, sino la firma digital con la billetera, que llega en el Sprint 3 (HU11, HU17).</li></ul>El PO acordó dejarlo así |

### Decisiones a validar

Ninguna de las 15 decisiones de este documento recibió una respuesta explícita.

- **Preguntas abiertas.** Necesitan un dato del PO y pasan al Sprint 3:
  1. el formato del número de expediente;
  2. los campos y textos de cada documento a solicitud de parte;
  3. las columnas de la lista real de beneficiarios.

  Mientras tanto, se mantienen los del prototipo. Conviene tenerlos antes de la HU16, que arma el PDF definitivo con esas plantillas.
- **Decisiones de diseño (4 a 15).** Al aprobar no se pidió cambiarlas, así que se mantienen como están construidas.

### Cambios pedidos

Solo el formato de las fechas, que ya está corregido e integrado. No quedan cambios pendientes para el Sprint 3.

### Pendientes que pasan al Sprint 3

| Pendiente | Ticket o fuente |
|---|---|
| Infraestructura en AWS: sigue diferida, para no gastar crédito | DRA-44 |
| Las 3 preguntas abiertas de este Sprint y las 3 del Sprint 1 (áreas, nombre oficial, custodia del respaldo) | Documentos de la revisión |
| Insumos del PO: ejemplos reales de los documentos y la lista real de beneficiarios | Revisión del Sprint 1 |
| Ajustar el objetivo del Sprint 2 en Jira: el smart contract ya se construyó en el Sprint 1 | Este documento, sección inicial |
