# Despliegue del ambiente QA en AWS

- **Tareas Jira:** DRA-44, con sus subtareas DRA-51 a DRA-56.
- **Para quién:** el dueño de la cuenta de AWS y del repositorio de GitHub.
- **Cuándo:** los pasos 1 a 4 se hacen **una sola vez**. Después, QA se enciende y se apaga con un botón (paso 5).

Nada de esta guía necesita instalar programas: todo se hace desde la consola de AWS (con su terminal **CloudShell**) y desde GitHub. La única clave de AWS que existe es la de los disparadores, y se guarda solo como secreto en GitHub (DRA-56).

## Resumen

| Paso | Dónde | Tiempo |
|---|---|---|
| 1. Proteger la cuenta y revisar los créditos | Consola de AWS | 10 min |
| 2. Crear la pila de la cuenta (usuario para GitHub, bucket del estado y presupuesto) y la clave del usuario | Consola de AWS → CloudFormation | 5 min |
| 3. Crear el ambiente `qa` en GitHub, con dos secretos y una variable | GitHub → Settings | 5 min |
| 4. Primer encendido | GitHub → Actions | 15–25 min (espera) |
| 5. Uso diario: encender, apagar y destruir | GitHub → Actions | — |

## 1. Proteger la cuenta y revisar los créditos

La cuenta se creó con la **experiencia nueva de AWS** (plan gratuito, con *projects* y *team* en el menú del nombre). En esa experiencia (DRA-55):
- **No hay usuario raíz.** La cuenta pertenece a su **AWS Builder ID**, que es su inicio de sesión. Por eso IAM → *Security credentials* muestra "Feature unavailable": es lo esperado y no hace falta activar nada.
- **La región es fija.** AWS la asigna por el país de contacto, y para Perú es **US East (Ohio) us-east-2**. Todo QA vive ahí.
- **Están todos los servicios que usa QA:** EC2, EBS, VPC, S3, CloudFront, IAM, CloudFormation, Systems Manager y Budgets.

Pasos:
1. **MFA de su inicio de sesión (AWS Builder ID):**
   1. Abra **https://settings.aws.com**. También se llega desde el menú del nombre → **Profile**.
   2. En el menú de la izquierda, elija **Manage security and sign-in**. Lo lleva a su perfil de AWS Builder ID.
   3. En la página **Security**, pulse **Register device** y elija **Authenticator app**.
   4. Escanee el código QR con Google Authenticator o Microsoft Authenticator y escriba el código que muestra.
   5. AWS recomienda registrar **dos** dispositivos: por ejemplo, la aplicación y una llave de seguridad o el lector de huella de la computadora. Si se pierden todos, no se puede recuperar la cuenta.

   Si entra a AWS con **Google, GitHub, Apple o Amazon**, active también la verificación en dos pasos de esa cuenta: es la puerta de entrada.
2. **Plan de pago (obligatorio para QA, DRA-56):** el plan gratuito solo deja crear servidores "elegibles para la capa gratuita", y el `t4g.medium` de QA (4 GB, ARM) no lo es. Las alternativas gratuitas son `c7i-flex.large`, que cuesta 2,5 veces más, y `t4g.small`, cuyos 2 GB no alcanzan para la plataforma.
   - Pase la cuenta a pago en https://settings.aws.com → **Billing** → **Upgrade** → **Get started**: agregue la tarjeta y pulse **Upgrade account**.
   - Al terminar, fije un **límite de gasto mensual** (*Set spend limits*), por ejemplo **$20**, además de las alertas del presupuesto.
   - El cambio no se puede deshacer. El crédito restante se sigue usando y solo se cobra lo que lo supere.
3. **Créditos:** se ven en el menú del nombre o en **Billing and Cost Management**. Hoy son $100 de crédito inicial.
4. **Región:** compruebe que la dirección del navegador diga `us-east-2` al crear la pila del paso 2.

## 2. Crear la pila de la cuenta (CloudFormation)

La plantilla [`plataforma/infra/aws/cuenta/cuenta.yml`](../../plataforma/infra/aws/cuenta/cuenta.yml) crea de una vez:
- **el usuario de IAM `dra-satipo-github-qa`,** que usan los disparadores de GitHub. Solo tiene acceso programático, sin contraseña de consola. Lo ideal sería entrar sin claves (OIDC), pero la política de AWS de esta cuenta prohíbe crear proveedores de identidad (`iam:*Provider*`, DRA-56);
- **el bucket del estado de Terraform:** privado, cifrado, con versiones y que se conserva aunque se borre la pila;
- **el presupuesto `dra-satipo-cuenta`:** envía un correo cuando el gasto del mes pasa de **$10, $25 y $50**, y cuando el pronóstico del mes pasa de **$25**. **Los créditos no se descuentan**; si se descontaran, el gasto neto sería $0 mientras dure el crédito y las alertas nunca llegarían.

