# Red del ambiente: una VPC propia con una sola subred pública. Sin NAT ni IP elástica, que cobran
# aunque el servidor esté apagado. El servidor recibe una IP pública temporal en cada encendido;
# CloudFront llega a él por su nombre DNS público, que el disparador Encender actualiza (DRA-54).

data "aws_availability_zones" "disponibles" {
  state = "available"
}

resource "aws_vpc" "red" {
  cidr_block           = var.red_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true # el servidor necesita un nombre DNS público para ser origen de CloudFront

  tags = { Name = local.nombre }
}

resource "aws_internet_gateway" "salida" {
  vpc_id = aws_vpc.red.id
  tags   = { Name = local.nombre }
}

resource "aws_subnet" "publica" {
  vpc_id                  = aws_vpc.red.id
  cidr_block              = cidrsubnet(var.red_cidr, 8, 1)
  availability_zone       = data.aws_availability_zones.disponibles.names[0]
  map_public_ip_on_launch = true

  tags = { Name = "${local.nombre}-publica" }
}

resource "aws_route_table" "publica" {
  vpc_id = aws_vpc.red.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.salida.id
  }

  tags = { Name = "${local.nombre}-publica" }
}

resource "aws_route_table_association" "publica" {
  subnet_id      = aws_subnet.publica.id
  route_table_id = aws_route_table.publica.id
}

# Lista de direcciones que AWS mantiene para los servidores de CloudFront que se conectan a los
# orígenes. Es lo único que puede entrar al servidor: no hay SSH (se administra con SSM).
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "servidor" {
  name        = "${local.nombre}-servidor"
  description = "Solo HTTP desde CloudFront; PostgreSQL, IPFS y Besu no se exponen"
  vpc_id      = aws_vpc.red.id

  tags = { Name = "${local.nombre}-servidor" }
}

resource "aws_vpc_security_group_ingress_rule" "http_desde_cloudfront" {
  security_group_id = aws_security_group.servidor.id
  description       = "nginx, solo desde CloudFront"
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_egress_rule" "salida" {
  security_group_id = aws_security_group.servidor.id
  description       = "Descargar imágenes de Docker, el paquete de S3 y hablar con SSM"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
