# Traspaso para Claude (lectura obligatoria al empezar una sesión)

Tesis: "Plataforma con Blockchain para la emisión y verificación de documentos – DRA Satipo". El usuario es Garyn Fernando Huarhuachi Ramos (equipo de desarrollo). **Todo se escribe en español**, en primera persona en Jira y en lenguaje claro en las pantallas.

## Dónde está todo

- **Código:** `plataforma/` con:
  - `backend`: Spring Boot 4.1, Java 21, Flyway V1–V28;
  - `frontend`: plataforma interna, React 19 + Vite, puerto 5173;
  - `portal`: portal público de verificación, puerto 5174;
  - `contracts`: Hardhat, `RegistroDocumentos.sol`;
  - `infra`: Besu QBFT con 4 nodos e IPFS privado;
  - `e2e`: pruebas de punta a punta con Playwright.
- **Requisitos e historias:** `docs/requerimientos/` (`historias_de_usuario.md`, `historias/E*.md`, `backlog.md`, `jira.md` con el calendario y el avance).
- **Revisiones de sprint:** `docs/scrum/sprint-N/` (`revision.md` con el acta, `guion-de-pruebas.md` para el PO). Guion de punta a punta en QA: `docs/scrum/qa/guion-de-pruebas-qa.md` (DRA-57).
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
6. **Push** y esperar la CI con los **7 jobs** en verde. **Las cantidades de pruebas se toman del registro de la CI** (`gh run view <id> --log`), nunca se calculan a mano: ya hubo que corregir cifras inventadas.
7. **Registrar** la ejecución en `integracion-continua.md`, en un commit aparte.
8. **Fusionar** a `main` con fast-forward y hacer push.
9. **Jira:** comentario detallado en primera persona (qué construí, cómo lo probé, decisiones a validar, lo que queda fuera, ajustes) y transición a **En revisión** (31).
10. **Informar** al usuario en español y preguntar "¿Ok para continuar con la HUxx?".

**El repositorio es público** desde el 08/11/2026: los minutos de GitHub Actions son gratuitos. Antes era privado y se agotaron los 2 000 minutos del mes. **Nunca subir claves, contraseñas reales ni datos personales reales.**

Commits con las líneas de coautoría que indique la sesión. Mantener el costo mínimo en AWS: QA se enciende solo cuando se usa.

**Tickets para cambios:** cada cambio va en un ticket.
- Si corrige o amplía una historia, el ticket nuevo se enlaza a su HU original (las historias cerradas no se reabren).
- Si no corresponde a ninguna historia, va en un ticket independiente.
- Un cambio menor (redacción, un ajuste de estilo, una dependencia) puede ir sin ticket, a criterio del equipo, citándolo en el commit.

## Estado al 11/11/2026

| Sprint | Estado |
|---|---|
| 0–2 | Cerrados y aprobados por el PO (47 puntos) |
| 3 (HU10–12, HU16–18), 4 (HU13–15, HU29–30) y 5 (HU19–21) | Cerrados **sin la validación del PO**, por decisión del equipo: el 3 y el 4 el 05/11 (74 puntos), el 5 el 07/11 (16 puntos) |
| 6 (HU22–28) | Cerrado el 08/11 **sin la validación del PO** (19 puntos). Con él están cerradas las 30 historias del backlog: **156 de 156 puntos** |
| 7 (DRA-58 a DRA-62, fuera del backlog original) | Cerrado el 11/11 **sin la validación del PO** (16 puntos): nombres de roles, áreas y tipos configurables, Mesa de Partes de área y vigencia opcional. Acta en `docs/scrum/sprint-7/revision.md` |

**Lo siguiente:** no quedan historias del backlog original por construir. **QA en AWS (DRA-44) se cerró el 11/11/2026.** Quedan en Jira:
- la **validación final del PO (DRA-48)**, con los guiones de los Sprints 3 a 7 (`docs/scrum/sprint-N/guion-de-pruebas.md`), que se hará en la reunión con el negocio (material en `docs/negocio/flujos-del-sistema.md` y `presentacion/video-presentacion.mp4`);
- **DRA-63** (spike: seguridad de la billetera del Director), sin construir. Las propuestas DRA-58 a DRA-62 se construyeron en el Sprint 7;
- **DRA-65 (PROD en AWS)**, a la espera del dominio y el alcance;
- **requisitos antes de PROD** (12/11/2026, etiqueta `antes-de-prod`): DRA-66 (respaldos, solo PROD), DRA-67 (datos personales, **en espera** del área legal), DRA-68 (monitoreo y alertas) y DRA-69 (manuales, **en espera** de definición). Distribuir los validadores de Besu en instituciones distintas queda como **trabajo futuro**, sin ticket: lo menciona la tesis.