Pasos:
1. Descargue el archivo `cuenta.yml` desde GitHub (botón **Download raw file**).
2. En la consola, en la región **us-east-2 (Ohio)**, abra **CloudFormation → Stacks → Create stack → With new resources (standard)**.
3. Elija **Upload a template file**, suba `cuenta.yml` y pulse **Next**.
4. Complete los datos y pulse **Next**:
   - **Stack name:** `dra-satipo-cuenta`.
   - **CorreoAlertas:** el correo donde quiere recibir las alertas de gasto.
   - **AmbienteGitHub:** déjelo como está (`qa`).
5. En la página de opciones, deje todo como está y pulse **Next**.
6. Al final, marque **I acknowledge that AWS CloudFormation might create IAM resources with custom names** y pulse **Submit**.
7. Espere el estado **CREATE_COMPLETE** (1–2 minutos). En la pestaña **Outputs** queda **BucketEstado**, algo como `dra-satipo-terraform-123456789012`, que se usa en el paso 3.
8. **Clave del usuario.** La plantilla no la crea porque quedaría a la vista en los resultados de la pila. En **CloudShell** (botón abajo a la izquierda, en Ohio), ejecute:

   ```bash
   aws iam create-access-key --user-name dra-satipo-github-qa --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
   ```

   Muestra dos valores: la clave (`AKIA…`) y su secreto. AWS muestra el secreto **una sola vez**: páselo directo al paso 3, sin guardarlo en archivos, chats ni correos.

**Qué puede hacer ese usuario:** crear y borrar la red, el servidor, los buckets, CloudFront y los parámetros de QA, gracias a la política `PowerUserAccess`. Esa política no incluye IAM ni la administración de la cuenta. En IAM solo puede crear el rol y el perfil del servidor (`dra-satipo-*-servidor`), adjuntarles únicamente la política de SSM de AWS y entregarlos únicamente a EC2.

## 3. Crear el ambiente `qa` en GitHub

1. En el repositorio, vaya a **Settings → Environments → New environment**, escriba `qa` y pulse **Configure environment**.
2. **No** active **Required reviewers**. Si lo hace, el apagado automático de medianoche se queda esperando una aprobación y QA sigue encendido.
3. En **Deployment branches and tags**, elija **Selected branches and tags** y agregue `main`. Así, solo los flujos de `main` reciben la clave de AWS.
4. En **Environment secrets**, pulse **Add environment secret** dos veces:

   | Name | Value |
   |---|---|
   | `AWS_ACCESS_KEY_ID` | la clave (`AKIA…`) del paso 2.8 |
   | `AWS_SECRET_ACCESS_KEY` | el secreto del paso 2.8 |

   GitHub guarda los secretos cifrados: no se ven aunque el repositorio sea público, ni llegan a las copias (*forks*) ni a los *pull requests* de otras personas.
5. En **Environment variables**, pulse **Add environment variable**:

   | Name | Value |
   |---|---|
   | `TF_ESTADO_BUCKET` | el valor **BucketEstado** del paso 2 |

## 4. Primer encendido

1. En GitHub, vaya a **Actions → QA – Encender → Run workflow**, con la rama `main` y el tamaño vacío, y pulse **Run workflow**.
2. La primera vez tarda entre 15 y 25 minutos: crea todo, incluidas las dos distribuciones de CloudFront y el contrato.
3. Al terminar, el **resumen de la ejecución** muestra:
   - la dirección de la **plataforma interna** (`https://d….cloudfront.net`);
   - la dirección del **portal de verificación**, que es la que va en el QR;
   - el **RPC para MetaMask** (`…/rpc`, chainId 20260).

   Las direcciones no cambian al apagar y encender. Solo cambian si se destruye QA.
4. **Contraseña inicial del Administrador:**
   1. En la consola, vaya a **Systems Manager → Parameter Store**.
   2. Abra `/dra-satipo/qa/PLATAFORMA_ADMIN_CONTRASENA` y elija **Show decrypted value**.
   3. El usuario es `admin`. La plataforma pide cambiar la contraseña al entrar.
5. **Billeteras de prueba para MetaMask**, solo de QA y sin valor:
   - Están en Parameter Store, en `/dra-satipo/qa-billeteras/`:
     - `ADMINISTRADOR_CLAVE`: administrador del contrato, para otorgar el rol de firmante (HU06);
     - `DIRECTOR_CLAVE`: firma los documentos;
     - `RESPALDO_CLAVE`: administrador de respaldo, que no hace falta importar.
   - En MetaMask:
     1. Agregue la red con el RPC del resumen, chainId `20260` y moneda `DRA`.
     2. Importe las cuentas con **Import account** y la clave privada.
   - Después, en la plataforma, registre la dirección del Director (`DIRECTOR_DIRECCION`) como su billetera.

