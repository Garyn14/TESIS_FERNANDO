# Revisión del Sprint 1

- **Sprint:** 1, del 29/10 al 04/11/2026. El trabajo terminó el 29/10, así que la revisión se puede adelantar.
- **Objetivo:** controlar quién accede a la plataforma y qué puede hacer (usuarios, roles, áreas y billetera del director).
- **Resultado:** 6 de 6 historias aprobadas, 24 de 24 puntos. El Sprint se cerró el 31/10/2026 (ver [Acta](#acta)).
- **Participantes (Tabla 24 de la tesis):**
  - Product Owner: Christhian Danny Escalante Rosas.
  - Scrum Master: Jefferson Ventura Ruiz.
  - Equipo de desarrollo: Garyn Fernando Huarhuachi Ramos.

## Material de la reunión

El documento de la revisión, para compartir con el PO, está en <https://claude.ai/artifact/Mpx2KAvFfsVNdauFhDNgge>. Incluye:

- el resumen;
- las historias entregadas, con una columna para la decisión del PO;
- el guion de la demostración (unos 25 minutos);
- las 18 decisiones a validar, con una columna para la respuesta del PO;
- los pendientes y riesgos;
- la calidad del incremento;
- lo que se necesita para el Sprint 2.

Guion para que el PO pruebe cada historia y deje su ok en Jira: [guion-de-pruebas.md](guion-de-pruebas.md).

Evidencia por historia: [docs/evidencias/sprint-1](../../evidencias/sprint-1/).

## Cómo levantar la demostración

```bash
cd plataforma
./e2e/levantar.sh demo
```

Levanta PostgreSQL vacío, la red Besu (si no está levantada), un contrato `RegistroDocumentos` nuevo, el backend con sesión de 30 minutos y el frontend en <http://localhost:5173>. Al final muestra la clave de prueba de la billetera del Administrador, para importarla en MetaMask, y la dirección que se registra como billetera del director. Son billeteras solo de prueba, sin valor.

**Antes de la reunión:** ensaya una vez el otorgamiento y la revocación del rol de firmante con MetaMask real. Las pruebas automáticas usan una billetera de prueba compatible con MetaMask ([plataforma/e2e/billetera-de-prueba.cjs](../../../plataforma/e2e/billetera-de-prueba.cjs)), pero la extensión real todavía no se probó.

## Acta

- **Fecha de la validación:** 30 y 31/10/2026, en el entorno local levantado con `./e2e/levantar.sh demo`.
- **Cómo se validó:** con el [guion de pruebas](guion-de-pruebas.md). La aprobación de cada historia quedó registrada en su ticket de Jira, que pasó a **Finalizada**.
- **Cierre del Sprint 1:** 31/10/2026, antes de la fecha prevista (04/11).

### Decisión sobre cada historia

| Historia | Ticket | Puntos | Decisión | Registro en Jira |
|---|---|---|---|---|
| HU01: Crear cuentas de usuario | DRA-12 | 3 | Aprobada | Comentario "Se da el OK del ticket", con captura (30/10) |
| HU02: Editar o desactivar cuentas | DRA-13 | 2 | Aprobada | Ticket movido a Finalizada, sin comentario ni captura |
| HU03: Iniciar sesión según el rol | DRA-14 | 5 | Aprobada | Comentario "Comparto las pruebas OK", con captura (31/10) |
| HU04: Cambiar o restablecer la contraseña | DRA-15 | 3 | Aprobada | Comentario "Se da el OK en las pruebas", con captura (31/10) |
| HU05: Asignar el área a un usuario | DRA-16 | 3 | Aprobada, con un pendiente | Comentario: cumple los criterios de aceptación, pero queda pendiente la definición de las áreas. Con captura (31/10) |
| HU06: Billetera del director y rol de firmante | DRA-17 | 8 | Aprobada | Ticket movido a Finalizada, sin comentario ni captura |

**Resultado:** 6 de 6 historias aprobadas, con 24 de 24 puntos. La velocidad del Sprint 1 es de 24 puntos.

### Decisiones a validar

Las 18 decisiones del documento de la revisión siguen marcadas "Por responder". Se tratan así:

- **Preguntas abiertas.** Necesitan un dato del PO y pasan al Sprint 2:
  1. **Nombres de las áreas y los documentos que emite cada una.** Confirmado como pendiente en DRA-16. Mientras tanto se mantienen las del prototipo. Si cambian, se corrigen con una migración nueva, sin tocar el código.
  2. **Nombre oficial en pantalla:** «Agencia Agraria Satipo – DRA Junín» o «DRA Satipo».
  3. **Custodia de la billetera de respaldo del contrato:** quién la guarda y dónde.
- **Decisiones de diseño (4 a 18).** Al aprobar las historias no se pidió ningún cambio, así que se mantienen como están construidas. Si el PO pide cambiar alguna, se carga como historia nueva.

### Cambios pedidos

No se pidió ningún cambio sobre lo construido.

### Pendientes que pasan al Sprint 2

| Pendiente | Ticket o fuente |
|---|---|
| Infraestructura en AWS. No se hizo en el Sprint 1, a propósito, para no gastar crédito. Se mueve al Sprint 2 y se ejecuta antes de la demostración pública | DRA-44 |
| Responder las 3 preguntas abiertas | Documento de la revisión |
| Insumos del PO para empezar el Sprint 2: un ejemplo real de cada documento, una lista real de beneficiarios (anonimizada) y el formato del número de expediente | Documento de la revisión, sección «Sprint 2» |
| «Solo ve los documentos de su área» (HU05): se completa cuando existan los documentos | HU07–HU09, Sprint 2 |
| «La revocación no invalida lo firmado antes» (HU06): se prueba con documentos firmados reales | HU16–HU18, Sprint 3 |

### Observaciones sobre la evidencia

En DRA-13 (HU02) y DRA-17 (HU06) la aprobación no tiene comentario ni captura. La evidencia de esas historias es la del repositorio: [HU02](../../evidencias/sprint-1/HU02/) y [HU06](../../evidencias/sprint-1/HU06/).

En el caso de HU06 no quedó constancia de si la validación se hizo con la extensión real de MetaMask. Ese era el riesgo señalado para la revisión, así que conviene adjuntar una captura del otorgamiento con MetaMask en DRA-17.
