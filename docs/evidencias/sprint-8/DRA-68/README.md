# DRA-68 · Monitoreo y alertas (apagados hasta PROD)

- **Sprint:** 8 · **Puntos:** 5 · **Fecha de la prueba en QA:** 13/11/2026
- **Documentación:** [monitoreo.md](../../../arquitectura/monitoreo.md)

## Qué se construyó

| Parte | Dónde |
|---|---|
| Vigilante del servidor: cada minuto publica en CloudWatch si funcionan la plataforma (backend y base de datos), la blockchain (avanza) y el IPFS, y el disco usado | `infra/aws/servidor/vigilar.sh`, temporizador en `desplegar.sh` |
| 5 alarmas con nombres en español y una regla de copias fallidas (DRA-66), detrás del interruptor `monitoreo_activo` (apagado) | `infra/aws/modulos/ambiente/monitoreo.tf` |
| Permiso del servidor para publicar métricas, solo en el espacio `DRA-Satipo` | `infra/aws/modulos/ambiente/servidor.tf` |
| Tema de correo `dra-satipo-alertas`, con el correo de la pila (no está en el repositorio) | `infra/aws/cuenta/cuenta.yml` |
| Opción "monitoreo" en "QA – Encender" | `.github/workflows/qa-encender.yml` |

## Prueba en QA

| # | Paso | Resultado |
|---|---|---|
| 1 | Actualizar la pila `dra-satipo-cuenta` | Solo agrega el tema y su política. UPDATE_COMPLETE. AWS envió el correo de confirmación de la suscripción |
| 2 | QA – Encender con monitoreo | 5 alarmas y la regla creadas; el vigilante publica con los permisos reales: `Plataforma=1 Blockchain=1 IPFS=1 DiscoUsado=40%` |
| 3 | Primeros minutos | **Ajuste 1:** la alarma de la plataforma pasó a ALARM por falta de datos y volvió sola a OK |
| 4 | Vigilante cada minuto (tras el ajuste) | Un reporte por minuto en el registro del servidor; las 5 alarmas en OK |
| 5 | 14:24:17 UTC: detener `besu-nodo3`, `besu-nodo4` y el backend | La cadena se detiene en el bloque 26458 |
| 6 | Alertas | **"La plataforma no responde"** a las 14:30:35 (6 min) y **"La blockchain no produce bloques"** a las 14:31:26 (7 min). Las otras 3 siguen en OK |
| 7 | 14:32:07: volver a levantarlos | La plataforma vuelve a OK a las 14:38:35. La blockchain vuelve a OK a las 14:55:26: la **red misma** tardó en reanudarse (hallazgo 2) |
| 8 | Envío al tema | El historial de cada alarma dice "Successfully executed action" hacia `dra-satipo-alertas`: 10 avisos publicados (ALARM y OK) |
| 9 | Verificación | El documento `DRA-2026-DWN4U8` sigue saliendo VÁLIDO |
| 10 | QA – Encender sin monitoreo | Alarmas, regla y temporizador quitados; `MONITOREO_ACTIVO='no'` |

**Correos:** la suscripción quedó **pendiente de confirmar** durante la prueba, así que los 10 avisos se publicaron pero no se entregaron. Falta que el dueño del correo de alertas confirme la suscripción; después se comprueba la entrega con un aviso de prueba.

Registro del vigilante durante la recuperación (extracto):

```
14:32:20 Plataforma=0 Blockchain=0 (bloque 26458) IPFS=1
14:33:11 Plataforma=1 Blockchain=0 (bloque 26458) IPFS=1
...
14:49:19 Plataforma=1 Blockchain=0 (bloque 26458) IPFS=1
14:50:19 Plataforma=1 Blockchain=1 (bloque 26471) IPFS=1
14:51:11 Plataforma=1 Blockchain=1 (bloque 26497) IPFS=1
```

## Pruebas automáticas (CI)

Cantidades tomadas del registro de la CI ([43441320683](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43441320683)):

| Prueba | Antes | Ahora |
|---|---|---|
| Terraform (interruptor, alarmas, umbrales, regla, permiso del servidor) | 14 | 18 |
| Plantilla de la cuenta (tema y quién puede publicar) | 12 | 14 |
| Servidor en Docker (el vigilante con todo bien y con la blockchain, el IPFS y el backend detenidos) | 19 | 27 |

## Ajustes y hallazgos

1. **Falsa alarma por falta de datos.** Con un reporte cada 5 minutos y ventanas de 5 minutos, un retraso de segundos dejaba una ventana vacía, y la alarma de la plataforma la cuenta como falla. Ahora el vigilante corre **cada minuto**: unos 5 reportes por ventana. Sigue en la capa gratuita: unas 43 000 llamadas al mes de 1 millón. Además, `monitoreo.md` avisa que al activar el monitoreo puede llegar un aviso único antes del primer reporte.
2. **La red Besu tarda en reanudarse tras una parada larga.** Con 2 de 4 validadores detenidos 8 minutos, la red tardó 17 minutos en volver a producir bloques después de levantarlos: el tiempo entre intentos de acuerdo crece en cada intento. Se reanuda sola y no se pierde nada. Quedó en `monitoreo.md` para que nadie lo tome por una falla nueva.

## Decisiones para validar

- Alertas de AWS (CloudWatch, SNS y EventBridge), sin un servidor de monitoreo propio. Costo: $0.
- Aviso a los 6–7 minutos de una falla (dos ventanas de 5 minutos).
- Con el servidor caído llega una sola alerta, "La plataforma no responde".
- Se vigila desde dentro del servidor. CloudFront y el portal en S3 quedan fuera.
