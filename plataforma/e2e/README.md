# Pruebas de punta a punta

Recorren la plataforma en un navegador real (Playwright) contra el backend y PostgreSQL reales, **sin simulaciones**. Complementan las pruebas automáticas de cada capa: estas confirman que las piezas funcionan juntas.

| Archivo | Qué prueba |
|---|---|
| `sprint1.cjs` | HU01 a HU04: 24 pasos (login, cambio obligatorio de la contraseña temporal, menú por rol, creación de cuentas, bloqueo por intentos, restablecimiento, cambio de contraseña con cierre de otras sesiones, desactivación con sesión abierta, cambio de rol, cierre y expiración de la sesión) |
| `levantar.sh` | Levanta un entorno limpio: PostgreSQL vacío (puerto 5433), backend (8080) y frontend (5173) |

## Cómo ejecutarlas

```bash
# Terminal 1 (requiere Docker, Java 21 y Node 22)
./e2e/levantar.sh

# Terminal 2 (requiere Playwright: npm i -g playwright && npx playwright install chromium)
node e2e/sprint1.cjs /tmp/capturas
```

El backend se levanta con `SESION_INACTIVIDAD=1m` para que la prueba de expiración tarde un minuto y no 30. La prueba crea sus propias cuentas, por eso necesita una base de datos vacía: vuelve a ejecutar `levantar.sh` antes de repetirla.

Ejecuciones registradas: [HU03](../../docs/evidencias/sprint-1/HU03/README.md) (16 pasos) y [HU04](../../docs/evidencias/sprint-1/HU04/README.md) (24 pasos, la vigente).
