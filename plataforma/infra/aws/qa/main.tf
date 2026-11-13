# Ambiente de QA (DRA-44): pruebas de aceptación, validación del PO (DRA-48) y posprueba del
# Capítulo IV. Se enciende y apaga con los disparadores de GitHub Actions (DRA-52); no se aplica a
# mano. El bucket del estado lo crea la plantilla de la cuenta (infra/aws/cuenta) y se pasa al
# iniciar:  terraform init -backend-config="bucket=<bucket del estado>"

terraform {
  required_version = ">= 1.10"

  backend "s3" {
    key          = "qa/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true # bloqueo en el mismo bucket, sin DynamoDB
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  # Región fija de la cuenta: la experiencia nueva de AWS asigna us-east-2 (Ohio) a Perú (DRA-55).
  region = "us-east-2"

  # Etiquetas en todos los recursos: permiten ver el costo de QA aparte en Cost Explorer.
  default_tags {
    tags = {
      Proyecto = "dra-satipo"
      Ambiente = "qa"
      Gestion  = "terraform"
    }
  }
}

variable "respaldos_activos" {
  description = "Respaldos diarios (DRA-66). Son para PROD: en QA solo se activan para probarlos (entrada del disparador Encender)."
  type        = bool
  default     = false
}

variable "monitoreo_activo" {
  description = "Alarmas y vigilante del servidor (DRA-68). Son para PROD: en QA solo se activan para probarlos (entrada del disparador Encender)."
  type        = bool
  default     = false
}

variable "tipo_instancia" {
  description = "Tamaño del servidor de QA. Se puede cambiar al encender (entrada del disparador)."
  type        = string
  default     = "t4g.medium"
}

module "ambiente" {
  source = "../modulos/ambiente"

  ambiente       = "qa"
  tipo_instancia = var.tipo_instancia
  disco_gb       = 20

  respaldos_activos = var.respaldos_activos
  monitoreo_activo  = var.monitoreo_activo

  # Como el modo demo del entorno local: sesión de 30 minutos, sincronización con la blockchain
  # cada 30 segundos y plazo de firma de 15 minutos (los valores de producción).
  configuracion = {
    PLATAFORMA_ADMIN_NOMBRE             = "Administrador de QA"
    SESION_INACTIVIDAD                  = "30m"
    PLATAFORMA_SINCRONIZACION_INTERVALO = "30s"
    PLATAFORMA_FIRMA_PLAZO              = "15m"
  }
}

output "ambiente" {
  description = "Datos del ambiente de QA que usan los disparadores."
  value       = module.ambiente
}
