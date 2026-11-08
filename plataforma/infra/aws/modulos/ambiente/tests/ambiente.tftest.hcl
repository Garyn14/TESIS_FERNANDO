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

run "cloudfront_rutas_y_cache" {
  command = plan

  assert {
    condition     = [for b in aws_cloudfront_distribution.sitio["plataforma"].ordered_cache_behavior : b.path_pattern] == ["/api/*", "/rpc"]
    error_message = "La plataforma envía /api/* y /rpc al servidor."
  }
  assert {
    condition     = [for b in aws_cloudfront_distribution.sitio["portal"].ordered_cache_behavior : b.path_pattern] == ["/api/verificacion/*"]
    error_message = "El portal solo envía /api/verificacion/* al servidor: el resto de la API no se publica."
  }
  assert {
    condition = alltrue(flatten([
      for d in aws_cloudfront_distribution.sitio : [
        for b in d.ordered_cache_behavior :
        b.cache_policy_id == "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" && b.target_origin_id == "servidor" && b.viewer_protocol_policy == "https-only"
      ]
    ]))
    error_message = "La API y el RPC van al servidor, solo por HTTPS y sin caché."
  }
  assert {
    condition     = alltrue([for d in aws_cloudfront_distribution.sitio : d.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https"])
    error_message = "Las pantallas pasan siempre a HTTPS."
  }
  assert {
    condition     = length(aws_cloudfront_distribution.sitio["portal"].default_cache_behavior[0].function_association) == 1 && length(aws_cloudfront_distribution.sitio["plataforma"].default_cache_behavior[0].function_association) == 0
    error_message = "Solo el portal reescribe sus rutas (/verificar/{token}); la plataforma usa rutas con #."
  }
}

run "cloudfront_llega_al_servidor_con_el_secreto" {
  command = plan

  assert {
    condition = alltrue([
      for d in aws_cloudfront_distribution.sitio : anytrue([
        for o in d.origin : o.origin_id == "servidor" && one(o.custom_header).name == "X-Origen-Secreto"
      ])
    ])
    error_message = "CloudFront debe agregar el encabezado secreto que exige nginx."
  }
  assert {
    condition     = alltrue([for d in aws_cloudfront_distribution.sitio : length(d.custom_error_response) == 2 && alltrue([for e in d.custom_error_response : e.response_page_path == "/_estado/apagado.json" && e.response_code == 503])])
    error_message = "Con el servidor apagado (502/504) se entrega el aviso en JSON."
  }
  assert {
    condition     = strcontains(aws_s3_object.aviso_de_apagado["portal"].content, "El ambiente de QA está apagado")
    error_message = "El aviso dice que el ambiente está apagado, con el formato de error del backend."
  }
}

run "direcciones_para_el_backend" {
  command = plan

  assert {
    condition     = aws_ssm_parameter.direcciones["PLATAFORMA_PORTAL_URL"].name == "/dra-satipo/qa/PLATAFORMA_PORTAL_URL"
    error_message = "El backend recibe la dirección del portal para el QR."
  }
  assert {
    condition     = aws_ssm_parameter.direcciones["BESU_RPC_PUBLICA"].name == "/dra-satipo/qa/BESU_RPC_PUBLICA"
    error_message = "El backend recibe la dirección del RPC para MetaMask."
  }
}
