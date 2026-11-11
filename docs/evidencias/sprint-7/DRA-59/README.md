# Evidencia DRA-59: Renombrar los roles

**Sprint 7 · Fecha:** 11/11/2026 · **Rama:** `DRA-59-renombrar-roles`

| Código interno | Nombre en la tesis | Nombre en la plataforma |
|---|---|---|
| `AREA_ENCARGADA` | Área encargada | **Emisor de área** |
| `CONSULTA_INTERNA` | Consulta interna | **Mesa de Partes** |

## Qué se cambió

- **Migración V24** (`V24__nombres_de_los_roles.sql`): actualiza `rol.nombre` de los dos roles y la descripción de Mesa de Partes ("Busca, consulta el historial, imprime y entrega documentos"). Los códigos, los permisos y la regla de área (RF05) no cambian.
- **Pruebas:** una prueba nueva del backend (`CatalogosInicialesTest.cadaRolTieneUnNombreQueDescribeLoQueHace`) y los textos esperados de las pruebas que leen los nombres (backend, frontend y punta a punta).
- **Documentación:** los guiones de prueba de los Sprints 1 a 6 y de QA, el documento de flujos para el negocio, el README del backend y el `CLAUDE.md`. Las historias HU01–HU30 y las actas de revisión conservan los nombres de la tesis, con una tabla de equivalencias al inicio de las historias.

## Qué se comprueba

Capturas de la regresión de punta a punta (Chromium, Playwright, red Besu e IPFS reales, cuentas creadas desde la pantalla Usuarios):

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `dra59_01_encabezado_emisor.png` | El encabezado de Rosa dice "Emisor de área – Área de Capacitación" y la bienvenida, "Ingresó como Emisor de área" | Encabezado e Inicio con el nombre nuevo |
| `dra59_02_lista_de_usuarios.png` | La lista de Usuarios: Mesa de Partes, Director, Emisor de área (con su área) y Administrador | Pantalla Usuarios con los nombres nuevos |
| `dra59_03_historial_emisor.png` | El historial de la ficha: "Pedro Morales Ccanto (Emisor de área)" | Historial con el rol nuevo |
| `dra59_04_historial_mesa_de_partes.png` | El historial de las entregas: "PDF descargado por Luz Flores Ticona (Mesa de Partes)", "Impreso…" y "Duplicado impreso…" | Las entregas nuevas usan el nombre nuevo |

**Regresión en entornos limpios** ([`regresion.txt`](regresion.txt)): Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23; Sprint 3, 34 de 34; Sprint 4, 32 de 32; Sprint 5, 17 de 17; Sprint 6, 30 de 30. En total, 168 pasos sin fallas.

**El historial no se reescribe:** la migración solo modifica la tabla `rol`. El texto de cada evento de cuenta se guarda en `usuario_historial.detalle` al momento del evento, así que los eventos anteriores conservan "Área encargada" o "Consulta interna" tal como se registraron.

## Pruebas automáticas

Las cantidades se toman del registro de la CI (ver `docs/arquitectura/integracion-continua.md`): el backend pasa de 240 a 241 pruebas por la prueba nueva; frontend 180, portal 11 y contrato 28 siguen igual.

## Ajustes encontrados

- Ninguno en el comportamiento. Al reemplazar los nombres en el frontend, el reemplazo tocó también comentarios del código; se revirtieron, porque por decisión los comentarios conservan los nombres de la tesis.
