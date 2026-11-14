# Guion de pruebas del Sprint 8 para el PO

Este guion le permite al Product Owner probar las historias del Sprint 8 y decidir si las aprueba. Son propuestas del equipo, fuera del backlog original de la tesis:
- la **ayuda** para ciudadanos y personal, que prueba el PO;
- dos **requisitos para PROD**, que el equipo demuestra en QA.

| Orden | Historia | Ticket | Puntos | Quién |
|---|---|---|---|---|
| 1 | "¿Cómo verificar un documento?" en el portal | DRA-70 | 2 | El PO |
| 2 | Preguntas frecuentes del portal | DRA-71 | 3 | El PO |
| 3 | Manual de usuario general (versión 1) | DRA-75 | 3 | El PO |
| 4 | Guía de operación del Administrador | DRA-74 | 3 | El PO |
| 5 | Respaldos y recuperación | DRA-66 | 5 | El equipo, en QA |
| 6 | Monitoreo y alertas | DRA-68 | 5 | El equipo, en QA |

**En la misma sesión** se pueden hacer los guiones de los Sprints 3 a 7, cuya validación está pendiente (DRA-48).

## Antes de empezar

El equipo levanta la plataforma como en el Sprint 7:

```bash
PLATAFORMA_PORTAL_URL=http://<IP de la computadora>:5174 ./e2e/levantar.sh demo
```

También se puede usar **QA**, después de un **QA – Encender**:
- plataforma: <https://d1px0ea1324c4y.cloudfront.net>;
- portal: <https://d3u5jxvc0sbgm7.cloudfront.net>.

Cuentas que se usan (las del guion del Sprint 7):

| Cuenta | Rol | Contraseña temporal | Contraseña propia |
|---|---|---|---|
| admin | Administrador | La que entrega el equipo | AdminPropia26 |
| pmorales | Emisor de área – Área de Administración | Demo2026 | Propia2026 |
| cmendoza | Director | Demo2026 | Propia2026 |
| lflores | Mesa de Partes | Demo2026 | Propia2026 |

Si las cuentas no existen, créelas primero como en el paso 0 del [guion del Sprint 7](../sprint-7/guion-de-pruebas.md).

---

## 1. "¿Cómo verificar un documento?" (DRA-70)

**Objetivo:** que un ciudadano o un empleador sepa cómo verificar un documento y qué significa cada resultado.

| # | Paso | Qué debe ver | Resultado |
|---|---|---|---|
| 1.1 | Abra el portal en el celular o la computadora | Debajo de los 3 pasos, el enlace **"¿Cómo verificar un documento?"** | ☐ OK ☐ NO OK ☐ Obs. |
| 1.2 | Púlselo | La guía: con el código QR, con el código de verificación, dónde están en el documento, qué significa cada resultado y qué hacer si el resultado no es el esperado | ☐ OK ☐ NO OK ☐ Obs. |
| 1.3 | Mire el dibujo del certificado | Señala el QR (1), el código de verificación (2) y las fechas (3), con su explicación debajo | ☐ OK ☐ NO OK ☐ Obs. |
| 1.4 | Lea "Qué significa cada resultado" | 6 resultados con los mismos colores e íconos que se ven al verificar: válido, anulado, vencido, no válido, versión corregida y "no se pudo verificar" | ☐ OK ☐ NO OK ☐ Obs. |
| 1.5 | Pulse **Verificar un documento** | Vuelve a la portada | ☐ OK ☐ NO OK ☐ Obs. |
| 1.6 | Escriba el código `DRA-2026-ZZZZZZ` y pulse **Verificar** | "Documento no válido", con el enlace **"Vea cómo verificar un documento"** | ☐ OK ☐ NO OK ☐ Obs. |
| 1.7 | Baje al pie de la página | Los enlaces "¿Cómo verificar un documento?" y "Preguntas frecuentes", en todas las páginas del portal | ☐ OK ☐ NO OK ☐ Obs. |

## 2. Preguntas frecuentes del portal (DRA-71)

**Objetivo:** que las dudas comunes se resuelvan sin acudir a la agencia.

