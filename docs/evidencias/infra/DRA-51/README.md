# DRA-51 · QA en AWS: plantilla de infraestructura con Terraform

**Tarea padre:** DRA-44 (infraestructura en AWS) · **Rama:** `DRA-51-plantilla-qa` · **Fecha:** 08/11/2026

## Qué se construyó

| Pieza | Archivo |
|---|---|
| Plantilla de un ambiente: red propia, servidor ARM, buckets privados y parámetros | `plataforma/infra/aws/modulos/ambiente/*.tf` |
| Primer arranque del servidor: Docker, Compose para ARM, 2 GB de swap y el comando `plataforma-desplegar` | `modulos/ambiente/arranque.sh.tftpl` |
| Ambiente QA (us-east-1, `t4g.medium`, estado en S3 con bloqueo) | `plataforma/infra/aws/qa/main.tf` |
| `docker compose` del servidor: se suma al de desarrollo sin repetirlo | `plataforma/infra/aws/servidor/docker-compose.qa.yml` |
| nginx: encabezado secreto de CloudFront, `/api` y `/rpc` | `servidor/nginx.conf.template` |
| Empaquetar, desplegar, levantar y probar | `servidor/empaquetar.sh`, `desplegar.sh`, `levantar.sh`, `probar-servidor.sh` |
| Job de CI **Infraestructura AWS** y Dependabot para los proveedores de Terraform | `.github/workflows/ci.yml`, `.github/dependabot.yml` |

Todavía **no se creó nada en AWS**. Lo crea el disparador Encender (DRA-52), después de preparar la cuenta (DRA-53).

## Qué se comprueba

### 1. Pruebas de la plantilla, sin cuenta de AWS (`terraform test`, proveedores simulados)

```
run "servidor_barato_y_sin_sorpresas"... pass          t4g.medium, créditos standard, disco gp3 cifrado
run "servidor_solo_accesible_desde_cloudfront"... pass  solo el puerto 80 y solo desde CloudFront; IMDSv2 con un salto
run "buckets_privados"... pass                          los 3 buckets bloquean el acceso público
run "secretos_cifrados_en_parameter_store"... pass      4 secretos SecureString bajo /dra-satipo/qa/
run "arranque_del_servidor"... pass                     el servidor sabe su ambiente y su bucket; Compose para ARM
run "tipo_de_servidor_ajustable_pero_arm"... pass       un tipo que no es t4g se rechaza
Success! 6 passed, 0 failed.
```

Además: `terraform fmt -check`, `terraform validate` del ambiente QA y `shellcheck` de los scripts, sin observaciones.

### 2. El servidor en Docker, como en el EC2 (`probar-servidor.sh`)

Se arma el paquete real (105 MB: `infra/` y el `backend.jar`) y se levanta con variables de prueba en lugar de Parameter Store:

```
== nginx solo atiende a CloudFront
  ok    sin el encabezado secreto: 403
  ok    con un secreto falso: 403
  ok    con el secreto: 200
  ok    fuera de /api y /rpc: 404
== /rpc público solo con ETH, NET y WEB3
  ok    eth_chainId responde 20260 (0x4f24)
  ok    qbft_* no habilitado
  ok    txpool_* no habilitado
  ok    GET /rpc rechazado
== HU20: el límite por IP cuenta la IP real del visitante (la última de X-Forwarded-For)
  ok    consulta 11 del mismo visitante: 429
  ok    otro visitante no se ve afectado: 200
  ok    falsificar X-Forwarded-For no evita el límite
  ok    ni culpa a otra IP
== Ningún otro servicio publica puertos
  ok    solo nginx publica un puerto
== Relanzar sin cambios y apagar/encender conservan los datos
  ok    la base conserva sus datos
  ok    la cadena de Besu continúa (no vuelve al bloque 0)
  ok    la cuenta inicial del Administrador sigue existiendo
Todas las comprobaciones pasaron.
```

Tiempos medidos en local:
- primer despliegue: unos 50 s (genera la red Besu y la clave de IPFS);
- relanzar sin cambios: 1 s;
- encender después de un apagado: unos 42 s.

## Decisiones

| Decisión | Por qué |
|---|---|
| El `docker compose` de AWS **se suma** al de desarrollo (`-f infra/docker-compose.yml -f …qa.yml`) | Un solo lugar para Besu, IPFS y PostgreSQL: lo probado en local es lo que corre en AWS. |
| `/rpc` público solo con **ETH, NET y WEB3** | MetaMask del Director lo necesita. QBFT permitiría votar validadores, así que queda solo en la red interna. |
| Encabezado secreto entre CloudFront y nginx | El grupo de seguridad admite a CloudFront de cualquier cuenta de AWS; el secreto deja pasar solo a nuestras distribuciones. |
| nginx reenvía `X-Forwarded-For` **sin agregar** la IP de CloudFront | Si la agregara, el límite de HU20 contaría a CloudFront y no al visitante. Comprobado con las 4 pruebas de HU20. |
| Créditos de CPU `standard` | Con `unlimited`, un pico sostenido cobra extra. En QA es preferible que se ponga lento. |
| IMDSv2 con un salto | Los contenedores no pueden leer las credenciales del servidor. |
| `ignore_changes = [ami, user_data]` | Una imagen nueva de Amazon Linux reemplazaría el servidor y borraría los datos de QA. |
| Sin SSH: SSM Run Command y Session Manager | No hay puerto 22 abierto ni llaves que guardar. |
| Secretos generados por Terraform | Nadie los escribe a mano. Quedan en Parameter Store y en el estado de Terraform, que está en un bucket privado y cifrado (DRA-53). |

## Ajustes encontrados

- **YAML:** `-Xmx${BACKEND_MEMORIA:-640m}` dentro de una lista `[...]` rompía el archivo. Se pasó a una lista entre comillas.
- **Primera versión del paquete: 269 MB.** Incluía los proveedores de Terraform descargados (`.terraform/`). El paquete excluye ahora toda la parte de Terraform y pesa 105 MB.
- **Permisos:** `umask 077` en `desplegar.sh` habría dejado las claves de Besu ilegibles para el contenedor, que no corre como root. Se limitó a la escritura del archivo de variables.
- **Sesión sin acceso al registro de Terraform:** para validar se usó un espejo local de los proveedores, descargados de `releases.hashicorp.com`. La CI usa el registro normal.

## Pendiente en las otras subtareas

- **DRA-54:**
  - CloudFront, el acceso de CloudFront a S3 y la función para las rutas del portal;
  - `PLATAFORMA_PORTAL_URL` y `BESU_RPC_PUBLICA`;
  - la prueba de punta a punta de los sprints a través de un CloudFront simulado.
- **DRA-52:** disparadores Encender, Apagar y Destruir, con el despliegue del contrato.
- **DRA-53:**
  - plantilla de la cuenta (rol OIDC y bucket del estado);
  - presupuesto y alertas;
  - guía `docs/arquitectura/despliegue-aws.md`.
