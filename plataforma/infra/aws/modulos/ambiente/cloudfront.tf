# Direcciones fijas con HTTPS (DRA-54): una distribución de CloudFront para la plataforma interna y
# otra para el portal público. Sus direcciones *.cloudfront.net no cambian al apagar o encender el
# servidor, así que el QR de los PDF firmados en el ambiente sigue funcionando (HU16, HU19).
# Para PROD se les agrega el dominio de la DRA y un certificado de ACM.

locals {
  # Políticas administradas por AWS (sus identificadores son fijos y públicos).
  cache_optimizado       = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  sin_cache              = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # Managed-CachingDisabled
  todo_menos_host        = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # Managed-AllViewerExceptHostHeader
  cabeceras_de_seguridad = "67f7725c-6f97-4210-82d7-5512b31e9d03" # Managed-SecurityHeadersPolicy
  todos_los_metodos      = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
  metodos_de_lectura     = ["GET", "HEAD"]
  origen_s3              = "s3"
  origen_servidor        = "servidor"
  ruta_aviso_de_apagado  = "/_estado/apagado.json"

  # Con el servidor apagado no tiene nombre DNS público. CloudFront exige un nombre válido: se usa
  # uno que nunca responde y el disparador Encender pone el real (DRA-52).
  dns_del_servidor = coalesce(aws_instance.servidor.public_dns, "servidor-apagado.invalid")

  sitios = {
    plataforma = {
      bucket     = aws_s3_bucket.frontend
      comentario = "Plataforma interna (${var.ambiente})"
      rutas_api  = ["/api/*", "/rpc"]
      reescribir = false
    }
    portal = {
      bucket     = aws_s3_bucket.portal
      comentario = "Portal público de verificación (${var.ambiente})"
      rutas_api  = ["/api/verificacion/*"]
      reescribir = true
    }
  }
}

resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "${local.nombre}-s3"
  description                       = "CloudFront lee los buckets privados del frontend y del portal"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rutas_del_portal" {
  name    = "${local.nombre}-rutas-del-portal"
  runtime = "cloudfront-js-2.0"
  comment = "Sirve index.html en /verificar/{token} y demás rutas del portal"
  publish = true
  code    = file("${path.module}/rutas-del-portal.js")
}

resource "aws_cloudfront_distribution" "sitio" {
  for_each = local.sitios

  enabled             = true
  comment             = each.value.comentario
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  # Todas las ubicaciones, incluida Sudamérica: el tráfico de QA cabe en la capa gratuita (1 TB).
  price_class = "PriceClass_All"

  origin {
    origin_id                = local.origen_s3
    domain_name              = each.value.bucket.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  origin {
    origin_id   = local.origen_servidor
    domain_name = local.dns_del_servidor

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
      origin_read_timeout    = 60
    }

    # nginx rechaza todo pedido que no traiga este encabezado (servidor/nginx.conf.template).
    custom_header {
      name  = "X-Origen-Secreto"
      value = random_password.origen.result
    }
  }

  # Archivos del build (S3). index.html se sube con Cache-Control: no-cache (DRA-52) para que cada
  # publicación se vea de inmediato; los demás llevan un hash en el nombre y se guardan en caché.
  default_cache_behavior {
    target_origin_id           = local.origen_s3
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = local.metodos_de_lectura
    cached_methods             = local.metodos_de_lectura
    compress                   = true
    cache_policy_id            = local.cache_optimizado
    response_headers_policy_id = local.cabeceras_de_seguridad

    dynamic "function_association" {
      for_each = each.value.reescribir ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.rutas_del_portal.arn
      }
    }
  }

  # API y RPC: nunca en caché, con todas las cabeceras, cookies y la consulta del visitante. Host
  # no se reenvía (el servidor no tiene certificado para *.cloudfront.net). CloudFront agrega la IP
  # del visitante al final de X-Forwarded-For, que es la que cuenta el límite de HU20.
  dynamic "ordered_cache_behavior" {
    for_each = each.value.rutas_api
    content {
      path_pattern             = ordered_cache_behavior.value
      target_origin_id         = local.origen_servidor
      viewer_protocol_policy   = "https-only"
      allowed_methods          = local.todos_los_metodos
      cached_methods           = local.metodos_de_lectura
      compress                 = true
      cache_policy_id          = local.sin_cache
      origin_request_policy_id = local.todo_menos_host
    }
  }

  # Servidor apagado o arrancando: en lugar del error de CloudFront, un JSON con el mismo formato
  # que los errores del backend ({"mensaje": …}), que la plataforma y el portal ya muestran.
  custom_error_response {
    error_code            = 502
    response_code         = 503
    response_page_path    = local.ruta_aviso_de_apagado
    error_caching_min_ttl = 5
  }
  custom_error_response {
    error_code            = 504
    response_code         = 503
    response_page_path    = local.ruta_aviso_de_apagado
    error_caching_min_ttl = 5
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Certificado *.cloudfront.net de AWS, gratis. Con dominio propio (PROD) se cambia por uno de ACM.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# Aviso que CloudFront entrega cuando el servidor no responde. Va en una carpeta que la
# publicación del build no toca (DRA-52 sincroniza con --exclude "_estado/*").
resource "aws_s3_object" "aviso_de_apagado" {
  for_each = local.sitios

  bucket        = each.value.bucket.id
  key           = trimprefix(local.ruta_aviso_de_apagado, "/")
  content_type  = "application/json; charset=utf-8"
  cache_control = "no-cache"
  content = jsonencode({
    mensaje = "El ambiente de ${upper(var.ambiente)} está apagado o encendiéndose. Intente nuevamente en unos minutos."
    campos  = {}
  })
}

# Cada bucket solo se deja leer por su propia distribución (Origin Access Control).
resource "aws_s3_bucket_policy" "solo_cloudfront" {
  for_each = local.sitios

  bucket = each.value.bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "LecturaDesdeCloudFront"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${each.value.bucket.arn}/*"
      Condition = {
        StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.sitio[each.key].arn }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.privado]
}

# Direcciones que el backend necesita conocer: la del portal va en el QR y en la leyenda de cada
# PDF (HU16), y la del RPC se ofrece a MetaMask del Director (HU06).
resource "aws_ssm_parameter" "direcciones" {
  for_each = {
    PLATAFORMA_PORTAL_URL = "https://${aws_cloudfront_distribution.sitio["portal"].domain_name}"
    BESU_RPC_PUBLICA      = "https://${aws_cloudfront_distribution.sitio["plataforma"].domain_name}/rpc"
  }

  name  = "${local.ruta_parametros}/${each.key}"
  type  = "String"
  value = each.value
}
