# Respaldos del servidor (DRA-66): una copia diaria del disco completo con Data Lifecycle Manager.
# El disco guarda PostgreSQL, el IPFS privado, los 4 nodos Besu y sus claves: una sola copia los
# toma en el mismo instante, así que al restaurar siempre coinciden entre sí. Antes de cada copia,
# el servidor deja además un volcado de PostgreSQL (servidor/volcar-base.sh).
#
# Interruptor: respaldos_activos. Apagado (por defecto) no crea la política ni el rol, ni cuesta
# nada. Es para PROD (DRA-65); en QA solo se enciende para probarlo.
# Restaurar: acciones/restaurar-respaldo.sh y docs/arquitectura/respaldos.md.

locals {
  respaldos = var.respaldos_activos ? 1 : 0
}

# Rol con el que Data Lifecycle Manager crea y borra las copias. El nombre termina en -respaldos:
# la cuenta solo deja crear ese rol y entregárselo a DLM (infra/aws/cuenta/cuenta.yml).
resource "aws_iam_role" "respaldos" {
  count = local.respaldos
  name  = "${local.nombre}-respaldos"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "dlm.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "respaldos" {
  count      = local.respaldos
  role       = aws_iam_role.respaldos[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "respaldos" {
  count = local.respaldos
  # DLM solo acepta letras sin tildes, números, espacios, guiones y guiones bajos.
  description        = "Copia diaria del disco de ${local.nombre} - DRA-66"
  execution_role_arn = aws_iam_role.respaldos[0].arn
  state              = "ENABLED"

  policy_details {
    # INSTANCE: copia todos los discos del servidor en el mismo instante.
    resource_types = ["INSTANCE"]
    target_tags    = { Respaldo = local.nombre }

    schedule {
      name      = "diaria"
      copy_tags = true

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = [var.respaldos_hora_utc]
      }

      # Las últimas N copias; la más antigua se borra sola. Las de "Respaldar ahora" no cuentan:
      # se borran a mano (docs/arquitectura/respaldos.md).
      retain_rule {
        count = var.respaldos_retencion
      }

      tags_to_add = {
        Ambiente       = var.ambiente
        TipoDeRespaldo = "diario"
      }
    }
  }
}
