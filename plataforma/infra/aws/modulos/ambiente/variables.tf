# Un ambiente completo de la plataforma en AWS (DRA-44): QA ahora y PROD más adelante, con la
# misma plantilla y distintos valores. Escenario A de docs/arquitectura/estimacion-costos-aws.md.

variable "ambiente" {
  description = "Nombre corto del ambiente: qa o prod. Va en los nombres, las etiquetas y la ruta de Parameter Store."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{1,9}$", var.ambiente))
    error_message = "El ambiente debe ser una palabra corta en minúsculas, por ejemplo qa o prod."
  }
}

variable "tipo_instancia" {
  description = "Tamaño del servidor. Debe ser ARM (Graviton, familia t4g), porque las imágenes se descargan para arm64. Se puede cambiar con el servidor apagado."
  type        = string
  default     = "t4g.medium"

  validation {
    condition     = can(regex("^t4g\\.", var.tipo_instancia))
    error_message = "Use un tipo t4g (ARM)."
  }
}

variable "disco_gb" {
  description = "Tamaño del disco del servidor (GB): sistema, imágenes de Docker y los datos de PostgreSQL, IPFS y Besu."
  type        = number
  default     = 20
}

variable "red_cidr" {
  description = "Rango de direcciones de la red privada (VPC) del ambiente."
  type        = string
  default     = "10.40.0.0/16"
}

variable "configuracion" {
  description = "Variables no secretas del backend (application.yml) que se guardan en Parameter Store."
  type        = map(string)
  default     = {}
}

# Respaldos (DRA-66): solo para PROD. En QA se enciende únicamente para probarlos.
variable "respaldos_activos" {
  description = "Si se crean las copias diarias del disco del servidor (DRA-66). Apagado por defecto: no crea nada ni cuesta nada."
  type        = bool
  default     = false
}

variable "respaldos_hora_utc" {
  description = "Hora de la copia diaria, en UTC (HH:MM). 08:00 UTC son las 03:00 de Lima."
  type        = string
  default     = "08:00"

  validation {
    condition     = can(regex("^([01][0-9]|2[0-3]):[0-5][0-9]$", var.respaldos_hora_utc))
    error_message = "Use el formato HH:MM, en UTC."
  }
}

# Monitoreo (DRA-68): solo para PROD. En QA se enciende únicamente para probarlo.
variable "monitoreo_activo" {
  description = "Si se crean las alarmas y corre el vigilante del servidor (DRA-68). Apagado por defecto: no crea nada ni cuesta nada."
  type        = bool
  default     = false
}

variable "monitoreo_tema" {
  description = "Tema de SNS de la cuenta que envía las alertas por correo (lo crea infra/aws/cuenta/cuenta.yml)."
  type        = string
  default     = "dra-satipo-alertas"
}

variable "monitoreo_disco_umbral" {
  description = "Porcentaje del disco usado a partir del cual se avisa."
  type        = number
  default     = 85

  validation {
    condition     = var.monitoreo_disco_umbral >= 50 && var.monitoreo_disco_umbral <= 95
    error_message = "Entre 50 y 95 por ciento."
  }
}

variable "respaldos_retencion" {
  description = "Cuántas copias diarias se conservan; la más antigua se borra sola."
  type        = number
  default     = 30

  validation {
    condition     = var.respaldos_retencion >= 1 && var.respaldos_retencion <= 1000
    error_message = "Entre 1 y 1000 copias."
  }
}
