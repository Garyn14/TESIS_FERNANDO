# Evidencia HU18: Sincronizar los estados con la blockchain (DRA-26)

**Prueba de punta a punta real** del 04/11/2026, sin simulaciones de la plataforma. Participan:

- navegador (Playwright), frontend y backend;
- PostgreSQL 17 y el nodo IPFS privado;
- la red Besu QBFT de 4 validadores.

La prueba del Sprint 3 ([`plataforma/e2e/sprint3.cjs`](../../../../plataforma/e2e/sprint3.cjs)) recorre HU10, HU16, HU17, HU11, HU12 y HU18. Resultado en [`resultado.txt`](resultado.txt): **34 de 34 pasos correctos**, 4 de ellos de HU18 y uno de preparación.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos.

En la prueba, la sincronización corre cada 3 segundos y el plazo de firma es de 2 minutos. En producción son 30 segundos y 15 minutos (`PLATAFORMA_SINCRONIZACION_INTERVALO`, `PLATAFORMA_FIRMA_PLAZO`). Empieza en el bloque del despliegue del contrato (`PLATAFORMA_CONTRATO_BLOQUE_INICIAL`).

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu18_01_firma_confirmada_por_la_sincronizacion.png` | Mis documentos del área: Delia Ramos Pari en **Firmado**. Su firma se registró en el contrato, pero el servidor nunca recibió la confirmación del navegador | Los documentos detenidos en proceso de firma se corrigen |
| `hu18_02_detenido_vuelve_a_por_revisar.png` | Por revisar: Hugo Soto Inga, preparado y nunca registrado, volvió solo pasado el plazo, todavía revisado | Los documentos detenidos se corrigen |

## Qué comprueba la prueba

1. **Firma sin confirmar.** La prueba prepara un documento por la API y lo registra directamente en el contrato con la billetera del Director, como si el navegador se cerrara antes de avisar al servidor. En pocos segundos queda Firmado. Coinciden:
   - la transacción y el bloque del recibo en Besu;
   - la fecha de firma, que es la del bloque.

   Además:
   - el historial dice "Firma confirmada por la sincronización con la blockchain: firmado por Ing. Carlos Mendoza Rivera…", a nombre de cmendoza (dueño de la billetera);
   - `sincronizacion_blockchain` guarda el contrato y un último bloque mayor o igual al de esa transacción.
2. **Un código ya registrado no se registra de nuevo.**
   - El contrato rechaza registrar otra vez el mismo código (`CodigoYaRegistrado`).
   - A un documento Pendiente cuyo código ya está en el contrato, la preparación responde "El código ya está registrado en la blockchain: no se registra de nuevo." y lo deja Pendiente.
3. **Documento detenido.** El otro documento preparado y nunca registrado vuelve a Pendiente pasado el plazo:
   - sigue revisado y sin CID;
   - su historial dice "La firma no se completó en el plazo de 2 minutos y no quedó registrada en la blockchain (sincronización). Volvió a Pendiente.", registrado por el sistema;
   - el contrato lo da por no registrado, y reaparece en Por revisar.
4. **Avance sin duplicados:**
   - el último bloque procesado sigue a la cadena;
   - ningún documento tiene dos eventos FIRMADO;
   - no queda ningún documento en Procesando firma.

**Observado en el registro del servidor durante la prueba:** al firmar desde la pantalla (HU11), a veces la sincronización aplicó el evento antes que la confirmación del navegador. Por ejemplo: "Sincronización hasta el bloque 12143: 50 firmados". La confirmación vio después el documento ya Firmado con la misma transacción y lo informó como firmado. El resultado en pantalla fue el esperado, y no hubo historial duplicado.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/SincronizacionConBlockchainTest.java` | 6, con IPFS real y el contrato en memoria:<ul><li>una firma registrada sin confirmar pasa a Firmado una sola vez, a nombre del dueño de la billetera;</li><li>se reanuda desde el último bloque procesado, en tramos de hasta 5000 bloques, y sin bloques nuevos no consulta nada;</li><li>un detenido sin registrar vuelve a Pendiente solo pasado el plazo, hecho por el sistema;</li><li>un detenido registrado con otro hash no se marca ni se devuelve;</li><li>sin blockchain no cambia nada, y la tarea programada no falla;</li><li>un código ya registrado no se prepara.</li></ul> |
| Backend | `FirmaDeDocumentosTest.java` y las demás | Siguen pasando con la lógica de aplicación compartida entre la confirmación (HU11) y la sincronización |

Totales: 164 pruebas de backend y 113 de frontend.

## Ajustes durante la verificación

- **Carrera entre la confirmación y la sincronización.** Se detectó al diseñar la tarea: si las dos aplican el mismo evento a la vez, la que pierde no debe informar "hash distinto". Ahora vuelve a leer el documento en la base y, si ya quedó Firmado con esa transacción, lo cuenta como firmado. El registro del servidor confirma que pasa en la práctica.
- **Script de prueba:** la primera ejecución falló porque, durante los 2 minutos de espera, las sesiones de prueba (que expiran al minuto sin uso) se cerraron. La sincronización sí había devuelto el documento a Pendiente. Ahora la prueba mantiene las sesiones activas mientras espera, y se repitió completa en un entorno limpio.