Cada observación del PO se registra como un ticket nuevo y se construye con el flujo de siempre. También falta actualizar la Tabla 26 de la tesis con el calendario de `jira.md`.

**Validación del PO:** se hace **al final del proyecto** (DRA-48, en el backlog), con los guiones de los Sprints 3 a 7. Cada observación del PO se registra como un **ticket nuevo**; las historias cerradas no se reabren.

**Pendientes conocidos:**
- PROD en AWS (DRA-65): alcance y dominio por definir (saldrá de la misma plantilla de QA);
- la clave temporal de AWS `claude-sesion` (permisos de administrador, usada para preparar QA) sigue activa: eliminarla cuando ya no se necesite. Sin ticket, por decisión del equipo;
- **Dependabot** (DRA-49) propone actualizaciones cada lunes: se revisan con la CI y, si tocan el PDF, el QR o el portal, con las pruebas de punta a punta. Su `package-lock.json` a veces viene desincronizado: se regenera con `npm install`. Pospuestas hasta después de la validación del PO (DRA-50): **OpenPDF 3** (cambia el nombre de los paquetes, `com.lowagie` → hay que migrar `GeneradorDePdf`), **Apache POI 6** y **TypeScript 7** en los contratos;
- preguntas abiertas al PO, listadas en cada `revision.md`.

## Ambiente QA en AWS (DRA-44, cerrado el 11/11/2026)

Subtareas, todas cerradas: DRA-51 (Terraform), DRA-52 (disparadores), DRA-53 (presupuesto y cuenta), DRA-54 (CloudFront y HTTPS), DRA-55 (región us-east-2), DRA-56 (acceso con usuario de IAM), DRA-57 (guion de QA) y DRA-64 (apagado fuera de horario).

- **Diseño:** escenario A de `docs/arquitectura/estimacion-costos-aws.md`, en **us-east-2 (Ohio)**.
  - La cuenta es de la **experiencia nueva de AWS** (AWS Builder ID, sin usuario raíz), **en el plan de pago** desde el 08/11/2026: el plan gratuito no permite el t4g.medium (DRA-56). La región la fija AWS por el país: no se puede elegir otra sin activar las funciones avanzadas (DRA-55).
  - Un solo EC2 t4g.medium (tamaño en una variable, créditos de CPU `unlimited`) con el mismo `docker compose` de local, detrás de nginx en el puerto 80.
  - Frontend y portal en S3, detrás de **dos distribuciones de CloudFront** con direcciones `*.cloudfront.net` fijas y HTTPS.
    - **Plataforma:** `/*` va a S3; `/api/*` y `/rpc` (Besu, para MetaMask) van al EC2.
    - **Portal:** `/*` va a S3; `/api/verificacion/*` va al EC2.
  - **QA encendido desde el 08/11/2026:** plataforma https://d1px0ea1324c4y.cloudfront.net, portal https://d3u5jxvc0sbgm7.cloudfront.net (las direcciones cambian solo si se ejecuta QA – Destruir).
  - **Sin dominio propio en QA**, a propósito: no se sabe cuál querrá la DRA. Las direcciones fijas evitan que los QR de QA se rompan.
- **Sin IP elástica, balanceador ni RDS.** Secretos en Parameter Store (SecureString). Estado de Terraform en S3.
- **Disparadores** (GitHub Actions, a mano):
  - **QA – Encender:** levanta todo y publica la última versión de `main`.
  - **QA – Apagar:** detiene el EC2 y **conserva los datos**. Después deja CloudFront apuntando a un origen que no responde, para que el encabezado secreto no viaje a una IP reasignada.
  - **QA – Destruir:** borra todo y pide escribir `DESTRUIR-QA`.
  - **Apagado automático** a las 00:17 de Lima. GitHub puede ejecutarlo horas tarde (llegó a las 08:13): fuera de la madrugada (desde las 06:00) no apaga nada (DRA-64). GitHub desactiva los flujos programados tras 60 días sin actividad en el repositorio.
- **Archivos:** los flujos están en `.github/workflows/qa-*.yml` y sus scripts en `plataforma/infra/aws/acciones/`, que se prueban con un `aws` simulado (`probar-acciones.sh`).
  - El contrato de QA se despliega por `/rpc` la primera vez.
  - Sus billeteras de prueba quedan en `/dra-satipo/qa-billeteras/`, fuera del alcance del servidor.
