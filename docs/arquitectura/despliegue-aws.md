# Despliegue del ambiente QA en AWS

- **Tareas Jira:** DRA-44, con sus subtareas DRA-51 a DRA-54.
- **Para quién:** el dueño de la cuenta de AWS y del repositorio de GitHub.
- **Cuándo:** los pasos 1 a 4 se hacen **una sola vez**. Después, QA se enciende y se apaga con un botón (paso 5).

Nada de esta guía necesita instalar programas ni guardar claves de AWS: todo se hace desde la consola de AWS y desde GitHub.

## Resumen

| Paso | Dónde | Tiempo |
|---|---|---|
| 1. Proteger la cuenta y revisar los créditos | Consola de AWS | 10 min |
| 2. Crear la pila de la cuenta: rol para GitHub, bucket del estado y presupuesto | Consola de AWS → CloudFormation | 5 min |
| 3. Crear el ambiente `qa` en GitHub, con sus dos variables | GitHub → Settings | 5 min |
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
2. **Créditos:** se ven en el menú del nombre (**Free plan status**) o en **Billing and Cost Management**. Hoy son $100 y el plan gratuito termina el **29/04/2027**.
   - Cuando se acaba el crédito o vence el plazo, lo que ocurra primero, hay que pasar la cuenta al **plan de pago** para seguir usando AWS. Se hace en https://settings.aws.com → **Billing** → **Upgrade**.
   - El cambio no se puede deshacer.
   - En el plan de pago se puede fijar un **límite de gasto mensual** (*spend limit*) por proyecto.
3. **Región:** compruebe que la dirección del navegador diga `us-east-2` al crear la pila del paso 2.

## 2. Crear la pila de la cuenta (CloudFormation)

La plantilla [`plataforma/infra/aws/cuenta/cuenta.yml`](../../plataforma/infra/aws/cuenta/cuenta.yml) crea de una vez:
- **el acceso de GitHub Actions sin claves (OIDC).** Lo usa un rol que solo pueden asumir los flujos de este repositorio que corren en el ambiente `qa` de GitHub, por sesiones de 1 hora como máximo;
- **el bucket del estado de Terraform:** privado, cifrado, con versiones y que se conserva aunque se borre la pila;
- **el presupuesto `dra-satipo-cuenta`:** envía un correo cuando el gasto del mes pasa de **$10, $25 y $50**, y cuando el pronóstico del mes pasa de **$25**. **Los créditos no se descuentan**; si se descontaran, el gasto neto sería $0 mientras dure el crédito y las alertas nunca llegarían.

Pasos:
1. Descargue el archivo `cuenta.yml` desde GitHub (botón **Download raw file**).
2. En la consola, en la región **us-east-2 (Ohio)**, abra **CloudFormation → Stacks → Create stack → With new resources (standard)**.
3. Elija **Upload a template file**, suba `cuenta.yml` y pulse **Next**.
4. Complete los datos y pulse **Next**:
   - **Stack name:** `dra-satipo-cuenta`.
   - **CorreoAlertas:** el correo donde quiere recibir las alertas de gasto.
   - **CrearProveedorOidc:** `si`. Solo elija `no` si la creación falla porque la cuenta ya tiene un proveedor de `token.actions.githubusercontent.com`.
   - **Repositorio** y **AmbienteGitHub:** déjelos como están (`Garyn14/TESIS_FERNANDO` y `qa`).
5. En la página de opciones, deje todo como está y pulse **Next**.
6. Al final, marque **I acknowledge that AWS CloudFormation might create IAM resources with custom names** y pulse **Submit**.
7. Espere el estado **CREATE_COMPLETE** (1–2 minutos). En la pestaña **Outputs** quedan dos valores para el paso 3:
   - **RolGitHub:** algo como `arn:aws:iam::123456789012:role/dra-satipo-github-qa`.
   - **BucketEstado:** algo como `dra-satipo-terraform-123456789012`.

**Qué puede hacer ese rol:** crear y borrar la red, el servidor, los buckets, CloudFront y los parámetros de QA, gracias a la política `PowerUserAccess`. Esa política no incluye IAM ni la administración de la cuenta. En IAM solo puede crear el rol y el perfil del servidor (`dra-satipo-*-servidor`), adjuntarles únicamente la política de SSM de AWS y entregarlos únicamente a EC2.

## 3. Crear el ambiente `qa` en GitHub

1. En el repositorio, vaya a **Settings → Environments → New environment**, escriba `qa` y pulse **Configure environment**.
2. **No** active **Required reviewers**. Si lo hace, el apagado automático de medianoche se queda esperando una aprobación y QA sigue encendido.
3. En **Deployment branches and tags**, elija **Selected branches and tags** y agregue `main`. Es una protección extra: solo `main` puede usar el rol de AWS.
4. En **Environment variables**, pulse **Add environment variable** dos veces:

   | Name | Value |
   |---|---|
   | `AWS_ROL_QA` | el valor **RolGitHub** del paso 2 |
   | `TF_ESTADO_BUCKET` | el valor **BucketEstado** del paso 2 |

   Son variables, **no** secretos: no contienen claves. El acceso lo da la confianza OIDC.

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
2. En CloudFormation, borre la pila `dra-satipo-cuenta`. Eso quita el rol de GitHub y el presupuesto.
3. El bucket `dra-satipo-terraform-…` se conserva a propósito. Si ya no se necesita, vacíelo y bórrelo desde S3.

## Problemas frecuentes

| Mensaje | Causa y solución |
|---|---|
| `Faltan las variables AWS_ROL_QA o TF_ESTADO_BUCKET` | Falta el paso 3, o las variables se crearon como secretos o en otro ambiente. Tienen que estar en el ambiente `qa`. |
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | El flujo no corrió en el ambiente `qa` de **este** repositorio. Si el repositorio cambió de nombre o de dueño, actualice la pila con el parámetro **Repositorio** nuevo. |
| El flujo queda **Waiting** | El ambiente `qa` tiene revisores obligatorios: quítelos (paso 3). |
| QA amaneció encendido | GitHub desactiva los flujos programados tras **60 días sin actividad** en el repositorio. Reactive **QA – Apagar** en la pestaña Actions. |
| `QA se enciende con la última versión de main` | Se eligió otra rama al ejecutar. Elija `main`. |