## 4b. Probar QA de punta a punta

El guion [`docs/scrum/qa/guion-de-pruebas-qa.md`](../scrum/qa/guion-de-pruebas-qa.md) (DRA-57) recorre las 30 historias en QA, desde el navegador y el celular, más el apagado y el encendido.

## 5. Uso diario

| Para | Flujo en GitHub Actions |
|---|---|
| Trabajar con QA, o actualizarlo con lo último de `main` | **QA – Encender**. Tarda unos 10 minutos con QA ya creado. |
| Dejar de pagar sin perder nada | **QA – Apagar**. Además corre **solo todos los días a las 00:00 de Lima**. |
| Empezar de cero, perdiendo todos los datos | **QA – Destruir**, escribiendo `DESTRUIR-QA`. El siguiente Encender crea un QA vacío, con **direcciones nuevas**. |
| Cambiar el tamaño del servidor | **QA – Encender** con otro tamaño `t4g`, por ejemplo `t4g.large`. Se mantiene en los siguientes encendidos. |

Con QA apagado, la plataforma y el portal cargan igual y muestran "El ambiente de QA está apagado o encendiéndose. Intente nuevamente en unos minutos."

**Costo esperado:**
- encendido unas 10 horas al día, 22 días al mes: **unos $11–14 al mes**;
- apagado: **unos $2–3 al mes**, casi todo por el disco.

El detalle está en [estimacion-costos-aws.md](estimacion-costos-aws.md).

## 6. Revisar los costos

- **Presupuesto:** en **Billing and Cost Management → Budgets → dra-satipo-cuenta** se ve el gasto del mes **sin descontar créditos** y el pronóstico.
- **Créditos:** en **Billing and Cost Management → Credits**.
- **Solo QA:** todos los recursos llevan las etiquetas `Proyecto=dra-satipo` y `Ambiente=qa`. Para filtrar por ellas en **Cost Explorer**, hay que activarlas una vez:
  1. Vaya a **Billing and Cost Management → Cost allocation tags**.
  2. Marque `Proyecto` y `Ambiente`, y pulse **Activate**.
  3. Aparecen en los informes después de unas 24 horas, y solo desde la fecha de activación.

## 7. Desmontar todo

1. **QA – Destruir**, escribiendo `DESTRUIR-QA`.
2. Borre la clave del usuario (sección 8) y después, en CloudFormation, la pila `dra-satipo-cuenta`. Eso quita el usuario de GitHub y el presupuesto.
3. El bucket `dra-satipo-terraform-…` se conserva a propósito. Si ya no se necesita, vacíelo y bórrelo desde S3.

## Problemas frecuentes

| Mensaje | Causa y solución |
|---|---|
| `Faltan el secreto AWS_ACCESS_KEY_ID o la variable TF_ESTADO_BUCKET` | Falta el paso 3, o se crearon en otro ambiente o con otro tipo: la clave va como **secreto** y el bucket como **variable**, las dos en el ambiente `qa`. |
| `The security token included in the request is invalid` | La clave se borró, se desactivó o se copió mal. Cree una nueva (sección 8) y reemplace los dos secretos. |
| El flujo queda **Waiting** | El ambiente `qa` tiene revisores obligatorios: quítelos (paso 3). |
| QA amaneció encendido | GitHub desactiva los flujos programados tras **60 días sin actividad** en el repositorio. Reactive **QA – Apagar** en la pestaña Actions. |
| `QA se enciende con la última versión de main` | Se eligió otra rama al ejecutar. Elija `main`. |

## 8. Cambiar la clave de GitHub (cada 90 días)

La clave del usuario `dra-satipo-github-qa` no vence sola. Para limitar el daño si se filtrara, se cambia cada 90 días, o de inmediato si hay sospecha. En **CloudShell**, en Ohio:

1. Cree la clave nueva (un usuario puede tener dos a la vez):

   ```bash
   aws iam create-access-key --user-name dra-satipo-github-qa --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text
   ```

2. Reemplace los dos secretos del ambiente `qa` en GitHub (paso 3.4).
3. Compruebe que **QA – Apagar** funcione: se puede ejecutar a mano aunque QA ya esté apagado.
4. Vea qué claves tiene el usuario y borre la anterior:

   ```bash
   aws iam list-access-keys --user-name dra-satipo-github-qa --query 'AccessKeyMetadata[].[AccessKeyId,CreateDate]' --output table
   ```

   ```bash
   aws iam delete-access-key --user-name dra-satipo-github-qa --access-key-id AKIA...
   ```
