# Evidencia HU22: Buscar documentos (DRA-35)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright) con las cuentas creadas desde la pantalla Usuarios;
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local, donde se firman y se anulan los documentos con la billetera del Director.

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) prepara documentos en todos los estados y recorre HU22. Resultado en [`resultado.txt`](resultado.txt): **10 de 10 pasos correctos**, 7 de ellos de HU22.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos; Sprint 4, 32 de 32 pasos; Sprint 5, 17 de 17 pasos.

**Datos de la prueba:** el Área de Administración envía cuatro Certificados de Trabajo y el Área de Capacitación, un lote de 3 certificados. El Director firma dos, rechaza uno y anula uno directamente en el contrato. Quedan:

| Documento | Estado |
|---|---|
| Lucía Paredes Quinto | Firmado |
| Kevin Ramos Ccanto | Anulado (en la blockchain) |
| Martha Rojas Inga | Rechazado |
| Nilo Huamán Soto | Pendiente |
| Lote 2026-001: Juan Ccori Pari, María Elena Rojas Soto y Edwin Quispe Huamán | Pendiente |

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu22_01_mas_recientes.png` | La pantalla al abrirla: los documentos de las dos áreas, del más reciente al más antiguo, cada uno con su estado. El lote ocupa una fila plegada con "3 certificados" | Sin texto, los más recientes |
| `hu22_02_nombre_parcial.png` | "huaman" (sin tilde) encuentra a Nilo Huamán Soto y, dentro del lote ya desplegado, a Edwin Quispe Huamán, con "1 de 3 coinciden con la búsqueda" | Coincidencias parciales; los lotes se despliegan |
| `hu22_03_por_expediente.png` | "exp-2026-005401" en minúsculas encuentra el documento de Martha Rojas Inga | Búsqueda por expediente |
| `hu22_04_lote_plegado.png` | El número "2026-001" muestra el lote plegado | Búsqueda por lote |
| `hu22_05_lote_desplegado.png` | El mismo lote, desplegado en sus 3 certificados | Los lotes se despliegan en sus certificados |
| `hu22_06_en_tramite.png` | El filtro En trámite: el lote y el documento de Nilo, sin los firmados, anulados ni rechazados | Filtros por estado |
| `hu22_07_sin_resultados.png` | "No se encontraron documentos con «Nadie Conestenombre». Revise lo que escribió o busque por otro dato." | Mensaje sin resultados |
| `hu22_08_un_caracter.png` | Con una sola letra: "Escriba al menos 2 caracteres." | Mínimo de 2 caracteres |

## Qué comprueba la prueba

1. **Apertura.**
   - El menú de Consulta interna tiene Inicio y Buscar documentos, sin el aviso "Se habilita en el Sprint 6".
   - Sin texto se ven los documentos de las dos áreas, del más reciente al más antiguo, con su estado: Firmado, Anulado, Rechazado y Pendiente.
   - Cada fila muestra el código, el tipo, el beneficiario y su DNI, el expediente, el área y la fecha de envío.
   - La columna Estado se ve completa a 1280 px, sin desplazar la tabla.
2. **Por nombre.**
   - "huaman", sin tilde, encuentra a Huamán.
   - "SOTO nilo" encuentra solo a Nilo Huamán Soto: deben aparecer todas las palabras, en cualquier orden y sin importar las mayúsculas.
   - "quint" encuentra a Lucía Paredes Quinto.
   - Si coincide solo un certificado de un lote, el lote aparece desplegado con ese certificado y la nota "1 de 3 coinciden con la búsqueda".
3. **Por DNI, código y expediente.**
   - El DNI completo encuentra un solo documento.
   - El código en minúsculas y con espacios en vez de guiones, o solo sus 6 caracteres finales, encuentra el documento anulado.
   - El expediente completo en minúsculas, o solo una parte ("005402"), encuentra su documento.
4. **Por lote.**
   - "2026-001" muestra el lote plegado.
   - Al desplegarlo aparecen sus 3 certificados.
   - El DNI de un certificado muestra el lote solo con ese certificado.
5. **Filtros.**
   - Firmados, Anulados, Rechazados y En trámite muestran solo los documentos de ese estado.
   - Con el texto "rojas", En trámite muestra solo el certificado del lote (María Elena Rojas Soto), y Todos suma a Martha Rojas Inga, que está rechazada.
6. **Sin resultados y texto corto.** El mensaje sin resultados, sin tabla, y el aviso con un solo carácter.
7. **Permisos.**
   - El Área encargada y el Director no ven la opción en el menú, y la API les responde 403.
   - Sin sesión responde 401.
   - El servidor también rechaza un texto de un carácter (400).

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/BuscarDocumentosTest.java` | 10:<ul><li>nombre parcial, sin tildes y en cualquier orden;</li><li>DNI, código y expediente completos o parciales;</li><li>el número de lote muestra el lote completo en una fila;</li><li>un DNI de un lote muestra el lote solo con ese certificado;</li><li>sin resultados, y los comodines `%` y `_` se buscan como texto;</li><li>sin texto, los más recientes primero;</li><li>hasta 50 filas, con el aviso de que hay más;</li><li>los filtros por estado;</li><li>un solo carácter responde 400;</li><li>solo Consulta interna puede buscar (401 y 403).</li></ul> |
| Frontend | `plataforma/frontend/src/consulta/Busqueda.test.tsx` | 9:<ul><li>los datos y el estado de cada resultado;</li><li>la espera hasta que se deja de escribir;</li><li>el aviso de 2 caracteres sin consultar;</li><li>el mensaje sin resultados;</li><li>los filtros;</li><li>el lote plegado que se despliega;</li><li>el lote desplegado si coinciden solo algunos certificados;</li><li>el aviso de más de 50 resultados;</li><li>el error del servidor.</li></ul> |
| Frontend | `App.test.tsx` | 1 cambiada: Mesa de Partes entra a Buscar documentos desde el menú, sin el aviso del sprint |

## Ajustes durante la verificación

- **La columna Estado quedaba fuera de la vista.** En la primera ejecución de la prueba, a 1280 px la tabla tenía nueve columnas y el estado solo se veía desplazándola.
  - Primero llevé el DNI debajo del nombre del beneficiario, pero la prueba siguió fallando: el área de contenido mide 976 px.
  - Luego reduje el texto de la tabla (`text-sm`), el relleno de las celdas y la sangría de los certificados de un lote. Lo medí en el navegador con el estado más largo ("Procesando firma") y la tabla cabe sin desplazarse.
  - La prueba de punta a punta ahora comprueba que la columna Estado se ve completa.
- **Compilador de Solidity sin red:** como en sprints anteriores, la prueba se corrió con `SOLC_RUTA`, porque Hardhat no pudo descargar el compilador.
