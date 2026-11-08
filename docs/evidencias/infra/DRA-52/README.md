# DRA-52 · QA en AWS: disparadores Encender, Apagar y Destruir, con apagado a medianoche

**Tarea padre:** DRA-44 · **Rama:** `DRA-52-disparadores-qa` · **Fecha:** 08/11/2026

## Qué se construyó

| Pieza | Archivo |
|---|---|
| **QA – Encender** (a mano, solo desde `main`) | `.github/workflows/qa-encender.yml` |
| **QA – Apagar** (a mano y todos los días a las 00:00 de Lima) | `.github/workflows/qa-apagar.yml` |
| **QA – Destruir** (a mano, con la confirmación `DESTRUIR-QA`) | `.github/workflows/qa-destruir.yml` |
| Ubicar el servidor del ambiente (id, tipo y estado) | `plataforma/infra/aws/acciones/instancia.sh` |
| Ejecutar un comando en el servidor con SSM Run Command y esperar su resultado | `acciones/ssm-ejecutar.sh` |
| Publicar el build en S3: `.mjs` como JavaScript, `index.html` sin caché y al final, sin tocar `_estado/` | `acciones/publicar-sitio.sh` |
| Desplegar el contrato por `/rpc` la primera vez y guardar las billeteras de prueba | `acciones/desplegar-contrato.sh` |
| Pruebas de los scripts con un `aws` simulado | `acciones/probar-acciones.sh` |

Los tres flujos:
- entran a AWS con el rol OIDC (`vars.AWS_ROL_QA`), sin claves guardadas;
- comparten un candado (`concurrency: ambiente-qa`), así que nunca corren a la vez.

Todavía **no se ejecutaron contra AWS**. Primero hay que preparar la cuenta (DRA-53): el rol OIDC, el bucket del estado y las variables del ambiente `qa` en GitHub.

## Qué se comprueba

### 1. Scripts de los disparadores con un `aws` simulado (`probar-acciones.sh`, en la CI)

El `aws` simulado anota cada llamada y responde lo que haría AWS:

```
== publicar-sitio.sh
  ok    los .mjs se suben como JavaScript
  ok    assets/ con caché de un año, sin los .mjs
  ok    no toca _estado/ (aviso de apagado de Terraform)
  ok    index.html sin caché
  ok    index.html se sube después de los demás archivos
  ok    renueva index.html en CloudFront
  ok    sin build no publica nada
== ssm-ejecutar.sh
  ok    espera el resultado y termina bien si el comando funcionó
  ok    manda el comando y su tiempo máximo a AWS-RunShellScript
  ok    falla si el comando falló en el servidor
  ok    falla si el agente de SSM no responde
== desplegar-contrato.sh
  ok    no despliega otro contrato si ya hay uno
  ok    y no escribe ningún parámetro
== instancia.sh
  ok    devuelve id, tipo y estado
  ok    busca el servidor del ambiente, sin los ya eliminados
Todas las comprobaciones pasaron.
```

### 2. Despliegue del contrato contra una red Besu real (local), con el `aws` simulado

`desplegar-contrato.sh qa http://127.0.0.1:8545` desplegó el contrato y respondió `nuevo`. Los parámetros que escribió (claves recortadas):

```
ssm put-parameter --name /dra-satipo/qa-billeteras/ADMINISTRADOR_DIRECCION --type String ...
ssm put-parameter --name /dra-satipo/qa-billeteras/ADMINISTRADOR_CLAVE --type SecureString --value 0xe02a2f… --overwrite
ssm put-parameter --name /dra-satipo/qa-billeteras/RESPALDO_DIRECCION --type String ...
ssm put-parameter --name /dra-satipo/qa-billeteras/RESPALDO_CLAVE --type SecureString ...
ssm put-parameter --name /dra-satipo/qa-billeteras/DIRECTOR_DIRECCION --type String ...
ssm put-parameter --name /dra-satipo/qa-billeteras/DIRECTOR_CLAVE --type SecureString ...
ssm put-parameter --name /dra-satipo/qa/PLATAFORMA_CONTRATO_BLOQUE_INICIAL --type String --value 6562 --overwrite
ssm put-parameter --name /dra-satipo/qa/PLATAFORMA_CONTRATO_DIRECCION --type String --value 0x394C… --overwrite
```

Resultado:
- las claves van como SecureString y fuera de `/dra-satipo/qa/`, que es la ruta que lee el servidor;
- la dirección del contrato se escribe al final, así que si existe, el despliegue está completo;
- el archivo temporal con las claves (`e2e/.despliegue.json`) se borra al terminar.

El despliegue por `/rpc` a través de CloudFront ya se había probado en DRA-54: cada sprint desplegó su contrato por el CloudFront simulado.

### 3. Revisión de los flujos (actionlint, en la CI)

- Sin observaciones en los tres disparadores.
- Señaló una variable sin usar en un flujo que ya existía (`ci.yml`, job Red Besu), y quedó corregida.

## Decisiones

| Decisión | Por qué |
|---|---|
| Encender solo desde `main` | El criterio es "la última versión de `main`". Así nadie publica en QA una rama a medio terminar. |
| Encender reutiliza el tamaño actual del servidor si no se indica otro | Evita que un encendido normal achique o agrande el servidor por accidente. Apagar y Destruir también lo respetan. |
| Apagar vuelve a aplicar Terraform, pero solo a las distribuciones (`-target`) | Saca de CloudFront la IP que AWS puede reasignar (DRA-54) sin aplicar otros cambios al apagar. |
| Apagar no falla si QA ya está apagado, no existe o la cuenta todavía no está configurada | Corre todas las noches. Un error diario sin motivo terminaría ignorándose. |
| El contrato y las billeteras de QA se crean en Encender, no en Terraform | El contrato se despliega en la cadena, que vive en el servidor. Terraform no la conoce. Destruir los borra aparte. |
| Billeteras en `/dra-satipo/qa-billeteras/` | El servidor solo puede leer `/dra-satipo/qa/`. Las claves de firma nunca llegan al servidor (RNF05, "el servidor nunca firma"). |
| Comandos al servidor con SSM y sin SSH | No hay puerto 22 ni llaves que guardar (DRA-51). |

## Ajustes encontrados

- **`ssm-ejecutar.sh`** dividía por el tiempo de espera entre consultas. Con pausa 0, que usa la prueba, fallaba por división entre cero. Lo encontró `probar-acciones.sh`.
- **No se pudo descargar actionlint** en la sesión. Se usa su imagen de Docker, igual que en la CI.

## Pendiente

- **DRA-53:**
  - preparar la cuenta: rol OIDC limitado al ambiente `qa` de este repositorio y bucket del estado;
  - presupuesto y alertas;
  - guía `docs/arquitectura/despliegue-aws.md` con los pasos que solo puede hacer el dueño de la cuenta.
- **Primer encendido real:** se comprobará con QA en AWS:
  - los tiempos de la tabla del README;
  - que CloudFront acepte `servidor-apagado.invalid`;
  - el aviso de apagado.
