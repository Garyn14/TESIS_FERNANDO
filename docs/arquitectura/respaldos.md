# Respaldos y recuperación (DRA-66)

**Para quién:** el responsable de sistemas de la agencia. **Alcance:** PROD. En QA los respaldos están apagados; solo se encienden para probarlos.

## 1. Qué se respalda y por qué

Todo lo que necesita la plataforma vive en **un solo disco**, el del servidor:

| Parte | Qué aporta | Si se pierde |
|---|---|---|
| Base de datos (PostgreSQL) | Une el código y el QR con cada documento | El portal ya no encuentra ningún documento |
| PDF (IPFS privado) | El documento que se compara con su huella | El documento ya no se puede comprobar |
| Blockchain (los 4 nodos Besu y sus claves) | La huella registrada de cada firma y anulación | Se pierde la cadena completa: ningún documento se verifica |

Hoy la red Besu tiene un solo operador (ver la tesis, trabajo futuro). Por eso **la blockchain también se respalda**.

**Cómo:** una **copia diaria del disco completo** (snapshot de EBS), con el servicio de copias de AWS (Data Lifecycle Manager). Una sola copia guarda las tres partes **en el mismo instante**, así que al restaurar siempre coinciden. La base de datos, el IPFS y Besu se recuperan solos de una copia en caliente, igual que después de un corte de luz.

**Segunda capa:** a las 02:50 de Lima, 10 minutos antes de la copia, el servidor deja un **volcado de PostgreSQL** (`pg_dump`) en `/opt/plataforma/volcados`, con los 3 más recientes. Queda dentro de la copia y permite revisar o recuperar la base de datos por separado.

| Dato | Valor por defecto | Dónde se cambia |
|---|---|---|
| Activados | No (solo PROD los activa) | Variable `respaldos_activos` del módulo `infra/aws/modulos/ambiente` |
| Hora de la copia | 03:00 de Lima (08:00 UTC) | Variable `respaldos_hora_utc` |
| Copias que se guardan | Las últimas 30 (un mes) | Variable `respaldos_retencion` |
| Lo que se puede perder | Lo de un día como máximo | Una copia más frecuente exigiría otra regla en `respaldos.tf` |

Las copias están cifradas, porque el disco lo está, y **no dependen del servidor**: sobreviven aunque se borre.

## 2. Respaldar ahora

Antes de una operación delicada (una actualización importante, un cambio de Director), tome una copia en el momento:

- En GitHub, pestaña **Actions → "QA – Respaldar ahora" → Run workflow**. Para PROD habrá un disparador igual (DRA-65).
- Deja un volcado de la base de datos, copia el disco y espera a que termine (unos minutos). El resumen muestra el identificador (`snap-…`) y la lista de copias.

**Las copias manuales no las borra la retención diaria.** Bórrelas cuando ya no sirvan (sección 5).

## 3. Restaurar una copia

**Qué pasa al restaurar:** el disco del servidor se reemplaza por el de la copia. **Todo vuelve al momento de la copia, la blockchain incluida.** Lo registrado y firmado después **se pierde**: hay que volver a registrarlo y firmarlo. El servidor, sus direcciones y CloudFront no cambian.

Pasos:
1. **Elegir la copia.** En **Actions → "QA – Restaurar respaldo" → Run workflow**, deje los campos vacíos y ejecútelo: solo lista las copias, de la más reciente a la más antigua, con su fecha (en UTC; Lima son 5 horas menos) y su tipo (`diario` o `manual`). Elija la última **antes** del problema.
2. **Avisar** a quienes usan la plataforma: durante la restauración no está disponible (en QA tardó menos de 4 minutos).
3. **Restaurar.** Ejecute otra vez el disparador, con:
   - **copia:** el identificador `snap-…` elegido;
   - **confirmación:** `RESTAURAR-QA`.
   
   Reemplaza el disco, vuelve a desplegar la plataforma y espera a que responda.
4. **Comprobar:**
   - en el portal, verificar un documento firmado **antes** de la copia: debe salir **"Documento válido"**;
   - ingresar como Administrador y revisar que las cuentas estén.
5. **El Director restablece su billetera.** Como la blockchain volvió atrás, MetaMask recuerda transacciones que ya no existen y la próxima firma quedaría trabada. En MetaMask: **Configuración → Avanzado → Borrar datos de actividad de la pestaña** (o "Restablecer cuenta"). No borra la billetera ni la clave.
6. **Volver a registrar** lo que se firmó después de la copia: buscar en la blockchain lo que ya no existe y registrarlo y firmarlo de nuevo.
7. **Ejecutar Encender:** el disco restaurado trae la versión de la plataforma de ese momento y **llega sin etiquetas** (AWS no las copia). Encender instala la última versión y le devuelve las etiquetas, sin reemplazar el servidor.

**El disco reemplazado no se borra:** queda como un disco "disponible" con el nombre del servidor, por si hiciera falta volver atrás. Bórrelo cuando la restauración esté comprobada (sección 5).

**Si el servidor ya no existe** (por ejemplo, se destruyó): primero se crea uno nuevo con **Encender** y luego se restaura la copia sobre él. La copia trae el disco completo, con las claves de la red y del IPFS.

## 4. Cómo se prueba

**Pruebas automáticas de la CI**, sin AWS:
- la plantilla, con y sin el interruptor;
- los scripts de respaldar, listar y restaurar, con un `aws` simulado;
- que el volcado de PostgreSQL se genera, se rota y se restaura con los datos.

**Prueba en QA** (13/11/2026): se simuló la pérdida de la base de datos y del IPFS, y se restauró una copia. El detalle está en `docs/evidencias/sprint-8/DRA-66/`.

## 5. Limpieza y costo

- **Borrar una copia manual:** en la consola de AWS, **EC2 → Snapshots**, filtre por la etiqueta `TipoDeRespaldo = manual`, elija la copia y **Actions → Delete snapshot**.
- **Borrar el disco reemplazado** después de una restauración: **EC2 → Volumes**, el que está en estado `available` con el nombre del servidor → **Actions → Delete volume**.
- **QA – Destruir** borra también las copias y los discos sobrantes de QA.
- **Costo:** las copias guardan solo los bloques que cambiaron desde la anterior. Se estima **menos de $1 al mes** en PROD (la primera copia medida en QA ocupó 5,4 GB) (ver `estimacion-costos-aws.md`). Data Lifecycle Manager no cobra.

## 6. Avisos

Si una copia falla, lo avisa el monitoreo (DRA-68), que escucha los eventos de Data Lifecycle Manager.
