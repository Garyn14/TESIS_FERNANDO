# DRA-55 · QA en AWS: ajuste a la cuenta de la experiencia nueva (región us-east-2, sin usuario raíz)

**Tarea padre:** DRA-44 · **Rama:** `DRA-55-region-us-east-2` · **Fecha:** 08/11/2026

## Por qué

Al seguir la guía, el dueño de la cuenta encontró que IAM → *Security credentials* muestra "Feature unavailable". La cuenta se creó con **"Sign up for AWS (new)"**, la experiencia nueva y con plan gratuito. Según la documentación de AWS (*AWS Account Management*: "AWS Regions for your projects", "Supported AWS services for Sign up for AWS (new)", "Manage MFA in AWS Settings" y "Activate advanced AWS features"):

- **La región es fija.** AWS la asigna por el país de contacto, y Perú queda en **US East (Ohio) us-east-2**. Solo se puede elegir otra activando las funciones avanzadas, que exigen el plan de pago y no se pueden deshacer. DRA-51 a DRA-53 usaban us-east-1.
- **No hay usuario raíz.** El dueño de la cuenta es su AWS Builder ID. El MFA se registra en https://settings.aws.com → *Manage security and sign-in*.
- **Todos los servicios de QA están incluidos en el plan gratuito:** EC2, EBS, VPC, S3, CloudFront, IAM, CloudFormation, Systems Manager y Budgets. Los roles de IAM se permiten para acceso programático, que es el caso del rol OIDC de GitHub.
- **Fin del plan gratuito:** cuando se acaba el crédito o a los 6 meses (29/04/2027), hay que pasar al plan de pago para seguir.

## Qué cambió

| Archivo | Cambio |
|---|---|
| `plataforma/infra/aws/qa/main.tf` | Proveedor y estado de Terraform en `us-east-2` |
| `.github/workflows/qa-encender.yml`, `qa-apagar.yml`, `qa-destruir.yml` | `AWS_REGION: us-east-2` |
| `plataforma/infra/aws/cuenta/cuenta.yml` | La pila se crea en us-east-2 |
| `modulos/ambiente/tests/ambiente.tftest.hcl` | Los proveedores simulados responden us-east-2 |
| `docs/arquitectura/despliegue-aws.md` | Paso 1 reescrito: MFA del AWS Builder ID, sin usuario raíz, región fija, fin del plan gratuito, paso al plan de pago y límite de gasto |
| `CLAUDE.md` | Región y tipo de cuenta |

La plantilla no tiene recursos atados a la región: el rol, el proveedor OIDC y el presupuesto son globales, y el bucket queda en la región de la pila. El módulo de Terraform tampoco: la imagen de Amazon Linux y la lista de prefijos de CloudFront se buscan por nombre en la región del proveedor.

## Qué se comprueba (local)

- `terraform fmt -check` y `terraform validate` sin observaciones.
- `terraform test`: 10 pruebas en verde.
- `cfn-lint` sin observaciones y 10 pruebas de la plantilla de la cuenta en verde.
- `actionlint` sin observaciones.

## Pendiente

- **Costos:** la estimación de `estimacion-costos-aws.md` se hizo con los precios de us-east-1. Los de us-east-2 se confirmarán con la primera factura y el presupuesto.
- **Primer encendido real:** se hace después de que el dueño siga los pasos 1 a 3 de la guía.
