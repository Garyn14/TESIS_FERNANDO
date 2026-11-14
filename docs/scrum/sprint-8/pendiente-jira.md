# Pendiente en Jira del Sprint 8

El conector de Jira se desconectó a mitad del Sprint 8, el 13/11/2026. Este archivo guarda lo que falta registrar, para hacerlo en cuanto vuelva. Al terminar, se borra o se marca como registrado.

## Qué falta

| # | Acción | Ticket |
|---|---|---|
| 1 | Copiar la descripción refinada (sección 1 de este archivo) y pasar a **En curso** (21) | DRA-68 |
| 2 | Copiar la descripción refinada desde [E8_ayuda_documentacion.md](../../requerimientos/historias/E8_ayuda_documentacion.md) | DRA-70, DRA-71, DRA-75, DRA-74 |
| 3 | Agregar el comentario de cierre de cada historia (sección 2) | DRA-68, DRA-70, DRA-71, DRA-75, DRA-74 |
| 4 | Pasar a **En revisión** (31) y, con el cierre del Sprint, a **Listo** (41), con un comentario que deje constancia de que la validación del PO queda en DRA-48 | Las 6 del Sprint 8, también DRA-66 |
| 5 | Cerrar el Sprint 8 (id 37) | — |

## 1. Descripción refinada de DRA-68

**Sprint 8 · refinada el 13/11/2026.** Alcance: **solo PROD (DRA-65)**. Se construye en la plantilla de infraestructura detrás de un interruptor, se prueba en QA y luego se desactiva en QA, igual que DRA-66.

**Como** responsable de sistemas de la agencia, **quiero** recibir un correo cuando el servidor de PROD, la blockchain, el IPFS o la base de datos dejen de funcionar, **para** enterarme antes que los ciudadanos que intentan verificar un documento.

### Qué se vigila

| Qué | Cómo | Alerta si |
|---|---|---|
| El servidor | Comprobaciones de estado de EC2 (AWS) | Falla la máquina o su sistema |
| La plataforma (backend y base de datos) | Un vigilante en el servidor consulta la salud del backend cada minuto | Falla durante dos ventanas seguidas de 5 minutos, **o el vigilante deja de reportar** (servidor caído) |
| La blockchain | El vigilante comprueba que se sigan produciendo bloques | La red deja de producir bloques (faltan validadores) |
| El IPFS | Estado del contenedor del IPFS | El IPFS no responde |
| El disco | Porcentaje usado | Supera el 85 % |
| Las copias de DRA-66 | Eventos de Data Lifecycle Manager | Una copia diaria falla |

Cada alerta llega por **correo**, y otro correo avisa cuando el problema se resuelve.

### Cómo se hará

- **Vigilante en el servidor** (`vigilar.sh`, temporizador de systemd cada minuto; ajustado en la prueba en QA, ver el comentario). Publica en CloudWatch una métrica por parte (1 = bien, 0 = mal) y el disco usado.
- **Alarmas de CloudWatch** sobre esas métricas y sobre el estado del EC2, y una **regla de EventBridge** para las copias fallidas.
- **Un tema de SNS** con la suscripción por correo. Se crea en la pila de la cuenta (`cuenta.yml`), con el mismo correo de las alertas del presupuesto, para que **el correo no esté en el repositorio**.

### Criterios de aceptación

**Interruptor**
- [ ] Variable `monitoreo_activo` del módulo, **apagada por defecto**: apagada, no crea nada ni cuesta nada y el vigilante no corre.
- [ ] Opción "monitoreo" en "QA – Encender", como la de los respaldos.

**Alertas**
- [ ] Una alarma por cada fila de la tabla, con un nombre claro en español (por ejemplo, "dra-satipo-prod · La blockchain no produce bloques").
- [ ] Correo al entrar en alarma y al volver a la normalidad.
- [ ] Si el servidor se cae por completo, igual llega la alerta: el vigilante deja de reportar.

**Pruebas**
- [ ] `terraform test`: sin el interruptor no se crea nada; con él, las alarmas y la regla.
- [ ] El vigilante se prueba en el servidor en Docker (`probar-servidor.sh`) con un `aws` simulado: reporta 1 con todo bien, y 0 en la blockchain al detener los validadores.
- [ ] **Prueba en QA:** encender el monitoreo, confirmar la suscripción del correo, detener los validadores de Besu y el backend, comprobar que llegan las alertas y que llega el aviso de recuperación al levantarlos. Después, apagar el monitoreo.
- [ ] Guía en `docs/arquitectura/monitoreo.md`: qué significa cada alerta y qué hacer.

### Fuera del alcance

