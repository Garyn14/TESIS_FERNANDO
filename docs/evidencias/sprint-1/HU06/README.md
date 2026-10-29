# Evidencia HU06: Billetera del director y rol de firmante (DRA-17)

**Prueba de punta a punta real** del 29/10/2026, sin simulaciones de backend ni de blockchain:

- navegador (Playwright);
- frontend, backend y PostgreSQL 17;
- **red Besu local con 4 validadores QBFT** y un contrato RegistroDocumentos recién desplegado.

La prueba del sprint ([`plataforma/e2e/sprint1.cjs`](../../../../plataforma/e2e/sprint1.cjs)) recorre HU01 a HU06. Resultado en [`resultado.txt`](resultado.txt): **32 de 32 pasos correctos**.

**Billetera de prueba.** Playwright no puede manejar la extensión MetaMask. Por eso la prueba inyecta en la página una billetera compatible con MetaMask (EIP-1193, [`billetera-de-prueba.cjs`](../../../../plataforma/e2e/billetera-de-prueba.cjs)). Firma **transacciones reales** con una clave de prueba y las envía a Besu. La interfaz recorre el mismo camino que con MetaMask:

- pide las cuentas;
- detecta que la billetera está en otra red y le agrega la red "Plataforma DRA Satipo";
- envía `eth_sendTransaction` y espera el recibo.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu06_01_sin_billetera.png` | El director aún sin billetera; abajo, la red y el contrato | Pantalla Billetera del director |
| `hu06_02_error_de_tipeo.png` | Una letra cambiada de minúscula a mayúscula: la suma de verificación EIP-55 detecta el error | Se valida el formato |
| `hu06_03_billetera_registrada.png` | Billetera registrada con su suma de verificación, "Sin rol de firmante" | RF07 |
| `hu06_04_billetera_no_administradora.png` | Con una billetera que no administra el contrato, la plataforma lo indica y no envía nada | El otorgamiento se confirma con la billetera de administrador |
| `hu06_05_confirmar_otorgamiento.png` | Billetera del Administrador conectada, red y "Sin costo" antes de confirmar | RF08, RNF11 |
| `hu06_06_rol_otorgado.png` | Rol otorgado en la blockchain y "Firmante activo" | RF08 |
| `hu06_07_rol_revocado.png` | Rol revocado, con el aviso de que lo firmado antes sigue siendo válido | La revocación no invalida lo firmado antes |

Además, la prueba comprueba:

- que la billetera no se puede registrar si es administradora del contrato;
- que no se puede cambiar mientras tenga el rol de firmante;
- que el estado se lee de nuevo de la blockchain al volver a la pantalla;
- que solo el Administrador ve la pantalla y la API;
- **directo en la blockchain y sin pasar por la plataforma**, que `esFirmante` vale `true` después de otorgar y `false` después de revocar.

### Verificación del historial contra la blockchain

Después de la prueba, el historial de la cuenta del director en PostgreSQL tenía:

| Evento | Detalle |
|---|---|
| `BILLETERA_REGISTRADA` | `Billetera: 0x10Cac4314A672A50d68848B9E4Fb0Cc81DA366aC` |
| `FIRMANTE_OTORGADO` | transacción `0x09d02976…e3060`, bloque 4654, firmada por la billetera del Administrador |
| `FIRMANTE_REVOCADO` | transacción `0x9fc14c53…fe94d`, bloque 4657 |

El recibo de la transacción de otorgamiento, consultado directamente al nodo Besu, confirma `status 0x1`, bloque 4654, un evento y **precio de gas efectivo 0** (RNF11).

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Contrato | `plataforma/contracts/test/RegistroDocumentos.test.ts` | 13 en la red simulada de Hardhat: despliegue con dos administradores, otorgar y revocar (también con el respaldo), permisos, control interno y mínimo de un administrador |
| Contrato en Besu | `plataforma/contracts/scripts/probar-registro-besu.ts` | Nuevo paso de la CI: despliega y otorga y revoca en la red Besu real, sin saldo |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/billeteras/BilleterasTest.java` | 14, con sesiones reales y el contrato simulado en memoria |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/blockchain/ContratoRegistroWeb3jTest.java` | 4: lectura de los eventos del recibo y el identificador del rol, igual al de Solidity |
| Frontend | `src/billeteras/PaginaBilletera.test.tsx` y `src/blockchain/billetera.test.ts` | 10 |

## Qué queda para las historias de firma

El criterio "La revocación no invalida los documentos firmados antes" está garantizado **por diseño**:

- revocar solo quita el rol;
- el contrato no borra ni modifica nada.

Se probará con documentos reales cuando el contrato registre documentos (HU16–HU18).

## Hallazgo durante la verificación

La primera ejecución falló porque Vite recargó la página al descubrir la nueva dependencia `ethers`, que se carga solo en esta pantalla. Ocurre una sola vez por instalación en el entorno de desarrollo; en el build de producción no pasa.
