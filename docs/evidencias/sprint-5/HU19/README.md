# Evidencia HU19: Verificar mediante el código QR (DRA-32)

**Prueba de punta a punta real** del 05/11/2026. Recorre, sin simulaciones:
- un celular emulado (Pixel 7, Playwright) sin sesión ni billetera, como quien escanea el QR;
- el portal público nuevo (`plataforma/portal`, puerto 5174), el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local (QBFT, 4 nodos).

La prueba del Sprint 5 ([`plataforma/e2e/sprint5.cjs`](../../../../plataforma/e2e/sprint5.cjs)) recorre HU21 y HU19. Resultado en [`resultado.txt`](resultado.txt): **14 de 14 pasos correctos**, 5 de ellos de HU19.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu19_01_portada_celular.png` | La portada en el celular: "Verifique un documento" y los tres pasos con el QR, sin campos ni inicio de sesión | No se requiere registro |
| `hu19_02_valido_celular.png` | "Documento válido": tipo, titular, fecha de emisión con el mes en letras, "Vigente" y el **documento completo** dibujado en la página | Si es válido, se muestra completo |
| `hu19_03_valido_escritorio.png` | Lo mismo en la computadora, con el certificado completo (QR y código incluidos) y los botones "Abrir el documento" y "Descargar PDF" | Se adapta a la computadora |
| `hu19_04_anulado_celular.png` | "Documento anulado" con la fecha de anulación y "Existe una versión corregida de este documento…", sin el documento ni el código nuevo | RF41 |
| `hu19_05_no_valido_celular.png` | "Documento no válido", sin datos ni documento | — |
| `hu19_06_no_disponible_celular.png` | Con IPFS detenido: "No se pudo verificar el documento en este momento…" y "Intentar nuevamente" | — |
| [`hu19_tiempo_valido.txt`](hu19_tiempo_valido.txt) | **226 ms** desde que se abre el enlace del QR hasta que se ve el resultado | Menos de dos segundos |

## Qué comprueba la prueba

1. **Portada.** Se abre sin sesión: no hay campos ni cookies.
2. **Válido.**
   - El enlace del QR (`/verificar/{token}`) muestra "Documento válido" en 226 ms.
   - Muestra el tipo, el titular, la fecha de emisión y "Vigente". La fecha es la del bloque leída del nodo, en hora de Lima.
   - El documento queda dibujado en la página.
   - El PDF que entrega el portal es el que está en la blockchain: su SHA-256 es el hash de `consultar`.
3. **Reemplazado.**
   - Muestra "Documento anulado" con la fecha y la versión corregida, sin el documento.
   - La página no contiene el código de la reemisión.
   - El documento responde 404.
4. **No válido.** Un documento Pendiente y un enlace alterado se ven No válidos, sin datos ni documento.
5. **No disponible.** Con IPFS detenido se ve el aviso. Al volver a encenderlo, "Intentar nuevamente" muestra el documento válido.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Portal | `plataforma/portal/src/App.test.tsx` | 6:<ul><li>la ruta del QR;</li><li>la portada sin registro;</li><li>válido, con sus datos y el documento;</li><li>anulado, con la versión corregida y sin documento;</li><li>no válido;</li><li>no disponible, con "Intentar nuevamente".</li></ul> |
| Backend | `VerificacionDeAutenticidadTest.java` | 1 nueva: el documento solo se entrega si es válido, sin caché, y es el PDF del hash registrado |

Totales:
- backend: 192 pruebas;
- portal: 6 pruebas;
- frontend: 130 pruebas.

## Ajustes durante la verificación

- **El documento no se veía.** La primera versión mostraba el PDF en un `iframe`. En la captura salió en blanco: el Chromium de la prueba no tiene visor de PDF, y tampoco lo tienen los navegadores de celular como Chrome en Android, que es justo donde se escanea el QR.
  - Ahora el portal dibuja el PDF con **pdf.js** en la página, y conserva los botones para abrirlo o descargarlo.
  - pdf.js se descarga solo cuando el documento es válido (130 kB comprimido más su *worker*).
- **Marcos del mismo origen.** Spring Security enviaba `X-Frame-Options: DENY`. Ahora es `SAMEORIGIN`, para que el portal pueda mostrar sus propios recursos.
