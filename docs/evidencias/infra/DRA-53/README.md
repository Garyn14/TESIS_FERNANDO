# DRA-53 · QA en AWS: presupuesto, alertas y preparación de la cuenta

**Tarea padre:** DRA-44 · **Rama:** `DRA-53-cuenta-y-presupuesto` · **Fecha:** 08/11/2026

## Qué se construyó

| Pieza | Archivo |
|---|---|
| Plantilla de CloudFormation de la cuenta, para una sola vez: proveedor OIDC de GitHub, rol `dra-satipo-github-qa`, bucket del estado de Terraform y presupuesto `dra-satipo-cuenta` | `plataforma/infra/aws/cuenta/cuenta.yml` |
| Pruebas de la plantilla (cfn-lint y 10 pruebas) | `plataforma/infra/aws/cuenta/tests/test_cuenta.py` |
| Prueba que une los nombres de la plantilla con los de Terraform | `modulos/ambiente/tests/ambiente.tftest.hcl` (`nombres_que_permite_la_cuenta`) |
| Guía paso a paso para el dueño de la cuenta | [`docs/arquitectura/despliegue-aws.md`](../../../arquitectura/despliegue-aws.md) |

La guía cubre:
1. MFA en la cuenta raíz y revisión de los créditos (saldo y vencimiento).
2. Crear la pila desde la consola, sin instalar nada.
3. El ambiente `qa` de GitHub, con sus dos variables (`AWS_ROL_QA` y `TF_ESTADO_BUCKET`), que no son secretos.
4. El primer encendido, la contraseña inicial del Administrador y las billeteras de prueba para MetaMask.
5. El uso diario y el costo esperado.
6. Cómo ver el costo de QA aparte en Cost Explorer.
7. Cómo desmontar todo.
8. Problemas frecuentes.

## Qué se comprueba

### Plantilla de la cuenta: cfn-lint sin observaciones y 10 pruebas

```
test_iam_limitado_al_rol_del_servidor ... ok
test_sesiones_cortas_y_sin_administrador ... ok
test_solo_el_ambiente_qa_de_este_repositorio ... ok
test_solo_se_adjunta_la_politica_de_ssm_y_solo_a_ec2 ... ok
test_privado_cifrado_con_versiones_y_conservado ... ok
test_solo_https ... ok
test_avisos_a_10_25_y_50_y_pronostico_sobre_25 ... ok
test_los_creditos_no_esconden_el_gasto ... ok
test_mensual ... ok
test_entrega_lo_que_se_copia_en_github ... ok
Ran 10 tests ... OK
```

### Terraform: 10 pruebas (1 nueva)

`nombres_que_permite_la_cuenta` comprueba dos cosas:
- el rol y el perfil del servidor se llaman `dra-satipo-qa-servidor`, que es lo único que la cuenta deja crear;
- al servidor solo se le adjunta la política de SSM.

Si alguien cambia esos nombres en Terraform, la prueba falla antes de llegar a AWS.

## Decisiones

| Decisión | Por qué |
|---|---|
| **El presupuesto lo crea la plantilla de la cuenta, no Terraform** (el ticket decía Terraform) | El presupuesto es de toda la cuenta. Así existe **antes** del primer encendido y sigue avisando aunque se ejecute **QA – Destruir**. Ya no hace falta el correo como variable de GitHub: se escribe una vez en la plantilla. |
| **Créditos sin descontar** (`IncludeCredit: false`) | Con el crédito descontado, el gasto neto es $0 y ninguna alerta llegaría hasta agotar los $100. |
| **CloudFormation para la cuenta y Terraform para QA** | La cuenta se prepara con unos clics en la consola, sin instalar Terraform ni crear claves. Así se resuelve también quién crea el bucket del estado antes de que exista Terraform. |
| **Rol con `PowerUserAccess` y un IAM acotado** | Terraform necesita crear la red, el servidor, S3, CloudFront y los parámetros. En IAM solo puede crear `dra-satipo-*-servidor`, adjuntarle la política de SSM y entregarlo a EC2. |
| **Rol de GitHub solo para el ambiente `qa` de este repositorio** | Otra rama sin ese ambiente, otro repositorio o una persona no pueden usarlo. En GitHub, el ambiente además se limita a la rama `main`. |
| **Sin revisores obligatorios en el ambiente `qa`** | El apagado de medianoche no puede esperar a que alguien lo apruebe. |
| **El bucket del estado se conserva al borrar la pila** | Perder el estado dejaría recursos de QA sin dueño, que seguirían cobrando sin que Terraform los vea. |

**Límite conocido, aceptado para QA:** el rol puede escribir políticas en línea sobre el rol del servidor. Quien controlara los flujos de `main` podría usar eso para ampliar permisos. Para que pase, haría falta subir código a `main`, que es la misma barrera que protege a todo el proyecto. En PROD conviene agregar un *permissions boundary*.

## Ajustes encontrados

- La primera versión de la prueba importaba `cfn_lint`, pero el paquete se llama `cfnlint`.
- La plantilla decía que AWS envía un correo de confirmación, y los avisos de AWS Budgets no lo piden. Se corrigió la descripción.

## Pendiente

- **El dueño de la cuenta** sigue los pasos 1 a 3 de la guía: MFA, la pila y el ambiente `qa` de GitHub.
- **Primer encendido real (paso 4):** comprueba lo que no se puede probar sin AWS:
  - los tiempos;
  - que CloudFront acepte `servidor-apagado.invalid`;
  - el aviso de apagado;
  - las alertas del presupuesto.

  Con eso se cierra DRA-44 para QA.
