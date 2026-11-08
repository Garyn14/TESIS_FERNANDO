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
