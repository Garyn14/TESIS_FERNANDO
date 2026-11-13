# Estimación de costos de AWS

- **Tarea Jira:** DRA-44 (Provisionar la infraestructura en AWS)
- **Fecha:** 29/10/2026
- **Moneda:** dólares estadounidenses (USD). Precios bajo demanda (*on-demand*), sin descuentos por reserva.
- **Fuente:** listas de precios públicas de AWS publicadas el 28/10/2026 (ver §7).

## 1. Resumen

Todos los montos son **por mes** salvo que la columna diga otra cosa. Un mes = 730 horas.

### us-east-1 (Virginia) — recomendada

| Escenario | Para qué sirve | Por mes | Por mes + IGV 18% | 3 meses | 3 meses + IGV |
|---|---|---|---|---|---|
| **A. Mínimo, encendido todo el día** | Piloto de la tesis | **$64,21** | $75,76 | $192,62 | $227,29 |
| **A. Mínimo, encendido en horario de trabajo** (10 h × 5 días) | Piloto de la tesis, ahorrando | **$29,73** | $35,08 | $89,20 | $105,25 |
| B. Recomendado | Arquitectura más robusta | $148,38 | $175,09 | $445,14 | $525,26 |
| C. Alta disponibilidad | Producción real; solo para describirla en la tesis | $288,58 | $340,53 | $865,75 | $1.021,58 |

### sa-east-1 (São Paulo) — referencia

| Escenario | Por mes | 3 meses |
|---|---|---|
| A. Mínimo, encendido todo el día | $98,81 | $296,42 |
| A. Mínimo, en horario de trabajo | $43,81 | $131,44 |
| B. Recomendado | $228,78 | $686,35 |
| C. Alta disponibilidad | $465,09 | $1.395,26 |

**Recomendación:** escenario A en us-east-1, apagando el servidor cuando no se use. Costo esperado para la tesis: **entre $0 y $105**, según cuánto cubran los créditos gratuitos (§5).

## 2. Cuándo se necesita AWS

El desarrollo completo corre en local con Docker, sin costo (DRA-45, DRA-46). AWS solo hace falta para:

- las **pruebas de aceptación** con el Product Owner en un entorno accesible por internet;
- el **portal público de verificación** (HU19–HU21), que deben poder usar terceros;
- la **posprueba del Capítulo IV**, que debe correr en un entorno real.

Por eso la estimación considera **3 meses**: desde el final del Sprint 3 hasta la posprueba.

## 3. Consumo medido

Medido el 29/10/2026 con toda la plataforma levantada en local (`docker stats`), en reposo:

| Servicio | Memoria |
|---|---|
| 4 nodos Besu | 340–415 MiB cada uno (~1,56 GiB en total) |
| Backend (JVM) | ~388 MiB |
| IPFS (Kubo) | ~64 MiB |
| PostgreSQL | ~52 MiB |
| **Total** | **~2,1 GiB** |

Con margen para carga y crecimiento de la memoria de la JVM (×2–3), se necesitan **~6 GiB**. Por eso el escenario A usa un `t4g.large` (8 GiB). Un `t4g.medium` (4 GiB) quedaría justo.

Los datos de la cadena crecen poco: ~77 MB por nodo tras varias horas con bloques vacíos cada 2 s. Los discos de 40–60 GB alcanzan con holgura para el período de la tesis.

## 4. Escenarios

### A. Mínimo (piloto de la tesis)

Un solo servidor con el mismo `docker compose` que se usa en local (4 nodos Besu, IPFS, PostgreSQL y backend). El frontend se publica como sitio estático en S3 + CloudFront.

| Componente | Precio unitario (us-east-1) | Por mes |
|---|---|---|
| EC2 `t4g.large` (2 vCPU ARM, 8 GiB) | $0,0672/h | $49,06 |
| Disco EBS gp3, 60 GB | $0,08/GB-mes | $4,80 |
| IPv4 pública (1) | $0,005/h | $3,65 |
| Secrets Manager (3: contraseña inicial del Administrador, clave HMAC del DNI, clave de enjambre de IPFS) | $0,40/secreto-mes | $1,20 |
| Copias del disco (snapshots), 60 GB | ~$0,05/GB-mes | $3,00 |
| CloudWatch (registros y alarmas básicas) | estimado | $2,00 |
| S3 + CloudFront (frontend) | estimado | $0,50 |
| **Total** | | **$64,21** |

Encendido solo en horario de trabajo (~217 h/mes), el EC2 baja a $14,58 y el total a **$29,73**. AWS cobra el EC2 solo mientras está encendido; el disco y la IP sí se cobran siempre.

- **Cumple RNF06** (99% de disponibilidad mensual): AWS garantiza 99,5% para una instancia EC2 individual.
- **Limitación:** si el servidor falla, cae todo el sistema hasta que se recupere. Es aceptable para un piloto, no para producción.

### B. Recomendado

| Componente | Por mes (us-east-1) |
|---|---|
| 2 × EC2 `t4g.medium` para Besu (2 validadores cada uno, en zonas de disponibilidad distintas) | $49,06 |
| 1 × EC2 `t4g.medium` para backend + IPFS | $24,53 |
| RDS PostgreSQL `db.t4g.micro`, una zona, 20 GB | $13,98 |
| Balanceador de carga (ALB) con 1 LCU | $22,27 |
| EBS 3 × 40 GB | $9,60 |
| IPv4 públicas (3 EC2 + 2 del ALB) | $18,25 |
| Secrets Manager, snapshots, CloudWatch, frontend | $10,70 |
| **Total** | **$148,38** |