| # | Paso | Qué debe ver | Resultado |
|---|---|---|---|
| 2.1 | En la portada, pulse **Preguntas frecuentes** | 15 preguntas en tres grupos: sobre la verificación, para el titular y para quien recibe un documento. Todas cerradas | ☐ OK ☐ NO OK ☐ Obs. |
| 2.2 | Pulse "¿Verificar un documento tiene algún costo?" | Se abre la respuesta: es gratuita. Al pulsarla de nuevo, se cierra | ☐ OK ☐ NO OK ☐ Obs. |
| 2.3 | Abra "¿Qué datos míos se muestran al verificar?" | Dice que **nunca se muestra el DNI** | ☐ OK ☐ NO OK ☐ Obs. |
| 2.4 | En una pregunta abierta, pulse **Enlace a esta pregunta**, copie la dirección y ábrala en otra pestaña | La página se abre con esa pregunta abierta | ☐ OK ☐ NO OK ☐ Obs. |
| 2.5 | Lea las respuestas | Son claras y correctas para la agencia. Anote las que quiera cambiar, en especial las que remiten a la Agencia Agraria Satipo (copias, atención) | ☐ OK ☐ NO OK ☐ Obs. |

## 3. Manual de usuario (DRA-75)

**Objetivo:** que cada persona encuentre cómo hacer su trabajo sin que nadie le explique.

| # | Paso | Qué debe ver | Resultado |
|---|---|---|---|
| 3.1 | Ingrese con `pmorales` | En el inicio, el recuadro **"¿Necesita ayuda?"** y, en el menú, **Manual de usuario** | ☐ OK ☐ NO OK ☐ Obs. |
| 3.2 | Pulse **"Ver lo que hace el rol Emisor de área"** | El manual se abre en la sección "Para el Emisor de área": registrar, emitir por lista, corregir y reemitir | ☐ OK ☐ NO OK ☐ Obs. |
| 3.3 | Suba al índice y recorra las secciones | 8 secciones, con las tablas de roles y estados, 4 capturas y el glosario | ☐ OK ☐ NO OK ☐ Obs. |
| 3.4 | Pulse **Imprimir o guardar en PDF** | La vista de impresión muestra solo el manual, sin el menú ni el encabezado | ☐ OK ☐ NO OK ☐ Obs. |
| 3.5 | Repita 3.1 y 3.2 con `cmendoza` y con `lflores` | Cada uno llega a la sección de su rol | ☐ OK ☐ NO OK ☐ Obs. |
| 3.6 | Lea la sección de su interés | Los pasos coinciden con lo que se ve en pantalla. Anote lo que no se entienda | ☐ OK ☐ NO OK ☐ Obs. |

## 4. Guía de operación (DRA-74)

**Objetivo:** que el responsable de sistemas sepa qué hacer, cuándo y ante un problema.

| # | Paso | Qué debe ver | Resultado |
|---|---|---|---|
| 4.1 | Ingrese con `admin` | En el menú, **Guía de operación**, y en el inicio, "Abrir la guía de operación" | ☐ OK ☐ NO OK ☐ Obs. |
| 4.2 | Ábrala | 10 secciones: desde cómo está armada la plataforma hasta qué hacer ante un incidente | ☐ OK ☐ NO OK ☐ Obs. |
| 4.3 | Lea el **Calendario de tareas** | Qué revisar cada día, semana, mes y cada 90 días | ☐ OK ☐ NO OK ☐ Obs. |
| 4.4 | En **Documentos técnicos**, pulse un enlace | Se abre el documento técnico en GitHub, en otra pestaña | ☐ OK ☐ NO OK ☐ Obs. |
| 4.5 | Cierre sesión, ingrese con `pmorales` y escriba al final de la dirección `#/operacion` | "No tiene permiso para ver esta sección" | ☐ OK ☐ NO OK ☐ Obs. |

## 5 y 6. Respaldos (DRA-66) y monitoreo (DRA-68)

Son para PROD y están **apagados en QA**. El equipo los demuestra encendiéndolos en QA, o el PO revisa la evidencia de la prueba ya hecha:
- **Respaldos:** se tomó una copia, se borraron los datos, se restauró y el documento volvió a salir válido ([evidencia](../../evidencias/sprint-8/DRA-66/)).
- **Monitoreo:** se detuvieron dos validadores y el backend, y llegaron las alertas y el aviso de recuperación ([evidencia](../../evidencias/sprint-8/DRA-68/)).

| # | Pregunta para el PO | Respuesta |
|---|---|---|
| 5.1 | ¿Basta una copia diaria, con 30 días de retención? | |
| 6.1 | ¿Quién debe recibir las alertas en PROD? | |

---

## Cómo dejar el ok en Jira

En cada ticket (DRA-70, DRA-71, DRA-75, DRA-74, DRA-66 y DRA-68), deje un comentario con su decisión: **aprobado**, o las observaciones con el número de paso. Cada observación se registra como un ticket nuevo; las historias cerradas no se reabren.
