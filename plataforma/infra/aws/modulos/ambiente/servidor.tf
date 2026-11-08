# Servidor único del escenario A: corre el mismo docker compose que en local (Besu, IPFS,
# PostgreSQL, backend y nginx). Apagarlo conserva el disco, y con él todos los datos.

# Última Amazon Linux 2023 para ARM. Solo se usa al crear el servidor (ver ignore_changes).
data "aws_ssm_parameter" "imagen" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

resource "aws_iam_role" "servidor" {
  name = "${local.nombre}-servidor"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Administración sin SSH: SSM Run Command (despliegues) y Session Manager (consola de emergencia).
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.servidor.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Lo único que el servidor puede leer: su paquete y los parámetros de su ambiente.
resource "aws_iam_role_policy" "servidor" {
  name = "paquete-y-parametros"
  role = aws_iam_role.servidor.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.artefactos.arn}/paquete.tar.gz"
      },
      {
        Effect = "Allow"
        Action = "ssm:GetParametersByPath"
        Resource = [
          "arn:aws:ssm:${data.aws_region.actual.region}:${data.aws_caller_identity.cuenta.account_id}:parameter${local.ruta_parametros}",
          "arn:aws:ssm:${data.aws_region.actual.region}:${data.aws_caller_identity.cuenta.account_id}:parameter${local.ruta_parametros}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_instance_profile" "servidor" {
  name = "${local.nombre}-servidor"
  role = aws_iam_role.servidor.name
}

resource "aws_instance" "servidor" {
  ami                    = data.aws_ssm_parameter.imagen.insecure_value
  instance_type          = var.tipo_instancia
  subnet_id              = aws_subnet.publica.id
  vpc_security_group_ids = [aws_security_group.servidor.id]
  iam_instance_profile   = aws_iam_instance_profile.servidor.name

  user_data = templatefile("${path.module}/arranque.sh.tftpl", {
    ambiente          = var.ambiente
    region            = data.aws_region.actual.region
    bucket_artefactos = aws_s3_bucket.artefactos.bucket
    version_compose   = "v2.40.3"
  })

  # Sin créditos "unlimited": si la CPU pasa de su línea base, el servidor se pone lento en vez de
  # cobrar extra. Para un ambiente de pruebas con presupuesto fijo es lo más seguro.
  credit_specification {
    cpu_credits = "standard"
  }

  # IMDSv2 obligatorio y con un solo salto: los contenedores no pueden leer las credenciales del
  # servidor (cada contenedor está un salto más lejos).
  metadata_options {
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.disco_gb
    encrypted             = true
    delete_on_termination = true
    tags                  = { Name = local.nombre }
  }

  tags = { Name = local.nombre }

  lifecycle {
    # Una imagen nueva de Amazon Linux reemplazaría el servidor y borraría los datos.
    ignore_changes = [ami, user_data]
  }

  depends_on = [aws_route_table_association.publica]
}
