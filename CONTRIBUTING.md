# Cómo trabajamos

## Ramas

- `main` siempre debe compilar y pasar la integración continua.
- Cada historia o tarea se trabaja en su propia rama, con la clave de Jira al inicio:
  `DRA-14-login-por-rol`, `DRA-43-estructura-ci`.
- Al cerrar el trabajo, la rama se integra a `main`.

## Commits

Empiezan con la clave de Jira y describen el cambio en presente:

```
DRA-14 Bloquea la cuenta tras 3 intentos fallidos
```

Con la app **GitHub for Jira** instalada, las ramas y commits aparecen dentro de cada historia en Jira.

## Base de datos

El esquema solo cambia con migraciones de Flyway. Las reglas (nombres, no modificar migraciones ya integradas, estructura y datos por separado, sin secretos) están en [plataforma/backend/README.md](plataforma/backend/README.md#base-de-datos-y-migraciones-flyway).

## Antes de subir cambios

| Proyecto | Comando |
|---|---|
| Backend | `cd plataforma/backend && ./mvnw verify` (formatea con `./mvnw spotless:apply`) |
| Frontend | `cd plataforma/frontend && npm run lint && npm run format:check && npm test && npm run build` |
| Contratos | `cd plataforma/contracts && npm run format:check && npm run compile && npm test` |

La integración continua (`.github/workflows/ci.yml`) ejecuta lo mismo en cada push a `main` o a ramas `DRA-*`. Cómo funciona, cómo leer sus resultados y qué hacer si falla: [docs/arquitectura/integracion-continua.md](docs/arquitectura/integracion-continua.md).

## Definición de terminado

Según la sección 3.2.4.5 de la tesis, una historia está terminada cuando cumple sus criterios de aceptación, tiene pruebas, se integra sin errores con lo anterior y la aprueba el Product Owner en la revisión del sprint.
