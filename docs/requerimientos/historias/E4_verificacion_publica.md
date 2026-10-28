# E4: Verificación pública de autenticidad

**Objetivo:** Permitir que cualquier tercero compruebe la autenticidad de un documento en segundos.
**Requerimientos:** RF36–RF41 · **Sprint:** 5 · **Fuente:** Tabla 20 de la tesis.

---

## HU19: Verificar mediante el código QR

**Como** entidad externa, **quiero** escanear el código QR de un documento, **para** comprobar su autenticidad y ver el documento completo.

**Criterios de aceptación**
- [ ] No se requiere registro.
- [ ] El resultado se muestra en menos de dos segundos.
- [ ] Si el documento es válido, se muestra completo.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 5 | 5 | RF37, RF39 |

## HU20: Verificar mediante el código de verificación

**Como** entidad externa, **quiero** ingresar el código de verificación de un documento, **para** comprobar su autenticidad cuando no puedo escanear el código QR.

**Criterios de aceptación**
- [ ] Se valida el formato del código.
- [ ] Se muestran solo el tipo de documento, el nombre del titular, la fecha de emisión y el estado.
- [ ] Se limita el número de consultas por dirección IP.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 3 | 5 | RF37, RF40 |

## HU21: Comprobar la autenticidad del documento

**Como** sistema, **quiero** comprobar la autenticidad comparando el documento almacenado con su registro en la blockchain, **para** entregar un resultado confiable.

**Criterios de aceptación**
- [ ] La consulta al smart contract es de solo lectura.
- [ ] Se recalcula el hash del PDF y se compara con el registrado.
- [ ] El resultado es Válido, Anulado o No válido.
- [ ] En un documento anulado se informa la fecha y si existe una versión corregida.

| Prioridad | Puntos | Sprint | RF |
|---|---|---|---|
| Alta | 8 | 5 | RF38, RF41 |