| Tema | Por qué |
|---|---|
| Comprobación desde fuera de AWS (CloudFront, el portal en S3) | Requiere un servicio de pago aparte (Route 53 o Synthetics). CloudFront y S3 los opera AWS |
| Registros centralizados (CloudWatch Logs) | Cuesta por GB; los registros siguen en el servidor (`docker logs`) |
| Avisos por SMS o WhatsApp | Se agrega otra suscripción al mismo tema si el negocio lo pide |
| Monitoreo de QA | QA se apaga cada noche: avisaría todos los días |

### Decisiones a validar

1. **Herramientas de AWS** (CloudWatch, SNS y EventBridge) y no un servidor de monitoreo propio (Grafana, Uptime Kuma): no hay nada más que mantener. **Costo: $0** dentro de la capa gratuita permanente (10 métricas y 10 alarmas).
2. **Un vigilante en el servidor que reporta cada minuto**: se avisa cuando la falla dura dos ventanas seguidas de 5 minutos (unos 10 minutos), para no alertar por una falla de segundos.
3. **El correo es el de las alertas del presupuesto**, guardado en la pila de la cuenta. Hay que actualizar la pila otra vez y confirmar la suscripción con el enlace que envía AWS.
4. **Se vigila desde dentro del servidor**, no desde internet.

| Prioridad | Puntos | Sprint |
|---|---|---|
| Alta | 5 | 8 |

## 2. Comentarios de cierre

### DRA-68

**Qué construí** (apagado por defecto, solo para PROD):
- **Vigilante en el servidor**, cada minuto: publica en CloudWatch si funcionan la plataforma (backend y base de datos), la blockchain (sigue produciendo bloques) y el IPFS, y el disco usado.
- **5 alarmas** con nombres en español ("La plataforma no responde", "La blockchain no produce bloques", "El IPFS no responde", "El disco supera el 85 por ciento", "El servidor falla") y una **regla** que avisa si falla una copia de DRA-66. Están detrás del interruptor `monitoreo_activo`.
- **Tema de correo** `dra-satipo-alertas` en la pila de la cuenta, con el mismo correo del presupuesto: el correo no está en el repositorio. Actualicé la pila; solo agregó el tema y su política.
- Opción "monitoreo" en "QA – Encender".
- Guía `docs/arquitectura/monitoreo.md`: qué significa cada alerta y qué hacer.

**Cómo lo probé en QA:**
1. Encendí el monitoreo. El vigilante publicó con los permisos reales y las 5 alarmas pasaron a OK.
2. Detuve 2 de los 4 validadores de Besu y el backend. "La plataforma no responde" llegó a los 6 minutos y "La blockchain no produce bloques" a los 7. Las demás siguieron en OK.
3. Los volví a levantar. La plataforma volvió a OK a los 6 minutos. La blockchain volvió a los 23, porque la red misma tardó 17 minutos en reanudarse (hallazgo 2).
4. Cada cambio de estado se publicó en el tema: 10 avisos. **No llegaron al correo** porque la suscripción sigue pendiente de confirmar.
5. Apagué el monitoreo en QA: no quedan alarmas, regla ni temporizador.

**CI:** siete jobs en verde ([43441320683](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43441320683)).

| Prueba | Antes | Ahora |
|---|---|---|
| Terraform | 14 | 18 |
| Cuenta | 12 | 14 |
| Servidor | 19 | 27 |

Evidencia en `docs/evidencias/sprint-8/DRA-68/`.

**Ajustes y hallazgos:**
1. **Falsa alarma por falta de datos:** con un reporte cada 5 minutos, una ventana podía quedar vacía. Ahora el vigilante corre cada minuto, también gratis.
2. **La red Besu tarda en reanudarse tras una parada larga** (17 minutos en la prueba): se reanuda sola y no pierde nada. Quedó documentado.

**Pendiente:** confirmar la suscripción del correo y comprobar que llega un aviso de prueba.

**Queda fuera:** la comprobación desde internet (CloudFront y el portal), los registros centralizados y los avisos por SMS. Activarlo en PROD es parte de DRA-65.

### DRA-70

**Qué construí:** la página `/como-verificar` del portal, con:
- la verificación con el QR y con el código;
- un dibujo de dónde están en el documento;
- qué significa cada uno de los 6 resultados, con los mismos colores e íconos que en pantalla;
- qué hacer si algo no cuadra.

Se llega desde la portada, desde el pie y desde "Documento no válido". La descripción refinada está en `docs/requerimientos/historias/E8_ayuda_documentacion.md`.

**Cómo lo probé:** con la prueba de punta a punta del Sprint 8 (`e2e/sprint8.cjs`) en un entorno limpio, que dio 5 pasos correctos en computadora y celular. La regresión del Sprint 5 dio 17 pasos y la del Sprint 7, 26. La CI pasó con siete jobs en verde ([43619753637](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43619753637)); el portal pasó de 13 a 20 pruebas. La evidencia está en `docs/evidencias/sprint-8/DRA-70/`.

