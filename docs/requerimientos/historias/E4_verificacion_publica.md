# E4: Verificación pública de autenticidad

**Objetivo:** Permitir que cualquier tercero compruebe la autenticidad de un documento en segundos.
**Requerimientos:** RF36–RF41 · **Sprint:** 5 · **Fuente:** Tabla 20 de la tesis.

---

## HU19: Verificar mediante el código QR

**Como** entidad externa, **quiero** escanear el código QR de un documento, **para** comprobar su autenticidad y ver el documento completo.

**Contexto**

El PDF final de cada documento lleva un código QR (HU16) que apunta a `{portal}/verificar/{token}`. El token es aleatorio, de 256 bits, y nunca contiene el DNI. Esta historia construye ese **portal público de verificación**. Es un proyecto aparte de la plataforma interna, sin inicio de sesión ni menú, pensado para abrirse en el celular de quien escanea el QR. El resultado lo calcula la comprobación de autenticidad de HU21.

| Paso | Qué ve la persona |
|---|---|
| 1 | Escanea el QR y se abre el portal en su navegador. Mientras se comprueba, ve "Verificando el documento…" |
| 2 | Ve el resultado: **Documento válido**, **Documento anulado** o **Documento no válido**, con su explicación |
| 3 | Si es válido, ve el tipo, el titular, la fecha de emisión y el estado, y debajo **el documento completo**, que puede abrir o descargar |

**Criterios de aceptación**

Los tres primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] No se requiere registro: el portal no pide usuario ni contraseña.
- [ ] El resultado se muestra en menos de dos segundos (RNF01). Mientras tanto se ve un indicador de progreso.
- [ ] Si el documento es válido, se muestra completo.
  - Es el PDF final guardado en IPFS, el mismo cuyo hash se comprobó en la blockchain.
  - Se ve dentro de la página, con los botones "Abrir el documento" y "Descargar PDF" para los celulares que no muestran PDF incrustados.
- [ ] **Válido:** "Documento válido", con el mensaje de HU21, y:
  - el tipo de documento y el titular;
  - la fecha de emisión con el mes en letras (por ejemplo, 4 de noviembre de 2026), en hora de Lima;
  - el estado "Vigente".
- [ ] **Anulado:**
  - "Documento anulado", con el tipo, el titular, la fecha de emisión y la fecha de anulación;
  - si fue reemplazado, el aviso "Existe una versión corregida de este documento. Solicítela a la Agencia Agraria Satipo.", sin su código (RF41);
  - **no se muestra el documento**, para que no se use como válido.
- [ ] **No válido:** "Documento no válido" y "No encontramos un documento válido con estos datos.", sin ningún dato ni documento.
- [ ] Si la verificación no está disponible, el portal muestra el mensaje de HU21 y el botón "Intentar nuevamente".
- [ ] El documento solo se entrega si la verificación es Válida (`GET /api/verificacion/{token}/documento`). En cualquier otro caso responde 404. No se guarda en caché.
- [ ] La página se adapta al celular (360 px de ancho) y a la computadora, con la identidad de la agencia (logo y colores de la plataforma).
- [ ] La portada (`/`) explica cómo verificar un documento con el QR. El ingreso del código de verificación llega con HU20.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Verificar escribiendo el código de verificación | HU20 |
| Límite de 10 consultas por minuto por IP (RNF04) | HU20 |
| Publicar el portal en internet (dominio y servidor) | DRA-44 (AWS) |

**Notas técnicas**

- Proyecto nuevo `plataforma/portal`: React + Vite + Tailwind (ADR-001), con la guía visual de la plataforma, en el puerto 5174 (`PLATAFORMA_PORTAL_URL`).
- Ruta `/verificar/{token}`, que es la del QR. Usa `GET /api/verificacion/{token}` (HU21) y `GET /api/verificacion/{token}/documento`.
- La CI suma el job "Portal (React + Vite)", y `levantar.sh` levanta también el portal.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 5 | RF37, RF39 |

## HU20: Verificar mediante el código de verificación

**Como** entidad externa, **quiero** ingresar el código de verificación de un documento, **para** comprobar su autenticidad cuando no puedo escanear el código QR.

**Contexto**

Cada documento lleva impreso, debajo del QR, su **código de verificación** con el formato `DRA-AAAA-XXXXXX` (RF16). Los seis caracteres finales excluyen los que se confunden entre sí, como O y 0 o I y 1 (RNF04). Sirve cuando el QR no se puede escanear, por ejemplo en una fotocopia borrosa o cuando se lo dictan por teléfono a quien verifica.

Como el código es corto y está a la vista, quien lo ingresa ve **menos** que con el QR (RF40): el resultado, el tipo, el titular, la fecha de emisión y el estado, sin el documento. La comprobación es la misma de HU21. Para que nadie pueda probar códigos al azar, el portal limita las consultas a diez por minuto por dirección IP (RNF04).

**Criterios de aceptación**

Los tres primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] Se valida el formato del código.
  - El portal acepta minúsculas, espacios alrededor y los guiones opcionales: "dra 2026 f8r2ma" se lee como `DRA-2026-F8R2MA`.
  - Un formato inválido se señala junto al campo, sin consultar al servidor: "Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA."
  - El servidor vuelve a validarlo, y un código mal formado responde No válido sin consultar la blockchain.
- [ ] Se muestran solo el tipo de documento, el nombre del titular, la fecha de emisión y el estado.
  - **No se muestra el documento** ni se puede descargar con el código (RF40).
  - En un anulado se agregan la fecha de anulación y si existe una versión corregida, sin su código (RF41).
