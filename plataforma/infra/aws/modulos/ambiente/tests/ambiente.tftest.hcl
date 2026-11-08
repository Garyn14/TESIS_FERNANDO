# Pruebas de la plantilla (DRA-51) sin cuenta de AWS: los proveedores se simulan y se revisa el
# plan. Comprueban las decisiones de seguridad y de costo que no deben cambiar por descuido.
#   cd infra/aws/modulos/ambiente && terraform init && terraform test

mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_region" {
    defaults = { region = "us-east-1" }
  }
  mock_data "aws_availability_zones" {
    defaults = { names = ["us-east-1a", "us-east-1b"] }
  }
  mock_data "aws_ssm_parameter" {
    defaults = { insecure_value = "ami-0123456789abcdef0" }
  }
  mock_data "aws_ec2_managed_prefix_list" {
    defaults = { id = "pl-3b927c52" }
  }
}

mock_provider "random" {}

variables {
  ambiente = "qa"
  configuracion = {
    SESION_INACTIVIDAD = "30m"
  }
}

run "servidor_barato_y_sin_sorpresas" {
  command = plan

  assert {
    condition     = aws_instance.servidor.instance_type == "t4g.medium"
    error_message = "QA usa un t4g.medium por defecto."
  }
  assert {
    condition     = aws_instance.servidor.credit_specification[0].cpu_credits == "standard"
    error_message = "Los créditos de CPU deben ser standard: unlimited puede cobrar de más."
  }
  assert {
    condition     = aws_instance.servidor.root_block_device[0].volume_type == "gp3" && aws_instance.servidor.root_block_device[0].encrypted
    error_message = "El disco debe ser gp3 y cifrado."
  }
}

run "servidor_solo_accesible_desde_cloudfront" {
  command = plan

  assert {
    condition     = aws_vpc_security_group_ingress_rule.http_desde_cloudfront.prefix_list_id == "pl-3b927c52"
    error_message = "La única entrada debe ser la lista de prefijos de CloudFront."
  }
  assert {
    condition     = aws_vpc_security_group_ingress_rule.http_desde_cloudfront.from_port == 80 && aws_vpc_security_group_ingress_rule.http_desde_cloudfront.to_port == 80
    error_message = "Solo el puerto 80 (nginx) puede estar abierto."
  }
  assert {
    condition     = aws_vpc_security_group_ingress_rule.http_desde_cloudfront.cidr_ipv4 == null
    error_message = "No se abre el servidor a direcciones de internet."
  }
  assert {
    condition     = aws_instance.servidor.metadata_options[0].http_tokens == "required" && aws_instance.servidor.metadata_options[0].http_put_response_hop_limit == 1
    error_message = "IMDSv2 obligatorio y con un salto: los contenedores no deben leer las credenciales."
  }
}

run "buckets_privados" {
  command = plan

  assert {
    condition = alltrue([
      for b in aws_s3_bucket_public_access_block.privado :
      b.block_public_acls && b.block_public_policy && b.ignore_public_acls && b.restrict_public_buckets
    ])
    error_message = "Ningún bucket puede ser público."
  }
  assert {
    condition     = length(aws_s3_bucket_public_access_block.privado) == 3
    error_message = "Los tres buckets (artefactos, frontend y portal) deben bloquear el acceso público."
  }
  assert {
    condition     = aws_s3_bucket.artefactos.bucket == "dra-satipo-qa-123456789012-artefactos"
    error_message = "Los buckets llevan el ambiente y la cuenta en el nombre."
  }
}

run "secretos_cifrados_en_parameter_store" {
  command = plan

  assert {
    condition     = alltrue([for p in aws_ssm_parameter.secreto : p.type == "SecureString"])
    error_message = "Los secretos van como SecureString (RNF03)."
  }
  assert {
    condition = toset(keys(aws_ssm_parameter.secreto)) == toset([
      "DB_PASSWORD", "PLATAFORMA_ADMIN_CONTRASENA", "ORIGEN_SECRETO", "PLATAFORMA_CLAVE_HMAC_DNI",
    ])
    error_message = "Faltan secretos del backend o de nginx."
  }
  assert {
    condition     = aws_ssm_parameter.configuracion["SESION_INACTIVIDAD"].name == "/dra-satipo/qa/SESION_INACTIVIDAD"
    error_message = "La configuración va bajo /dra-satipo/<ambiente>/, que es lo que lee el servidor."
  }
}

run "arranque_del_servidor" {
  command = plan

  assert {
    condition     = strcontains(aws_instance.servidor.user_data, "AMBIENTE=qa") && strcontains(aws_instance.servidor.user_data, "BUCKET_ARTEFACTOS=dra-satipo-qa-123456789012-artefactos")
    error_message = "El servidor debe saber su ambiente y su bucket de artefactos."
  }
  assert {
    condition     = strcontains(aws_instance.servidor.user_data, "docker-compose-linux-aarch64")
    error_message = "Docker Compose se instala para ARM."
  }
}

run "tipo_de_servidor_ajustable_pero_arm" {
  command = plan

  variables {
    tipo_instancia = "t3.medium"
  }

  expect_failures = [var.tipo_instancia]
}
