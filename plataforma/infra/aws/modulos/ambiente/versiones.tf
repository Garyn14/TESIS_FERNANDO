terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

data "aws_caller_identity" "cuenta" {}
data "aws_region" "actual" {}

locals {
  nombre = "dra-satipo-${var.ambiente}"
  # Los nombres de los buckets son únicos en todo AWS: llevan el número de cuenta.
  prefijo_buckets = "${local.nombre}-${data.aws_caller_identity.cuenta.account_id}"
  ruta_parametros = "/dra-satipo/${var.ambiente}"
}