- [ ] Se limita el número de consultas por dirección IP: **10 por minuto** (RNF04).
  - El límite cuenta las consultas con el código y con el QR.
  - La consulta número 11 dentro del minuto responde 429: "Hizo demasiadas consultas en poco tiempo. Espere un minuto e intente nuevamente.", con la cabecera `Retry-After`.
  - El límite se configura fuera del código (`PLATAFORMA_VERIFICACION_CONSULTAS_POR_MINUTO`).
- [ ] La portada del portal tiene el campo **Código de verificación** y el botón "Verificar". El resultado aparece debajo, con las mismas tarjetas de HU19 (Válido, Anulado, No válido) y el indicador de progreso.
- [ ] El resultado se muestra en menos de dos segundos (RNF01) y no requiere registro (RF37).
- [ ] La IP es la del visitante, aunque el portal esté detrás de un proxy. Se usa `X-Forwarded-For` solo cuando viene de un proxy de confianza: la red interna o el propio servidor.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Registrar cada consulta para la auditoría | HU24 (Sprint 6) |
| Un límite compartido entre varias instancias del backend | DRA-44 (AWS). Hoy el límite vive en la memoria de cada instancia |

**Notas técnicas**

- API: `GET /api/verificacion/codigo/{codigo}`. Responde con el mismo formato de HU21.
- El límite usa Bucket4j (ADR-001), con un balde por IP en memoria. Los baldes inactivos se descartan.
- La descarga del documento (HU19) no cuenta para el límite, porque solo responde con un token válido de 256 bits.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 5 | RF37, RF40 |

## HU21: Comprobar la autenticidad del documento

**Como** sistema, **quiero** comprobar la autenticidad comparando el documento almacenado con su registro en la blockchain, **para** entregar un resultado confiable.

**Contexto**

Cada documento firmado está registrado en el contrato `RegistroDocumentos` (HU11): ahí están el hash SHA-256 de su PDF, el HMAC del DNI del beneficiario y la fecha del bloque. El PDF está guardado en el IPFS privado (HU17). Si se anuló, también lo dice el contrato (HU29), y si se reemplazó, el contrato sabe por cuál (HU30).

Esta historia construye la comprobación que usará el portal público. Con el QR (HU19) y con el código de verificación (HU20), el portal le pide el resultado al servidor, y el servidor lo decide así:

| Paso | Qué se comprueba | Si falla |
|---|---|---|
| 1 | El token del QR corresponde a un documento firmado o anulado de la plataforma | No válido |
| 2 | El contrato tiene registrado ese código (consulta de solo lectura) | No válido |
| 3 | El PDF guardado en IPFS se descarga y se recalcula su SHA-256. Debe ser igual al hash registrado en el contrato | No válido |
| 4 | El HMAC del DNI guardado en la plataforma es igual al registrado en el contrato | No válido |
| 5 | El contrato dice si el documento está anulado y, si lo está, si tiene una versión corregida | Anulado |

Si todo coincide y no está anulado, el resultado es **Válido**. La blockchain es la fuente de verdad (RNF10): si el contrato y la base no coinciden, manda el contrato.

**Criterios de aceptación**

Los cuatro primeros son los de la Tabla 20 de la tesis. Los demás detallan cómo se cumplen.

- [ ] La consulta al smart contract es de solo lectura.
  - Usa `consultar`, `anulacion` y `reemplazadoPor`.
  - Ninguna verificación envía transacciones ni necesita billetera.
- [ ] Se recalcula el hash del PDF y se compara con el registrado.
  - Se calcula el SHA-256 de los bytes del PDF recuperado de IPFS por su CID y se compara con el hash del contrato.
  - Además se compara el HMAC del DNI.
- [ ] El resultado es **Válido**, **Anulado** o **No válido**.
- [ ] En un documento anulado se informa la fecha y si existe una versión corregida.
  - La fecha es la del bloque de la anulación.
  - La versión corregida se informa **sin revelar su código** (RF41): "Existe una versión corregida de este documento."
- [ ] Un resultado Válido o Anulado entrega lo que el portal muestra:
  - el tipo de documento y el nombre del titular;
  - la fecha de emisión, que es la del bloque del registro (RF32);
  - el estado.
  
  Nunca entrega el DNI, el HMAC, el CID ni datos internos.
- [ ] Un resultado No válido no entrega ningún dato del documento, solo "No encontramos un documento válido con estos datos." El motivo exacto (no registrado, hash distinto, HMAC distinto) queda en el registro del servidor, para el equipo.
- [ ] Si la blockchain o IPFS no responden, el resultado no es "No válido". Se informa "No se pudo verificar el documento en este momento. Intente nuevamente en unos minutos." (503).
- [ ] La comprobación responde en menos de dos segundos (RNF01).
- [ ] La API es pública, sin sesión: `GET /api/verificacion/{token}`. Un token con formato inválido responde No válido sin consultar la blockchain.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| El portal público, la ruta del QR y el documento completo | HU19 |
| Verificar con el código de verificación, y el límite de 10 consultas por minuto por IP (RNF04) | HU20 |
| Registrar cada consulta para la auditoría | HU24 (Sprint 6) |

**Notas técnicas**

- Nuevo servicio `VerificacionDeAutenticidad`, que usan HU19 y HU20.
- `ContratoRegistro` gana tres lecturas: el registro de un código, la fecha de su anulación y el código que lo reemplaza.
- El PDF se recupera con `AlmacenDeArchivos.recuperar(cid)` (HU17).

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 5 | RF38, RF41 |
