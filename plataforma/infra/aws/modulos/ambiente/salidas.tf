output "region" {
  description = "Región de AWS del ambiente."
  value       = data.aws_region.actual.region
}

output "servidor_id" {
  description = "Identificador del servidor (EC2), para encenderlo, apagarlo y desplegar con SSM."
  value       = aws_instance.servidor.id
}

output "servidor_dns" {
  description = "Nombre DNS público del servidor. Cambia en cada encendido."
  value       = aws_instance.servidor.public_dns
}

output "bucket_artefactos" {
  description = "Bucket del paquete que se despliega en el servidor."
  value       = aws_s3_bucket.artefactos.bucket
}

output "bucket_frontend" {
  description = "Bucket con el build del frontend (plataforma interna)."
  value       = aws_s3_bucket.frontend.bucket
}

output "bucket_portal" {
  description = "Bucket con el build del portal público de verificación."
  value       = aws_s3_bucket.portal.bucket
}

output "ruta_parametros" {
  description = "Ruta de Parameter Store con las variables del backend."
  value       = local.ruta_parametros
}
