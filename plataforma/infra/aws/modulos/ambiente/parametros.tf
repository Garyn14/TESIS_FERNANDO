# Variables del backend en Parameter Store (RNF03). El servidor las lee al desplegar
# (desplegar.sh): cada /dra-satipo/<ambiente>/NOMBRE pasa a ser la variable NOMBRE.
#
# Los secretos se generan aquí y se guardan como SecureString (cifrados con la clave de AWS de
# SSM, sin costo). También quedan en el estado de Terraform, que está en un bucket privado y
# cifrado (ver docs/arquitectura/despliegue-aws.md).

resource "random_password" "base_de_datos" {
  length  = 32
  special = false
}

# Contraseña inicial del Administrador (RF09). Se lee en Parameter Store y se cambia al entrar.
resource "random_password" "administrador" {
  length  = 16
  special = false
}

# Encabezado que CloudFront agrega a cada pedido al servidor; nginx rechaza los que no lo traen.
resource "random_password" "origen" {
  length  = 40
  special = false
}

# Clave del HMAC-SHA256 del DNI (HU08, RF17). Si cambia, los DNI ya registrados no se encuentran:
# solo se genera al crear el ambiente.
resource "random_id" "clave_hmac_dni" {
  byte_length = 32
}

locals {
  secretos = {
    DB_PASSWORD                 = random_password.base_de_datos.result
    PLATAFORMA_ADMIN_CONTRASENA = random_password.administrador.result
    ORIGEN_SECRETO              = random_password.origen.result
    PLATAFORMA_CLAVE_HMAC_DNI   = random_id.clave_hmac_dni.hex
  }
}

resource "aws_ssm_parameter" "secreto" {
  for_each = toset(["DB_PASSWORD", "PLATAFORMA_ADMIN_CONTRASENA", "ORIGEN_SECRETO", "PLATAFORMA_CLAVE_HMAC_DNI"])

  name  = "${local.ruta_parametros}/${each.key}"
  type  = "SecureString"
  value = local.secretos[each.key]
}

resource "aws_ssm_parameter" "configuracion" {
  for_each = var.configuracion

  name  = "${local.ruta_parametros}/${each.key}"
  type  = "String"
  value = each.value
}

# DRA-66: el servidor guarda un volcado de PostgreSQL antes de cada copia solo si los respaldos
# están activos (servidor/desplegar.sh instala o quita el temporizador).
resource "aws_ssm_parameter" "respaldos" {
  name  = "${local.ruta_parametros}/RESPALDOS_ACTIVOS"
  type  = "String"
  value = var.respaldos_activos ? "si" : "no"
}
