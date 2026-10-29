# Pruebas de punta a punta

Recorren la plataforma en un navegador real (Playwright) contra el backend y PostgreSQL reales, **sin simulaciones**. Complementan las pruebas automáticas de cada capa: estas confirman que las piezas funcionan juntas.

| Archivo | Qué prueba |
|---|---|
| `sprint1.cjs` | HU01 a HU06: 32 pasos (login, cambio obligatorio de la contraseña temporal, menú por rol, creación de cuentas con área obligatoria, tipos de documento por área y cambio de área con sesión abierta, billetera del director y rol de firmante otorgado y revocado en la red Besu real, bloqueo por intentos, restablecimiento, cambio de contraseña con cierre de otras sesiones, desactivación con sesión abierta, cambio de rol, cierre y expiración de la sesión) |
| `levantar.sh` | Levanta un entorno limpio: PostgreSQL vacío (puerto 5433), la red Besu si no está levantada, un `RegistroDocumentos` recién desplegado, el backend (8080) y el frontend (5173) |
| `preparar-blockchain.cjs` | Crea billeteras de prueba nuevas y despliega el contrato; escribe `.despliegue.json` (no se versiona) |
| `billetera-de-prueba.cjs` | Reemplaza a MetaMask: un proveedor EIP-1193 inyectado que firma transacciones **reales** en Besu con claves de prueba |

## Cómo ejecutarlas

```bash
# Terminal 1 (requiere Docker, Java 21 y Node 22; si no se puede descargar el compilador de
# Solidity, exporta SOLC_RUTA: ver plataforma/contracts/README.md)
./e2e/levantar.sh

# Terminal 2 (requiere Playwright: npm i -g playwright && npx playwright install chromium)
node e2e/sprint1.cjs /tmp/capturas
```

El backend se levanta con `SESION_INACTIVIDAD=1m` para que la prueba de expiración tarde un minuto y no 30. La prueba crea sus propias cuentas, por eso necesita una base de datos vacía: vuelve a ejecutar `levantar.sh` antes de repetirla.

Ejecuciones registradas: [HU03](../../docs/evidencias/sprint-1/HU03/README.md) (16 pasos), [HU04](../../docs/evidencias/sprint-1/HU04/README.md) (24), [HU05](../../docs/evidencias/sprint-1/HU05/README.md) (25) y [HU06](../../docs/evidencias/sprint-1/HU06/README.md) (32, la vigente).