**Ajustes:**
- en el dibujo, una señal tapaba el código;
- la prueba confundía dos enlaces de nombre parecido;
- un archivo no tenía el formato de Prettier.

**Para validar con el PO:** el teléfono, el correo o la dirección de atención de la agencia. Por ahora la guía dice "comuníquese con la Agencia Agraria Satipo".

### DRA-71

**Qué construí:** la página `/preguntas-frecuentes`, con 15 preguntas en tres grupos:
- sobre la verificación;
- si usted es el titular;
- si usted recibe un documento.

Las preguntas se abren con un clic o con el teclado, y cada una tiene su propio enlace (por ejemplo `#perdi-mi-documento`). Se llega desde la portada, desde el pie y desde la guía de DRA-70. La descripción refinada está en `docs/requerimientos/historias/E8_ayuda_documentacion.md`.

**Cómo lo probé:**
- Prueba de punta a punta del Sprint 8 en un entorno limpio: 9 pasos correctos (4 de esta historia), con clic real, teclado y enlace directo en el celular.
- Regresión del Sprint 5: 17 pasos.
- CI con siete jobs en verde ([43621453585](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43621453585)); el portal pasó de 20 a 28 pruebas.

La evidencia está en `docs/evidencias/sprint-8/DRA-71/`.

**Para validar con el PO:**
- cómo se pide una copia nueva, cuánto cuesta y en qué plazo;
- los datos de atención de la agencia.

### DRA-75

**Qué construí:** el manual de usuario de la plataforma, el mismo para los 5 roles.
- Está en Markdown en el repositorio (`plataforma/frontend/src/ayuda/manual.md`) y la plataforma lo muestra con su diseño.
- Tiene 8 secciones: la plataforma en una página, para todos, una por rol, la verificación pública y el glosario.
- Se llega desde la opción "Manual de usuario" del menú de todos los roles y desde el recuadro "¿Necesita ayuda?" del inicio, que lleva directo a la sección del rol.
- Tiene un índice con un enlace por sección y el botón "Imprimir o guardar en PDF", que imprime solo el manual.
- Lleva 4 capturas con datos ficticios, que genera la prueba de punta a punta.

**Cómo lo probé:**
- Prueba de punta a punta del Sprint 8 en un entorno limpio, con firma real: 15 pasos correctos (6 de esta historia).
- Una prueba compara todo lo que el manual pone en negrita con los textos de las pantallas.
- Como el menú cambió para todos, corrí la regresión de los Sprints 1 a 7: todos en verde (32, 23, 34, 32, 17, 30 y 26 pasos).
- CI con siete jobs en verde ([43623215214](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43623215214)); el frontend pasó de 199 a 205 pruebas.

La evidencia, con el manual impreso en PDF, está en `docs/evidencias/sprint-8/DRA-75/`.

**Ajustes:**
- Las capturas sin tamaño fijo movían la página.
- Había dos títulos iguales.
- Copiar las capturas durante la prueba recargaba la página.
- En dos capturas no se veían los botones.
- Algunos nombres del documento de negocio no coinciden con la pantalla; el manual usa los de la pantalla.

**Queda fuera:** el manual por rol con capturas de cada paso (DRA-72) y las preguntas frecuentes de la plataforma (DRA-73), las dos después de DRA-48.

### DRA-74

**Qué construí:** la "Guía de operación" en la plataforma, solo para el Administrador.
- Está en su menú y en su recuadro "¿Necesita ayuda?". Los demás roles ven "No tiene permiso para ver esta sección".
- Tiene 10 secciones: cómo está armada, el calendario de tareas, el personal y el cambio de Director, los disparadores, los respaldos, las alertas, la seguridad, los costos, qué hacer ante un incidente y los documentos técnicos en GitHub.
- Usa el mismo componente que el manual de DRA-75.

**Cómo lo probé:**
- Prueba de punta a punta del Sprint 8: 17 pasos correctos (2 de esta historia).
- Regresión de los Sprints 1 y 7, que comprueban el menú del Administrador: 32 y 26 pasos.
- 7 pruebas nuevas. Comparan los nombres de los disparadores con `.github/workflows` y comprueban que la guía no tiene claves, billeteras, correos ni contraseñas.
- CI con siete jobs en verde ([43627117530](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43627117530)); el frontend pasó de 205 a 212 pruebas.

La evidencia está en `docs/evidencias/sprint-8/DRA-74/`.

**Para validar con el PO:**
- los contactos de soporte para la sección de incidentes;
- los nombres de los disparadores de PROD (DRA-65).