**Qué mejora frente a A:**
- El backend y la base de datos quedan separados de la blockchain.
- PostgreSQL pasa a un servicio administrado (RDS), con copias automáticas.
- El ALB permite publicar la plataforma con HTTPS.

**Qué no mejora:** con 4 validadores repartidos 2 + 2, si cae uno de los dos servidores de Besu quedan 2 de 4 validadores. QBFT necesita más de 2/3 activos, así que **la red deja de producir bloques** hasta que el servidor vuelva. Para tolerar la caída de un servidor de Besu hace falta el escenario C, con un validador por servidor.

### C. Alta disponibilidad (producción)

| Componente | Por mes (us-east-1) |
|---|---|
| 4 × EC2 `t4g.medium` para Besu (1 validador por servidor; tolera la caída de 1) | $98,11 |
| 2 × EC2 `t4g.medium` para backend + IPFS (réplica) | $49,06 |
| RDS PostgreSQL `db.t4g.small` Multi-AZ, 20 GB | $52,05 |
| ALB con 1 LCU | $22,27 |
| EBS 6 × 40 GB | $19,20 |
| IPv4 públicas (6 EC2 + 2 del ALB) | $29,20 |
| Secrets Manager, snapshots, CloudWatch, frontend | $18,70 |
| **Total** | **$288,58** |

Es la arquitectura que conviene **describir** en la tesis como despliegue de producción para la DRA, sin necesidad de levantarla.

## 4b. Respaldos de PROD (DRA-66)

Una copia diaria del disco del servidor con Data Lifecycle Manager, que no cobra; solo se paga el almacenamiento de las copias: **$0,05 por GB al mes** en us-east-2.

| Concepto | Supuesto | Costo al mes |
|---|---|---|
| Primera copia (completa) | 5,4 GB, medido en QA el 13/11/2026 (disco de 20 GB) | ~$0,27 |
| Copias siguientes (solo los cambios) | 100–300 MB por día × 30 copias guardadas | ~$0,15–0,45 |
| **Total** | | **menos de $1** (hasta ~$2 si la base de datos y los PDF crecen) |

En QA los respaldos están apagados y no cuestan nada.

## 5. Créditos y cargos adicionales

- **Créditos gratuitos:** desde julio de 2025, las cuentas nuevas de AWS reciben hasta **$200 en créditos válidos por 6 meses**. Con eso, el escenario A de 3 meses ($192,62) quedaría prácticamente cubierto. *Hay que confirmar las condiciones vigentes al crear la cuenta.*
- **IGV:** en Perú, los servicios digitales prestados desde el extranjero a personas naturales pagan IGV del 18%. Aplica si la cuenta está a nombre de una persona natural.
- **Tráfico de salida:** los primeros 100 GB al mes son gratuitos. No se esperan más en el piloto.
- **No incluido:** dominio. El certificado TLS (ACM) es gratuito. El dominio `verifica.agrojunin.gob.pe` del prototipo lo tendría que gestionar la institución, porque los dominios `.gob.pe` los administra el Estado.

## 6. Región

| Criterio | us-east-1 (Virginia) | sa-east-1 (São Paulo) |
|---|---|---|
| Costo del escenario A | $64,21 | $98,81 (+54%) |
| Latencia aproximada desde Perú | ~100–130 ms | ~60–80 ms |

La diferencia de latencia no afecta el RNF01, porque la verificación debe responder en menos de 2 s. **Se recomienda us-east-1.**

**Protección de datos (Ley 29733):** cualquier región de AWS está fuera del Perú, por lo que hay **transferencia internacional de datos personales**. La ley la permite con condiciones. Hay que mencionarlo en la tesis y en el diseño.

## 7. Cómo se obtuvieron los precios

1. Se descargaron las listas de precios públicas de AWS, que no requieren cuenta: `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<servicio>/current/<región>/index.csv`, para AmazonEC2, AmazonRDS, AWSELB, AmazonVPC y AWSSecretsManager, en us-east-1 y sa-east-1.
2. Se filtraron con [`costos/extraer_precios.py`](costos/extraer_precios.py): Linux, uso compartido y bajo demanda.
3. Precios unitarios obtenidos:

| Recurso | us-east-1 | sa-east-1 |
|---|---|---|
| EC2 `t4g.medium` (4 GiB) | $0,0336/h | $0,0536/h |
| EC2 `t4g.large` (8 GiB) | $0,0672/h | $0,1072/h |
| EBS gp3 | $0,08/GB-mes | $0,152/GB-mes |
| RDS PostgreSQL `db.t4g.micro` una zona | $0,016/h | $0,034/h |
| RDS PostgreSQL `db.t4g.small` Multi-AZ | $0,065/h | $0,137/h |
| Almacenamiento RDS gp3 | $0,115/GB-mes | $0,219/GB-mes |
| ALB | $0,0225/h + $0,008/LCU-h | $0,034/h + $0,011/LCU-h |
| IPv4 pública | $0,005/h | $0,005/h |
| Secrets Manager | $0,40/secreto-mes | $0,40/secreto-mes |

Los montos de CloudWatch, snapshots y S3 + CloudFront son estimados de uso bajo. Para el presupuesto final conviene recalcularlos en la [calculadora de AWS](https://calculator.aws/).
