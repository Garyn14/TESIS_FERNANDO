# Smart contracts

Hardhat 3, Solidity 0.8.30 (EVM Cancun) y OpenZeppelin Contracts 5.6. Stack definido en [ADR-001](../../docs/arquitectura/ADR-001-stack-tecnico.md).

```bash
npm ci
npm run compile           # compila
npm test                  # pruebas en la red simulada de Hardhat
npm run probar:besu       # humo de la red Besu local (DRA-45)
npm run probar:registro   # RegistroDocumentos en la red Besu local (HU06)
npm run desplegar:besu    # despliegue (ver abajo)
```

Si la red no permite descargar el compilador oficial (por ejemplo, un entorno con salida restringida), se puede usar el compilador WASM del paquete npm `solc`: `npm i -g solc@0.8.30` y `SOLC_RUTA=<ruta>/solc/soljson.js npm test`. La CI usa el compilador oficial.

## Contratos

| Contrato                 | Para qué                                                                                                          | Historia         |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------- | ---------------- |
| `RegistroDocumentos.sol` | Registro de los documentos firmados: roles (HU06) y registro de documentos (HU11). La anulación se agrega en HU29 | HU06 en adelante |
| `PruebaRed.sol`          | Solo para la prueba de humo de la red Besu; no es parte de la plataforma                                          | DRA-45           |

### Roles de `RegistroDocumentos`

| Rol                                               | Billeteras                                                             | Puede                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DEFAULT_ADMIN_ROLE` (administrador del contrato) | La del Administrador de la plataforma y una de respaldo fuera de línea | `otorgarFirmante`, `revocarFirmante` y administrar otros administradores |
| `FIRMANTE_ROLE` = `keccak256("FIRMANTE_ROLE")`    | La del director                                                        | `registrarDocumentos` (HU11)                                             |

Reglas propias, además de las de OpenZeppelin `AccessControl`:

- Una billetera no puede ser a la vez administradora y firmante (control interno: quien administra los permisos no firma). La regla también aplica a `grantRole`.
- Siempre debe quedar al menos un administrador: `revokeRole` y `renounceRole` del último fallan con `UltimoAdministrador`.
- Revocar el rol de firmante no borra nada de lo registrado (RF08): la validez de un documento depende de su registro y no del rol actual de quien lo firmó.

Los cambios de rol emiten los eventos estándar `RoleGranted` y `RoleRevoked`. El backend los usa para verificar las transacciones que envía el navegador.

### Registro de documentos (HU11)

| Función                                          | Quién      | Qué hace                                                                                                                                                                                      |
| ------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registrarDocumentos(codigos, hashes, dniHmacs)` | Firmante   | Registra de 1 a 50 documentos (`MAXIMO_POR_TRANSACCION`): código, SHA-256 del PDF final y HMAC del DNI. Emite `DocumentoRegistrado` por cada uno. Si uno no es válido, no se registra ninguno |
| `consultar(codigo)`                              | Cualquiera | Devuelve si está registrado y su hash, HMAC, billetera firmante y fecha del bloque (la fecha oficial de emisión, RF32). Lo usará la verificación (HU21)                                       |

Un código no se registra dos veces (`CodigoYaRegistrado`). El DNI nunca va a la blockchain: solo su HMAC (RF17). El navegador divide una selección de más de 50 documentos en varias transacciones; en la red Besu, 50 documentos usan unos 3,7 millones de gas, sin costo (RNF11).

## Despliegue

El servidor **nunca** guarda claves privadas (RNF05). El despliegue lo hace una cuenta temporal que no recibe ningún rol, y la red no cobra gas, así que no necesita saldo.

1. **Billetera del Administrador.** El Administrador de la plataforma crea o elige su billetera en MetaMask y copia su dirección.
2. **Billetera de respaldo, fuera de línea.** Créala en un equipo sin conexión (MetaMask instalada solo para esto, o una billetera de hardware). Anota la frase de recuperación en papel, por duplicado, y guarda las copias en sobres cerrados en dos lugares seguros de la institución (por ejemplo, caja fuerte de la Dirección y de Administración). Copia solo la **dirección pública**. La billetera de respaldo se usa únicamente si se pierde la del Administrador.
3. **Desplegar:**

   ```bash
   ADMIN_BILLETERA=0x... RESPALDO_BILLETERA=0x... BESU_RPC_URL=http://<nodo>:8545 npm run desplegar:besu
   ```

   El script verifica que ambas billeteras sean administradoras y que la cuenta que despliega no tenga ningún rol, y escribe `despliegues/<chainId>.json` con la dirección del contrato.

4. **Configurar el backend** con `PLATAFORMA_CONTRATO_DIRECCION=<dirección del contrato>`.
5. **Agregar la red en MetaMask:** la pantalla "Billetera del director" la propone automáticamente (chainId 20260, sin costo de transacción).

Si se pierde la billetera del Administrador: con la de respaldo se otorga `DEFAULT_ADMIN_ROLE` a una billetera nueva del Administrador y se le quita a la perdida.
