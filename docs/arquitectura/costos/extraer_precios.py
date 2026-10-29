"""Extrae de las listas de precios públicas de AWS los precios usados en estimacion-costos-aws.md.

Uso:
    python3 extraer_precios.py <carpeta>   # carpeta con los CSV descargados

Descarga (sin cuenta de AWS), por cada región (us-east-1, sa-east-1) y servicio
(AmazonEC2, AmazonRDS, AWSELB, AmazonVPC, AWSSecretsManager):
    https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/<servicio>/current/<región>/index.csv
y se guarda como <prefijo>-<región>.csv con prefijo ec2, rds, elb, vpc o sm.
"""

import csv
import sys

CARPETA = sys.argv[1] if len(sys.argv) > 1 else "."
INSTANCIAS = {"t4g.small", "t4g.medium", "t4g.large", "t4g.xlarge"}


def filas(nombre):
    archivo = open(f"{CARPETA}/{nombre}", newline="", encoding="utf-8")
    for _ in range(5):  # las 5 primeras líneas son metadatos
        archivo.readline()
    return csv.DictReader(archivo)


for region in ["us-east-1", "sa-east-1"]:
    print("=====", region)
    for x in filas(f"ec2-{region}.csv"):
        if x["TermType"] != "OnDemand":
            continue
        if (
            x["Instance Type"] in INSTANCIAS
            and x["Operating System"] == "Linux"
            and x["Tenancy"] == "Shared"
            and x["Pre Installed S/W"] == "NA"
            and x["CapacityStatus"] == "Used"
            and x["License Model"] == "No License required"
            and x["Unit"] == "Hrs"
        ):
            print("EC2", x["Instance Type"], x.get("Memory"), x["PricePerUnit"], "USD/h")
        if x["Product Family"] == "Storage" and x.get("Volume API Name") == "gp3":
            print("EBS gp3", x["PricePerUnit"], "USD/GB-mes")
    for x in filas(f"rds-{region}.csv"):
        if x["TermType"] != "OnDemand" or x["Database Engine"] != "PostgreSQL":
            continue
        if (
            x["Instance Type"] in ("db.t4g.micro", "db.t4g.small")
            and x["Deployment Option"] in ("Single-AZ", "Multi-AZ")
            and x["Unit"] == "Hrs"
        ):
            print("RDS", x["Instance Type"], x["Deployment Option"], x["PricePerUnit"], "USD/h")
        if (
            x["Product Family"] == "Database Storage"
            and x.get("Volume Type", "").startswith("General Purpose-GP3")
            and x["Deployment Option"] == "Single-AZ"
        ):
            print("RDS gp3", x["PricePerUnit"], "USD/GB-mes")
    for x in filas(f"elb-{region}.csv"):
        if x["TermType"] == "OnDemand" and x["Product Family"] == "Load Balancer-Application":
            print("ALB", x["usageType"], x["PricePerUnit"], x["Unit"])
    for x in filas(f"vpc-{region}.csv"):
        if x["TermType"] == "OnDemand" and "PublicIPv4:InUseAddress" in x.get("usageType", ""):
            print("IPv4 pública", x["PricePerUnit"], "USD/h")
    for x in filas(f"sm-{region}.csv"):
        if x["TermType"] == "OnDemand" and x["Unit"] == "Secrets":
            print("Secrets Manager", x["PricePerUnit"], "USD/secreto-mes")
