# Traspaso para Claude (lectura obligatoria al empezar una sesión)

Tesis: "Plataforma con Blockchain para la emisión y verificación de documentos – DRA Satipo". El usuario es Garyn Fernando Huarhuachi Ramos (equipo de desarrollo). **Todo se escribe en español**, en primera persona en Jira y en lenguaje claro en las pantallas.

## Dónde está todo

- **Código:** `plataforma/` con:
  - `backend`: Spring Boot 4.1, Java 21, Flyway V1–V20;
  - `frontend`: plataforma interna, React 19 + Vite, puerto 5173;
  - `portal`: portal público de verificación, puerto 5174;
  - `contracts`: Hardhat, `RegistroDocumentos.sol`;
  - `infra`: Besu QBFT con 4 nodos e IPFS privado;
  - `e2e`: pruebas de punta a punta con Playwright.
- **Requisitos e historias:** `docs/requerimientos/` (`historias_de_usuario.md`, `historias/E*.md`, `backlog.md`, `jira.md` con el calendario y el avance).
- **Revisiones de sprint:** `docs/scrum/sprint-N/` (`revision.md` con el acta, `guion-de-pruebas.md` para el PO).
- **Evidencia por historia:** `docs/evidencias/sprint-N/HUxx/README.md`, con capturas.
- **CI registrada:** `docs/arquitectura/integracion-continua.md`, una fila por ejecución.
- **Jira:** sitio dra-satipo.atlassian.net, proyecto DRA, cloudId `6de7c55f-9533-45fa-b0ad-c558ee6a556b`, tablero 1.
  - Transiciones: 21 = En curso, 31 = En revisión, 41 = Listo.
  - Los puntos están en el campo "Story point estimate".

## Flujo por historia (siempre igual)

1. **Refinar.** Escribir contexto, criterios detallados, fuera del alcance y notas técnicas en `historias/E*.md` y en `historias_de_usuario.md`. Copiar la descripción al ticket de Jira y pasarlo a **En curso** (21). Mostrar las decisiones tomadas para que el PO las valide.
2. **Rama** `DRA-NN-descripcion`. La CI solo corre en `main` y en ramas `DRA-*`.
3. **Construir** el backend, el frontend y el portal con sus pruebas.
   - Backend: `./mvnw spotless:apply verify`.
   - Frontend y portal: `npx prettier --write src`, `npm run lint`, `npx vitest run`, `npm run build`.
4. **Prueba de punta a punta** del sprint en un entorno limpio (`plataforma/e2e/sprintN.cjs`, con `./e2e/regresion.sh N`), y regresión de los sprints anteriores.
5. **Evidencia** en `docs/evidencias/sprint-N/HUxx/README.md`, con capturas, qué se comprueba, pruebas automáticas y ajustes encontrados.
6. **Push** y esperar la CI con los **6 jobs** en verde. **Las cantidades de pruebas se toman del registro de la CI** (`gh run view <id> --log`), nunca se calculan a mano: ya hubo que corregir cifras inventadas.
7. **Registrar** la ejecución en `integracion-continua.md`, en un commit aparte.
8. **Fusionar** a `main` con fast-forward y hacer push.
9. **Jira:** comentario detallado en primera persona (qué construí, cómo lo probé, decisiones a validar, lo que queda fuera, ajustes) y transición a **En revisión** (31).
10. **Informar** al usuario en español y preguntar "¿Ok para continuar con la HUxx?".

Commits con las líneas de coautoría que indique la sesión. Mantener el costo mínimo: AWS (DRA-44) sigue diferido a propósito.

## Estado al 07/11/2026

| Sprint | Estado |
|---|---|
| 0–2 | Cerrados y aprobados por el PO (47 puntos) |
| 3 (HU10–12, HU16–18), 4 (HU13–15, HU29–30) y 5 (HU19–21) | Cerrados **sin la validación del PO**, por decisión del equipo: el 3 y el 4 el 05/11 (74 puntos), el 5 el 07/11 (16 puntos) |
| 6 (HU22–28) | Siguiente (en Jira, del 12/11 al 19/11): búsqueda, estado, historial y auditoría, descarga e impresión, avisos. Ya contiene DRA-48 (la validación final del PO) y DRA-44 (AWS, diferida) |

**Lo siguiente:** iniciar el Sprint 6 en Jira y construir sus historias con el flujo de siempre.

**Validación del PO:** se hace **al final del proyecto** (DRA-48), con los guiones de los Sprints 3 a 6. Cada observación del PO se registra como un **ticket nuevo**; las historias cerradas no se reabren.

**Pendientes conocidos:**
- DRA-44 (AWS), con el dominio del portal todavía por definir;
- preguntas abiertas al PO, listadas en cada `revision.md`.

## Entorno de pruebas (lo que hay que saber)

- `cd plataforma && ./e2e/levantar.sh` levanta un entorno limpio:
  - PostgreSQL en el 5433 y un IPFS nuevo (API en el 5002, pasarela en el 8082);
  - la red Besu, si no está corriendo, con un contrato recién desplegado;
  - el backend en el 8080, el frontend en el 5173 y el portal en el 5174.
- Modo de prueba: sesión de 1 minuto, sincronización cada 3 s y plazo de firma de 2 minutos. Con `demo`: sesión de 30 minutos, sincronización cada 30 s y plazo de 15 minutos.
- Para el celular del PO: `PLATAFORMA_PORTAL_URL=http://<IP>:5174 ./e2e/levantar.sh demo`.
- `./e2e/ver-registro.sh [código]` muestra los documentos firmados y anulados, su CID y su transacción, o el historial de un documento.
- `./e2e/regresion.sh N` corre la prueba del Sprint N en un entorno limpio.
- **Requisitos:** Docker con la red Besu (`plataforma/infra`), Java 21 y Node 22. Playwright se resuelve con `NODE_PATH=$(npm root -g)`.
- **Problemas vistos en la nube:**
  - Docker se cae cuando la máquina se reinicia: `rm -f /var/run/docker.pid; dockerd &`. Los contenedores de Besu vuelven solos.
  - Maven puede necesitar un *mirror* de Maven Central si falla la descarga: `-s settings.xml` con `https://maven-central.storage-download.googleapis.com/maven2`.
  - Hardhat necesita `SOLC_RUTA` (el `soljson.js` de un paquete `solc` local) si no puede descargar el compilador.
  - Node resuelve `localhost` a IPv6: en los scripts, usar `127.0.0.1` para IPFS.
- **Billeteras:** el servidor nunca firma. La billetera del Director firma en el navegador; en las pruebas lo hace `e2e/billetera-de-prueba.cjs`, con transacciones reales.

## Convenciones del código

- Cada cambio de estado de un documento es una sola sentencia `UPDATE … WHERE estado = X`.
- El servidor solo marca algo como firmado o anulado después de leer la transacción en la blockchain. La blockchain manda (RNF10).
- JPQL con las constantes de enum calificadas (`DocumentoRepository.PENDIENTE`, …).
- Pruebas del backend con Testcontainers: Postgres 17 y un Kubo real (`IpfsDePrueba`). El contrato se simula con `ContratoFalso`; las ayudas están en `DocumentosDePrueba`.
