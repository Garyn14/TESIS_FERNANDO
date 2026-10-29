# Revisión del Sprint 1

- **Sprint:** 1, del 29/10 al 04/11/2026. El trabajo terminó el 29/10, así que la revisión se puede adelantar.
- **Objetivo:** controlar quién accede a la plataforma y qué puede hacer (usuarios, roles, áreas y billetera del director).
- **Resultado:** 6 de 6 historias, 24 de 24 puntos. Todas están construidas, probadas e integradas, y esperan la aprobación del PO.
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

Evidencia por historia: [docs/evidencias/sprint-1](../../evidencias/sprint-1/).

## Cómo levantar la demostración

```bash
cd plataforma
./e2e/levantar.sh demo
```

Levanta PostgreSQL vacío, la red Besu (si no está levantada), un contrato `RegistroDocumentos` nuevo, el backend con sesión de 30 minutos y el frontend en <http://localhost:5173>. Al final muestra la clave de prueba de la billetera del Administrador, para importarla en MetaMask, y la dirección que se registra como billetera del director. Son billeteras solo de prueba, sin valor.

**Antes de la reunión:** ensaya una vez el otorgamiento y la revocación del rol de firmante con MetaMask real. Las pruebas automáticas usan una billetera de prueba compatible con MetaMask ([plataforma/e2e/billetera-de-prueba.cjs](../../../plataforma/e2e/billetera-de-prueba.cjs)), pero la extensión real todavía no se probó.

## Acta

Se completa al terminar la reunión, con:

- la decisión del PO sobre cada historia;
- las respuestas a las decisiones;
- los cambios pedidos, que se cargan en Jira para el Sprint 2.
