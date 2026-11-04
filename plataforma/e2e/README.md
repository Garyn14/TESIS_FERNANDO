# Pruebas de punta a punta

Recorren la plataforma en un navegador real (Playwright) contra el backend y PostgreSQL reales, **sin simulaciones**. Complementan las pruebas automáticas de cada capa: estas confirman que las piezas funcionan juntas.

| Archivo | Qué prueba |
|---|---|
| `sprint1.cjs` | HU01 a HU06: 32 pasos (login, cambio obligatorio de la contraseña temporal, menú por rol, creación de cuentas con área obligatoria, tipos de documento por área y cambio de área con sesión abierta, billetera del director y rol de firmante otorgado y revocado en la red Besu real, bloqueo por intentos, restablecimiento, cambio de contraseña con cierre de otras sesiones, desactivación con sesión abierta, cambio de rol, cierre y expiración de la sesión) |
| `sprint2.cjs` | HU07, HU08 y HU09 (23 pasos). HU07: el Administrador crea las cuentas desde la pantalla y se recorre la selección del tipo de documento por área (registro por lista y a solicitud de parte), el tipo de otra área por dirección y por API, el cambio de área con sesión abierta y el acceso de otro rol. HU08: validaciones, vista previa, envío con confirmación y código, token y HMAC comprobados en PostgreSQL, Mis documentos, detalle sin edición, expediente repetido y documento de otra área. HU09: datos del evento, plantilla Excel descargada, importación de `datos/beneficiarios-prototipo.xlsx` con una fila con error, DNI repetido, vista previa con resumen, envío del lote, 8 documentos comprobados en PostgreSQL, lote en Mis documentos y lote de otra área |
| `sprint3.cjs` | HU10, HU16, HU17 y HU11 (24 pasos). HU10: las áreas envían un documento, un lote y otro documento por la API; el Director ve la bandeja en orden con el lote en una fila, revisa un documento y el lote (navegando sus certificados), y se comprueba en PostgreSQL quién revisó y que no se duplique el registro. HU16: descarga la muestra del PDF final, lee su texto con `pdftotext`, la convierte a imagen con `pdftoppm` y decodifica el QR con ZXing (del repositorio local de Maven). HU17: prepara la firma por la API (la pantalla llega con HU11), recupera el PDF del nodo IPFS por su CID y compara su SHA-256 con el guardado, comprueba que quedó fijado, detiene el nodo para comprobar que el documento vuelve a Pendiente con el error en su historial y lo vuelve a encender. HU11: el Administrador registra la billetera del Director y le otorga el rol; el Director firma un documento desde su revisión y lotes desde la bandeja con la billetera de prueba en la red Besu real; se comprueba cada registro directamente en el contrato (hash, billetera y fecha del bloque) y contra el PDF de IPFS; cancelar en la billetera devuelve los documentos a Pendiente; 55 certificados se registran en dos transacciones (50 y 5) y, si la segunda se cancela, la primera sigue |
| `levantar.sh` | Levanta un entorno limpio: PostgreSQL vacío (puerto 5433), la red Besu si no está levantada, un `RegistroDocumentos` recién desplegado, un nodo IPFS privado vacío (5002, con la clave de `infra/ipfs`), el backend (8080) y el frontend (5173) |
| `preparar-blockchain.cjs` | Crea billeteras de prueba nuevas y despliega el contrato; escribe `.despliegue.json` (no se versiona) |
| `billetera-de-prueba.cjs` | Reemplaza a MetaMask: un proveedor EIP-1193 inyectado que firma transacciones **reales** en Besu con claves de prueba. `rechazar(n)` simula que la persona cancela la n-ésima transacción siguiente (código 4001) |

## Cómo ejecutarlas

```bash
# Terminal 1 (requiere Docker, Java 21 y Node 22; si no se puede descargar el compilador de
# Solidity, exporta SOLC_RUTA: ver plataforma/contracts/README.md)
./e2e/levantar.sh

# Terminal 2 (requiere Playwright: npm i -g playwright && npx playwright install chromium)
node e2e/sprint1.cjs /tmp/capturas
node e2e/sprint2.cjs /tmp/capturas-s2   # con otro levantar.sh: cada prueba necesita la base vacía
node e2e/sprint3.cjs /tmp/capturas-s3   # ídem
```

El backend se levanta con `SESION_INACTIVIDAD=1m` para que la prueba de expiración tarde un minuto y no 30. La prueba crea sus propias cuentas, por eso necesita una base de datos vacía: vuelve a ejecutar `levantar.sh` antes de repetirla.

Ejecuciones registradas: [HU03](../../docs/evidencias/sprint-1/HU03/README.md) (16 pasos), [HU04](../../docs/evidencias/sprint-1/HU04/README.md) (24), [HU05](../../docs/evidencias/sprint-1/HU05/README.md) (25) y [HU06](../../docs/evidencias/sprint-1/HU06/README.md) (32, la vigente).
