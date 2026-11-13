# Monitoreo y alertas (DRA-68): un correo cuando el servidor, la plataforma, la blockchain, el IPFS
# o el disco fallan, y otro cuando se recuperan. También avisa si falla una copia de DRA-66.
#
# - El vigilante del servidor (servidor/vigilar.sh) publica cada minuto una métrica por parte
#   en el espacio DRA-Satipo de CloudWatch (1 = funciona, 0 = no).
# - Las alarmas miran ventanas de 5 minutos y avisan si dos seguidas fallan (unos 10 minutos).
#   Con un reporte por minuto, una ventana solo queda vacía si el vigilante de verdad dejó de correr.
# - Al activar el monitoreo, la alarma de la plataforma puede avisar una vez antes del primer
#   reporte del vigilante (no hay datos todavía) y pasar a OK a los pocos minutos.
# - Los correos salen del tema de SNS de la cuenta (cuenta.yml), con el correo de las alertas del
#   presupuesto: así el correo no está en el repositorio. Hay que confirmar la suscripción una vez.
#
# Interruptor: monitoreo_activo. Apagado (por defecto) no crea nada, el vigilante no corre y no
# cuesta nada. Es para PROD (DRA-65): QA se apaga cada noche y avisaría todos los días.
# Costo: dentro de la capa gratuita permanente de CloudWatch (10 métricas y 10 alarmas).
# Qué hacer ante cada alerta: docs/arquitectura/monitoreo.md.

locals {
  monitoreo       = var.monitoreo_activo ? 1 : 0
  espacio         = "DRA-Satipo"
  revision        = 300                               # segundos: ventana de cada alarma (el vigilante reporta cada minuto)
  tema_de_alertas = data.aws_sns_topic.alertas[*].arn # vacío con el monitoreo apagado

  # Alarmas sobre las métricas del vigilante.
  #   sin_datos: qué pasa si el vigilante no reporta. Solo la plataforma lo cuenta como falla: así,
  #   con el servidor caído llega una sola alerta y no cuatro.
  alarmas = {
    plataforma = {
      metrica     = "Plataforma"
      titulo      = "La plataforma no responde"
      descripcion = "El backend no responde su salud (o la base de datos falla), o el vigilante dejó de reportar porque el servidor está caído. Los ciudadanos no pueden verificar documentos."
      comparacion = "LessThanThreshold"
      umbral      = 1
      sin_datos   = "breaching"
    }
    blockchain = {
      metrica     = "Blockchain"
      titulo      = "La blockchain no produce bloques"
      descripcion = "La red Besu dejó de producir bloques: faltan validadores (hacen falta 3 de 4). No se puede firmar, anular ni verificar."
      comparacion = "LessThanThreshold"
      umbral      = 1
      sin_datos   = "notBreaching"
    }
    ipfs = {
      metrica     = "IPFS"
      titulo      = "El IPFS no responde"
      descripcion = "El IPFS privado no está sano: no se pueden guardar ni mostrar los PDF."
      comparacion = "LessThanThreshold"
      umbral      = 1
      sin_datos   = "notBreaching"
    }
    disco = {
      metrica     = "DiscoUsado"
      titulo      = "El disco supera el ${var.monitoreo_disco_umbral} por ciento"
      descripcion = "El disco del servidor se está llenando. Si se llena, la base de datos, el IPFS y la blockchain dejan de funcionar."
      comparacion = "GreaterThanThreshold"
      umbral      = var.monitoreo_disco_umbral
      sin_datos   = "notBreaching"
    }
  }
}

# El tema lo crea la pila de la cuenta (cuenta.yml). Si no existe, el plan falla aquí con un
# mensaje claro, antes de crear nada.
data "aws_sns_topic" "alertas" {
  count = local.monitoreo
  name  = var.monitoreo_tema
}

resource "aws_cloudwatch_metric_alarm" "vigilante" {
  for_each = var.monitoreo_activo ? local.alarmas : {}

  alarm_name          = "${local.nombre} - ${each.value.titulo}"
  alarm_description   = "${each.value.descripcion} Qué hacer: docs/arquitectura/monitoreo.md (DRA-68)."
  namespace           = local.espacio
  metric_name         = each.value.metrica
  dimensions          = { Ambiente = var.ambiente }
  statistic           = each.value.comparacion == "LessThanThreshold" ? "Minimum" : "Maximum"
  period              = local.revision
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  comparison_operator = each.value.comparacion
  threshold           = each.value.umbral
  treat_missing_data  = each.value.sin_datos
  alarm_actions       = local.tema_de_alertas
  ok_actions          = local.tema_de_alertas
}

# La máquina misma (las comprobaciones de estado de EC2 las hace AWS, sin el vigilante).
resource "aws_cloudwatch_metric_alarm" "servidor" {
  count = local.monitoreo

  alarm_name          = "${local.nombre} - El servidor falla"
  alarm_description   = "AWS detecta una falla en la máquina o en su sistema operativo. Qué hacer: docs/arquitectura/monitoreo.md (DRA-68)."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = aws_instance.servidor.id }
  statistic           = "Maximum"
  period              = local.revision
  evaluation_periods  = 2
  datapoints_to_alarm = 2
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.tema_de_alertas
  ok_actions          = local.tema_de_alertas
}

# DRA-66: una copia del disco que falla (de la política diaria o de "Respaldar ahora").
resource "aws_cloudwatch_event_rule" "copia_fallida" {
  count       = local.monitoreo
  name        = "${local.nombre}-copia-fallida"
  description = "Avisa si falla una copia del disco - DRA-68"
  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EBS Multi-Volume Snapshots Completion Status", "EBS Snapshot Notification"]
    detail      = { result = ["failed"] }
  })
}

resource "aws_cloudwatch_event_target" "copia_fallida" {
  count = local.monitoreo
  rule  = aws_cloudwatch_event_rule.copia_fallida[0].name
  arn   = data.aws_sns_topic.alertas[0].arn

  input_transformer {
    input_paths = { hora = "$.time", detalle = "$.detail" }
    input_template = jsonencode(
      "Falló una copia del disco de ${local.nombre} (<hora>, UTC). Revise EC2 -> Snapshots y tome una copia con \"Respaldar ahora\". Guía: docs/arquitectura/respaldos.md. Detalle de AWS: <detalle>"
    )
  }
}
