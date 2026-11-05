# Evidencia HU20: Verificar mediante el código de verificación (DRA-33)

**Prueba de punta a punta real** del 05/11/2026. Recorre, sin simulaciones:
- celulares emulados (Pixel 7, Playwright) sin sesión, cada uno con su propia IP;
- el portal público, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local.

La prueba del Sprint 5 ([`plataforma/e2e/sprint5.cjs`](../../../../plataforma/e2e/sprint5.cjs)) recorre HU21, HU19 y HU20. Resultado en [`resultado.txt`](resultado.txt): **17 de 17 pasos correctos**, 3 de ellos de HU20.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu20_01_valido_con_codigo.png` | La portada con el código escrito en minúsculas y con espacios, ya corregido a `DRA-2026-…`. El resultado "Documento válido" con el tipo, el titular, la fecha de emisión y "Vigente". **Sin el documento**: "Para ver el documento completo, escanee su código QR." | Solo tipo, titular, fecha y estado |
| `hu20_02_formato_invalido.png` | "Ingrese el código tal como aparece en el documento, por ejemplo DRA-2026-F8R2MA." junto al campo, sin consultar al servidor | Se valida el formato |
| `hu20_03_anulado_con_codigo.png` | Un documento anulado, consultado con su código: "Documento anulado" con la fecha de anulación | RF41 |
| [`hu20_04_demasiadas_consultas.json`](hu20_04_demasiadas_consultas.json) | La consulta 11 dentro del minuto: 429, `Retry-After: 60` y el mensaje | Límite por IP |
| `hu20_05_demasiadas_consultas.png` | La misma pantalla, con el aviso "Hizo demasiadas consultas en poco tiempo…" | Límite por IP |
| [`hu20_tiempo_valido.txt`](hu20_tiempo_valido.txt) | **125 ms** desde que se pulsa "Verificar" hasta que se ve el resultado | Menos de dos segundos |

## Qué comprueba la prueba

1. **Código escrito de otra forma.**
   - El código de un documento válido, en minúsculas y con espacios en vez de guiones, se acepta y el campo queda con el formato correcto.
   - El resultado tiene solo el tipo, el titular, la fecha de emisión (la del bloque, en hora de Lima) y "Vigente".
   - No hay documento ni visor en la página.
2. **Formato inválido.**
   - Un código con un carácter que el formato excluye (`0`) se señala junto al campo.
   - El navegador **no hace ninguna consulta** al servidor.
3. **Anulado.** Con el código se informa la fecha de la anulación.
4. **Límite por IP.**
   - Un visitante nuevo hace 10 consultas en el mismo minuto, alternando código y QR, y todas responden 200.
   - La 11.ª, con el código o con el QR, responde 429 con `Retry-After`, y la pantalla lo informa.
   - Otro visitante sigue consultando con normalidad.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/verificacion/VerificacionPorCodigoTest.java` | 3:<ul><li>con el código (también en minúsculas, con espacios o sin guiones) se entregan solo los datos básicos, y no hay documento;</li><li>un código mal formado o inexistente es No válido, y uno anulado informa su fecha;</li><li>cada IP tiene 10 consultas por minuto entre código y QR; la siguiente recibe 429 y otra IP no se ve afectada.</li></ul> |
| Portal | `plataforma/portal/src/Codigo.test.tsx` | 4:<ul><li>la lectura del código;</li><li>el formato inválido sin consultar;</li><li>solo los datos básicos, sin documento;</li><li>el aviso de demasiadas consultas.</li></ul> |
| Portal | `App.test.tsx` | 1 nueva: cada visita consulta una sola vez, aunque React monte la página dos veces |

## Ajustes durante la verificación

- **Cada visita contaba dos veces.** En modo desarrollo, React monta cada página dos veces (modo estricto), y el portal hacía dos consultas por visita. Así, el límite de 10 por minuto se agotaba en 5 visitas: lo descubrió la prueba de punta a punta, porque "Intentar nuevamente" recibía 429. Ahora el portal reutiliza la consulta que ya está en curso, y una prueba automática lo comprueba.
- **La IP del visitante.**
  - El backend toma `X-Forwarded-For` solo cuando la petición viene de un proxy de confianza: la red interna o el propio servidor, en este caso el proxy del portal (`xfwd`).
  - Así, en producción un visitante no puede inventarse otra IP.
  - En la prueba, cada celular emulado declara su propia IP con esa cabecera, como lo haría el proxy de AWS.
- **Scripts de prueba:**
  - el paso de la portada de HU19 contaba cero campos, y ahora la portada tiene el del código: ahora comprueba que no hay campo de contraseña;
  - una prueba automática enviaba los espacios del código codificados dos veces;
  - el paso del límite usaba dos IP a la vez.
