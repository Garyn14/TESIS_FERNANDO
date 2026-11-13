# Monitoreo y alertas (DRA-68)

**Para quién:** el responsable de sistemas de la agencia. **Alcance:** PROD. En QA el monitoreo está apagado (QA se apaga cada noche y avisaría a diario); solo se enciende para probarlo.

## 1. Qué se vigila

Un **vigilante** corre en el servidor cada 5 minutos y deja el resultado en CloudWatch, el servicio de alertas de AWS. Si una parte falla **en dos revisiones seguidas** (unos 10 minutos), llega un correo con el asunto `ALARM: "dra-satipo-<ambiente> - …"`. Cuando se recupera, llega otro con `OK: …`.

| Alerta | Qué significa | Qué hacer |
|---|---|---|
| **La plataforma no responde** | El backend no responde, la base de datos falla, o el servidor está caído (el vigilante dejó de reportar). Nadie puede verificar documentos | Ver la sección 2 |
| **La blockchain no produce bloques** | Faltan validadores: la red necesita 3 de los 4 nodos. No se puede firmar, anular ni verificar | Ver la sección 3 |
| **El IPFS no responde** | No se pueden guardar ni mostrar los PDF | `docker restart plataforma-ipfs-1` (sección 2) |
| **El disco supera el 85 por ciento** | El disco se está llenando: si se llena, todo se detiene | Ver la sección 4 |
| **El servidor falla** | AWS detectó una falla en la máquina | En la consola de AWS, **EC2 → Instances → Reboot**. Si sigue, **Stop** y **Start** (la máquina cambia de equipo físico; los datos se conservan) |
| **Falló una copia del disco** (correo sin "ALARM") | La copia diaria de DRA-66 no se hizo | Tome una con "Respaldar ahora" (ver `respaldos.md`). Si vuelve a fallar, revise **EC2 → Snapshots** |

Si el servidor se cae por completo, llega **una sola alerta** ("La plataforma no responde"), no una por cada parte.

## 2. Entrar al servidor

No hay SSH. En la consola de AWS: **EC2 → Instances →** el servidor **→ Connect → Session Manager → Connect**. Luego:

```bash
sudo -i
docker ps --format 'table {{.Names}}\t{{.Status}}'
```

- Un contenedor detenido o `unhealthy` se reinicia con `docker restart <nombre>`. Por ejemplo, `docker restart plataforma-backend-1`.
- Los registros se ven con `docker logs --tail 100 plataforma-backend-1`.
- Para relanzar todo como lo deja el despliegue: `/usr/local/bin/plataforma-desplegar`.
- Lo último que vio el vigilante: `journalctl -u plataforma-vigilante --since -1h`.

## 3. La blockchain no produce bloques

1. Revise los cuatro nodos: `docker ps -a --filter name=besu`.
2. Inicie los que estén detenidos: `docker start plataforma-besu-nodo2-1` (y los demás).
3. En unos 30 segundos, la red vuelve a producir bloques por sí sola. Lo firmado antes no se pierde.

Si los cuatro están corriendo y no avanza, revise `docker logs --tail 100 plataforma-besu-nodo1-1` y, como último recurso, restaure una copia (`respaldos.md`).

## 4. El disco se llena

- Vea qué ocupa espacio: `df -h /` y `docker system df`.
- Borre las imágenes de Docker que ya no se usan: `docker image prune -a` (no borra datos).
- Si no alcanza, agrande el disco: cambie `disco_gb` en Terraform y aplique. AWS lo agranda sin detener el servidor.

## 5. Cómo funciona

| Parte | Dónde |
|---|---|
| Vigilante (cada 5 minutos, temporizador `plataforma-vigilante`) | `infra/aws/servidor/vigilar.sh` |
| Alarmas y regla de copias fallidas, detrás del interruptor `monitoreo_activo` | `infra/aws/modulos/ambiente/monitoreo.tf` |
| Tema de los correos (`dra-satipo-alertas`) | `infra/aws/cuenta/cuenta.yml`, ver `despliegue-aws.md` sección 2c |

El vigilante revisa desde dentro del servidor:
- la salud del backend, que incluye la base de datos;
- que la red Besu siga produciendo bloques (compara con la revisión anterior);
- el estado del IPFS;
- el disco usado.

Publica una métrica por parte en el espacio `DRA-Satipo` de CloudWatch, que se puede ver en **CloudWatch → Metrics → DRA-Satipo**.

**Para activarlo en PROD:** `monitoreo_activo = true` en el ambiente, con la suscripción del correo confirmada. **Costo:** $0 dentro de la capa gratuita permanente de CloudWatch (ver `estimacion-costos-aws.md`).

**No se vigila** desde fuera de AWS (CloudFront y el portal en S3, que opera AWS), ni se centralizan los registros. Están fuera del alcance de DRA-68.

## 6. Qué se probó

En la CI:
- `terraform test` comprueba que sin el interruptor no se crea nada y que, con él, se crean las alarmas, sus umbrales y la regla;
- el servidor en Docker comprueba que el vigilante publica 1 con todo funcionando y 0 al detener la blockchain, el IPFS o el backend.

La prueba en QA está en `docs/evidencias/sprint-8/DRA-68/`.
