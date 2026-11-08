# Infraestructura en AWS (DRA-44)

Ambientes de la plataforma en AWS, descritos con Terraform. Por ahora solo **QA**; PROD saldrá de la misma plantilla cuando se defina su alcance. Diseño y costos: escenario A de [estimacion-costos-aws.md](../../../docs/arquitectura/estimacion-costos-aws.md).

## Carpetas

| Carpeta | Qué tiene |
|---|---|
| `modulos/ambiente/` | La plantilla de un ambiente completo: red, servidor, buckets y parámetros. Sus pruebas están en `tests/` (`terraform test`, sin cuenta de AWS). |
| `qa/` | El ambiente QA: usa la plantilla con los valores de QA. El estado de Terraform se guarda en un bucket S3, no en el repositorio. |
| `servidor/` | Lo que corre en el servidor: el `docker compose` de AWS, nginx y los scripts para empaquetar, desplegar y probar. |
| `pruebas/` | Solo para probar en local: un CloudFront simulado (nginx) y las pruebas de punta a punta de los sprints contra el servidor de AWS en Docker. No va en el paquete. |

## Cómo queda un ambiente

```
Internet ──HTTPS──> CloudFront ──HTTP + encabezado secreto──> EC2 (nginx :80)
                       │                                         ├─ /api  → backend (Spring Boot)
                       └─> S3 (frontend y portal)                └─ /rpc  → Besu nodo 1 (ETH, NET, WEB3)
                                                                  PostgreSQL, IPFS y Besu 2–4: solo en la red interna de Docker
```

- **Un solo EC2 ARM** (`t4g.medium` en QA, ajustable con `tipo_instancia`).
  - Disco gp3 cifrado de 20 GB.
  - Créditos de CPU `standard`, para que nunca cobre de más.
  - Corre el mismo `docker compose` de desarrollo (`infra/docker-compose.yml`) más `servidor/docker-compose.qa.yml`.
- **Sin SSH, sin IP elástica, sin balanceador ni RDS.**
  - El grupo de seguridad solo deja entrar a CloudFront, al puerto 80.
  - Se administra con SSM (Run Command y Session Manager).
- **Secretos en Parameter Store** (`/dra-satipo/<ambiente>/…`, SecureString; RNF03):
  - contraseña de la base;
  - clave HMAC del DNI;
  - contraseña inicial del Administrador;
  - encabezado secreto de CloudFront.

  Terraform los genera al crear el ambiente. El servidor los lee al desplegar (`servidor/desplegar.sh`).
- **Apagar conserva los datos.** Al encender, Docker vuelve a levantar los contenedores con sus datos.

## Despliegue en el servidor

1. `servidor/empaquetar.sh` arma `paquete.tar.gz` con `infra/` (sin Terraform ni claves) y el `backend.jar`.
2. El paquete se publica en el bucket de artefactos.
3. En el servidor, `plataforma-desplegar` (instalado al crear el EC2):
   1. descarga el paquete;
   2. arma las variables desde Parameter Store;
   3. llama a `servidor/levantar.sh`.

`levantar.sh` es repetible:
- genera la red Besu y la clave de IPFS solo la primera vez;
- reinicia el backend solo si cambió el `.jar`;
- espera a que la API responda a través de nginx.

## CloudFront (DRA-54)

Dos distribuciones con direcciones `*.cloudfront.net` **fijas** y HTTPS gratis, para que el QR de los PDF de QA no se rompa al apagar y encender:

| Distribución | `/*` (S3, con caché) | Al servidor (sin caché) |
|---|---|---|
| Plataforma interna | build del frontend | `/api/*`, `/rpc` |
| Portal público | build del portal; las rutas sin extensión (`/verificar/{token}`) se sirven con `index.html` (`rutas-del-portal.js`) | `/api/verificacion/*` |

- CloudFront agrega el encabezado secreto que exige nginx y pone la IP del visitante al final de `X-Forwarded-For` (HU20).
- Terraform guarda en Parameter Store `PLATAFORMA_PORTAL_URL` (para el QR) y `BESU_RPC_PUBLICA` (para MetaMask).
- **Servidor apagado:** CloudFront no llega al origen (502 o 504) y entrega `/_estado/apagado.json` con estado 503. Ese archivo tiene el formato de error del backend, así que la plataforma y el portal muestran "El ambiente de QA está apagado o encendiéndose…" sin cambios en su código.
- Con el servidor detenido no hay nombre DNS público. El origen pasa a `servidor-apagado.invalid` al volver a aplicar Terraform.

## Pruebas

```bash
cd modulos/ambiente && terraform init && terraform test           # plantilla, sin AWS
cd servidor && ./probar-servidor.sh ../../../backend/target/plataforma-backend-*.jar   # servidor en Docker
```

`probar-servidor.sh` levanta el servidor como en el EC2 y comprueba:
- nginx rechaza lo que no viene de CloudFront;
- `/rpc` no ofrece QBFT ni TXPOOL;
- el límite por IP del portal (HU20) usa la IP real del visitante y no se evita falsificando `X-Forwarded-For`;
- solo nginx publica un puerto;
- relanzar, apagar y encender conservan la base y la cadena.

La CI corre ambas pruebas en el job **Infraestructura AWS**, junto con la prueba de `rutas-del-portal.js`.

Las pruebas de punta a punta de los sprints contra el servidor de AWS, detrás del CloudFront simulado, corren en local (tardan alrededor de una hora):

```bash
cd plataforma && infra/aws/pruebas/de-punta-a-punta.sh "1 2 3 4 5 6"
```
