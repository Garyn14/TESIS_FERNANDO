# Buckets del ambiente. Ninguno es público: el frontend y el portal se publican a través de
# CloudFront (DRA-54) y el paquete solo lo lee el servidor. force_destroy permite que el
# disparador Destruir (DRA-52) los borre con su contenido.

resource "aws_s3_bucket" "artefactos" {
  bucket        = "${local.prefijo_buckets}-artefactos"
  force_destroy = true
}

resource "aws_s3_bucket" "frontend" {
  bucket        = "${local.prefijo_buckets}-frontend"
  force_destroy = true
}

resource "aws_s3_bucket" "portal" {
  bucket        = "${local.prefijo_buckets}-portal"
  force_destroy = true
}

locals {
  buckets = {
    artefactos = aws_s3_bucket.artefactos.id
    frontend   = aws_s3_bucket.frontend.id
    portal     = aws_s3_bucket.portal.id
  }
}

resource "aws_s3_bucket_public_access_block" "privado" {
  for_each = local.buckets

  bucket                  = each.value
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "sin_acl" {
  for_each = local.buckets

  bucket = each.value
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Política de cada bucket (una sola por bucket en S3). DRA-82: todos niegan cualquier acceso que no
# use HTTPS. Además, el del frontend y el del portal solo se dejan leer por su propia distribución
# de CloudFront (Origin Access Control, DRA-54). Va una política por bucket, escrita completa, para
# que la revisión estática la reconozca (con for_each no la seguía).
resource "aws_s3_bucket_policy" "artefactos" {
  bucket = aws_s3_bucket.artefactos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "SoloHttps"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.artefactos.arn, "${aws_s3_bucket.artefactos.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.privado]
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "SoloHttps"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.frontend.arn, "${aws_s3_bucket.frontend.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "LecturaDesdeCloudFront"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.sitio["plataforma"].arn }
        }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.privado]
}

resource "aws_s3_bucket_policy" "portal" {
  bucket = aws_s3_bucket.portal.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "SoloHttps"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.portal.arn, "${aws_s3_bucket.portal.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "LecturaDesdeCloudFront"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.portal.arn}/*"
        Condition = {
          StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.sitio["portal"].arn }
        }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.privado]
}

# La política de la plataforma y del portal antes se llamaba solo_cloudfront: Terraform la
# actualiza en su lugar, sin borrarla y crearla de nuevo.
moved {
  from = aws_s3_bucket_policy.solo_cloudfront["plataforma"]
  to   = aws_s3_bucket_policy.frontend
}

moved {
  from = aws_s3_bucket_policy.solo_cloudfront["portal"]
  to   = aws_s3_bucket_policy.portal
}