- **Acceso (DRA-56):** la política de AWS de esta cuenta prohíbe el proveedor OIDC (`iam:*Provider*`). GitHub entra con el usuario de IAM `dra-satipo-github-qa`, cuya clave está **solo** en los secretos del ambiente `qa` de GitHub (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) y se cambia cada 90 días (guía, sección 8). **Nunca va en el repositorio.**
- **Cuenta:** se prepara una sola vez con `plataforma/infra/aws/cuenta/cuenta.yml` (CloudFormation): usuario de IAM para GitHub, bucket del estado y presupuesto. Guía para el dueño de la cuenta: `docs/arquitectura/despliegue-aws.md`. GitHub necesita el ambiente `qa`, sin revisores obligatorios y limitado a `main`, con los secretos de la clave y la variable `TF_ESTADO_BUCKET`.
- **Costo:** AWS Budgets avisa a $10, $25 y $50 (créditos sin descontar). Estimado: unos $11–14 al mes con QA encendido 10 h × 22 días y unos $2–3 al mes apagado. Hay $100 de crédito, que vence el próximo año.
- **PROD (DRA-65):** alcance por definir. Sale de la misma plantilla, con el dominio de la DRA y un certificado de ACM en las mismas distribuciones.

## Entorno de pruebas (lo que hay que saber)

- `cd plataforma && ./e2e/levantar.sh` levanta un entorno limpio:
  - PostgreSQL en el 5433 y un IPFS nuevo (API en el 5002, pasarela en el 8082);
  - la red Besu, si no está corriendo, con un contrato recién desplegado;
  - el backend en el 8080, el frontend en el 5173 y el portal en el 5174.
- Modo de prueba: sesión de 1 minuto, sincronización cada 3 s y plazo de firma de 2 minutos. Con `demo`: sesión de 30 minutos, sincronización cada 30 s y plazo de 15 minutos.
- Para el celular del PO: `PLATAFORMA_PORTAL_URL=http://<IP>:5174 ./e2e/levantar.sh demo`.
- `./e2e/ver-registro.sh [código]` muestra los documentos firmados y anulados, su CID y su transacción, o el historial de un documento.
- `./e2e/regresion.sh N` corre la prueba del Sprint N en un entorno limpio.
- `infra/aws/pruebas/de-punta-a-punta.sh "1 2 3"` corre esas mismas pruebas contra el **servidor de AWS en Docker**, detrás de un CloudFront simulado (DRA-54). Antes hay que detener la red Besu de desarrollo, que usa la misma subred.
- **Requisitos:** Docker con la red Besu (`plataforma/infra`), Java 21 y Node 22. Playwright se resuelve con `NODE_PATH=$(npm root -g)`.
- **Problemas vistos en la nube:**
  - Docker se cae cuando la máquina se reinicia: `rm -f /var/run/docker.pid; dockerd &`. Los contenedores de Besu vuelven solos.
  - Maven puede necesitar un *mirror* de Maven Central si falla la descarga: `-s settings.xml` con `https://maven-central.storage-download.googleapis.com/maven2`.
  - Hardhat necesita `SOLC_RUTA` (el `soljson.js` de un paquete `solc` local) si no puede descargar el compilador: `npm i solc@0.8.30` en una carpeta aparte.
  - El clon de la sesión solo sigue `main`: para enlazar una rama nueva, `git config --add remote.origin.fetch '+refs/heads/RAMA:refs/remotes/origin/RAMA'`.
  - Node resuelve `localhost` a IPv6: en los scripts, usar `127.0.0.1` para IPFS.
- **Billeteras:** el servidor nunca firma. La billetera del Director firma en el navegador; en las pruebas lo hace `e2e/billetera-de-prueba.cjs`, con transacciones reales.

## Convenciones del código

- Cada cambio de estado de un documento es una sola sentencia `UPDATE … WHERE estado = X`.
- El servidor solo marca algo como firmado o anulado después de leer la transacción en la blockchain. La blockchain manda (RNF10).
- **Nombres de los roles (DRA-59):** en pantalla, "Emisor de área" (código `AREA_ENCARGADA`, "Área encargada" en la tesis) y "Mesa de Partes" (código `CONSULTA_INTERNA`, "Consulta interna" en la tesis). Las historias HU01–HU30 conservan los nombres de la tesis. **DRA-58** agrega "Mesa de Partes de área" (`MESA_PARTES_AREA`): Mesa de Partes limitada a su área. Qué roles exigen área y solo ven lo de ella lo decide `rol.limitado_al_area`, no el código del rol.
- **Vigencia (DRA-62):** la fecha "Válido hasta" va impresa en el PDF (opción A, sin cambiar el contrato). La verificación la contrasta con `documento.vence_en`. "Vencido" se calcula con el `Clock` de Lima (`RelojConfig`); en las pruebas se adelanta con `RelojDePrueba`.
- JPQL con las constantes de enum calificadas (`DocumentoRepository.PENDIENTE`, …).
- Pruebas del backend con Testcontainers: Postgres 17 y un Kubo real (`IpfsDePrueba`). El contrato se simula con `ContratoFalso`; las ayudas están en `DocumentosDePrueba`.
