# Evidencia HU25: Descargar o imprimir un documento (DRA-38)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright), con una descarga real del PDF;
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local. El PDF entregado se comprueba **contra el hash registrado en el contrato**.

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) recorre HU22 a HU25 con los mismos datos (ver la [evidencia de HU22](../HU22/README.md)). Resultado en [`resultado.txt`](resultado.txt): **23 de 23 pasos correctos**, 5 de ellos de HU25.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos; Sprint 5, 17 de 17 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu25_01_listos_para_entregar.png` | El filtro nuevo "Listos para entregar": solo el documento firmado que nunca se imprimió ni descargó (la reemisión de Lucía; el original y el de Kevin están anulados) | Filtro de entrega |
| `hu25_02_listo_para_entregar.png` | La ficha: "Listo para entregar" y los botones Ver documento, Descargar PDF e Imprimir | Botones de entrega |
| `hu25_03_impreso_y_duplicado.png` | Después de descargarlo, imprimirlo y reimprimirlo: "Entregado: impreso 2 veces, descargado 1 vez" y el botón "Imprimir duplicado". En el historial: "PDF descargado", "Impreso" y "Duplicado impreso … Impresión n.° 2", con fecha, hora y responsable | Cada impresión en el historial |

## Qué comprueba la prueba

1. **Listos para entregar.**
   - El filtro muestra solo el firmado sin entregar.
   - Su ficha dice "Listo para entregar", con los tres botones.
   - "Ver documento" apunta a la dirección del PDF.
2. **Ver documento.**
   - Se abre en otra pestaña.
   - La dirección responde el PDF para ver (`inline`), y su SHA-256 es **el hash registrado en el contrato**, leído directamente del nodo Besu.
   - No se registra en el historial.
   - El Chromium sin interfaz de la prueba no muestra PDF (lo descarga), por eso el contenido se comprueba en la respuesta.
3. **Descargar PDF.**
   - Es una descarga real del navegador, con el nombre `{código}.pdf`.
   - El archivo descargado tiene el SHA-256 registrado en el contrato.
   - La ficha pasa a "Entregado: impreso 0 veces, descargado 1 vez", y el historial muestra "PDF descargado por Luz Flores Ticona (Consulta interna)".
4. **Imprimir y reimprimir.**
   - La primera impresión queda como "Impreso por …".
   - La segunda, como "Duplicado impreso por … Impresión n.° 2".
   - El PDF se carga en un marco oculto para el diálogo de impresión.
   - El historial tiene, en orden, DESCARGADO, IMPRESO e IMPRESO.
   - **El Director no envió ninguna transacción nueva** (se contaron en el nodo) y el documento sigue Firmado: no hubo una nueva firma.
   - El documento sale del filtro "Listos para entregar".
5. **Anulado y permisos.**
   - Un anulado no tiene botones de entrega, y la API responde 409 "El documento está anulado: no se puede entregar." sin registrar nada.
   - El Área encargada y el Director reciben 403 al ver, descargar o imprimir.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/EntregaDeDocumentosTest.java` | 7:<ul><li>"Ver documento" entrega el PDF registrado (`inline`, `no-store`) sin anotar nada;</li><li>cada impresión y descarga queda en el historial, con el duplicado numerado, sin cambiar la transacción, el hash ni el CID;</li><li>el filtro Listos para entregar quita los ya entregados;</li><li>solo se entrega un firmado (pendiente y anulado responden 409; la reemisión firmada sí se entrega);</li><li>un PDF que no coincide con la blockchain no se entrega (409) ni se anota;</li><li>la forma es obligatoria;</li><li>solo Consulta interna descarga o imprime (401 y 403).</li></ul> |
| Frontend | `plataforma/frontend/src/consulta/Entrega.test.tsx` | 6:<ul><li>listo para entregar y los tres botones;</li><li>imprimir pide el PDF comprobado y lo imprime;</li><li>descargar guarda el PDF con el código;</li><li>ya entregado: cuántas veces y "Imprimir duplicado";</li><li>el error de la blockchain se muestra y no imprime;</li><li>en la ficha, solo para un firmado y con el permiso.</li></ul> |
| Frontend | `Auditoria.test.tsx`, `Busqueda.test.tsx` | 1 nueva: la reimpresión se titula "Duplicado impreso". La lista de filtros incluye "Listos para entregar" |

## Ajustes durante la verificación

- **"Ver documento" en la prueba:** el Chromium sin interfaz de Playwright no muestra PDF en una pestaña, lo descarga, así que la pestaña queda sin dirección. La prueba comprueba que la pestaña se abre y que la dirección entrega el PDF para ver, con su hash.
- **El error sin mensaje:** una aserción falló sin texto, y el script ahora imprime la traza completa de cada error.
- **Título del duplicado:** en la primera captura, las dos impresiones aparecían como "Impreso". La segunda ahora se titula "Duplicado impreso".
