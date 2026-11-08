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
