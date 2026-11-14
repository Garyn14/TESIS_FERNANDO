# Guía de operación

Para el Administrador · Plataforma de Certificados y Constancias de la Agencia Agraria Satipo

Esta guía dice qué tareas tiene el responsable de sistemas, cada cuánto y qué hacer ante un problema. El detalle técnico está en tres documentos del repositorio, enlazados al final. Hoy la plataforma tiene un solo ambiente en la nube, el de pruebas (QA): por eso el nombre de cada disparador empieza con "QA". Producción usará los mismos con otro nombre.

**Esta guía no contiene claves ni contraseñas, y ninguna debe escribirse aquí:** el código de la plataforma es público.

## Cómo está armada la plataforma

| Parte              | Para qué sirve                                                               | Dónde está                                                |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| Plataforma interna | La usa el personal de la agencia, con usuario y contraseña                   | En la nube de AWS, detrás de una dirección segura (HTTPS) |
| Portal público     | Cualquier persona verifica un documento, sin registrarse                     | En AWS, con su propia dirección; es la que va en el QR    |
| Servidor           | Guarda la base de datos, los PDF firmados y la blockchain de la agencia      | Un solo servidor en AWS (región de Ohio)                  |
| Blockchain         | Registra cada firma y cada anulación; nadie la puede alterar sin que se note | Dentro del servidor, en 4 nodos                           |
| Respaldos          | Una copia diaria del disco del servidor, con los últimos 30 días             | En AWS, aparte del servidor                               |
| Alertas            | Un correo cuando algo deja de funcionar y otro cuando se recupera            | Llegan al correo de alertas de la cuenta de AWS           |
| Disparadores       | Encender, apagar, actualizar, respaldar y restaurar con un clic              | En GitHub, pestaña Actions                                |

## Calendario de tareas

| Cada    | Tarea                                                                                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Día     | Revise el correo de alertas. Si llegó una, vea la sección _Alertas_                                                                                                        |
| Día     | Revise si alguien pidió desbloquear su cuenta o restablecer su contraseña (sección _El personal_)                                                                          |
| Semana  | Revise que la copia diaria del disco se esté haciendo: en GitHub, ejecute "QA – Restaurar respaldo" **sin escribir nada** y verá la lista de copias, sin restaurar ninguna |
| Semana  | Revise las actualizaciones que propone Dependabot en GitHub (llegan los lunes). Las acepta el equipo de desarrollo, con las pruebas en verde                               |
| Mes     | Revise el gasto en el presupuesto de AWS (sección _Costos_)                                                                                                                |
| Mes     | Revise las cuentas: desactive las de quienes ya no trabajan en la agencia                                                                                                  |
| Mes     | Borre las copias manuales y los discos sobrantes que ya no sirvan (ver `respaldos.md`)                                                                                     |
| 90 días | Cambie la clave que usa GitHub para entrar a AWS (`despliegue-aws.md`, sección 8)                                                                                          |

## El personal

Las tareas de cuentas se hacen en la pantalla **Usuarios**, y están explicadas paso a paso en el **Manual de usuario**, sección "Para el Administrador".

- **Alguien nuevo:** créele su cuenta con el rol y el área que corresponden, y entréguele su contraseña temporal en persona, nunca por correo ni mensaje.
- **Alguien se va:** desactive su cuenta el mismo día. No se borra: su historial se conserva.
- **Cuenta bloqueada** (3 intentos fallidos): espere una hora o restablezca su contraseña, que también la desbloquea.
- **Cambio de Director:**
  1. En **Billetera del director**, revoque el permiso de firmar de la billetera anterior.
  2. Registre la billetera del nuevo Director y otórguele el permiso.
  3. Los documentos firmados antes **siguen siendo válidos**.
- **Su propia billetera de administrador del contrato** es la única que puede dar o quitar el permiso de firmar. Guarde su frase de recuperación en un lugar seguro y fuera de la computadora: si se pierde, no se puede cambiar al Director.

## Encender, apagar y actualizar

Todo se hace en GitHub, pestaña **Actions**: se elige el disparador y se pulsa **Run workflow**, con la rama `main`.

| Para                                       | Disparador                                       | Tarda               |
| ------------------------------------------ | ------------------------------------------------ | ------------------- |
| Encender, o actualizar a la última versión | "QA – Encender"                                  | Unos 10 minutos     |
| Apagar sin perder nada                     | "QA – Apagar" (también corre solo cada noche)    | Unos minutos        |
| Tomar una copia del disco en el momento    | "QA – Respaldar ahora"                           | Unos minutos        |
| Volver a una copia anterior                | "QA – Restaurar respaldo"                        | Menos de 10 minutos |
| Borrar todo, datos incluidos               | "QA – Destruir" (pide escribir una confirmación) | Unos minutos        |

Mientras está apagado o encendiéndose, la plataforma y el portal muestran "El ambiente de QA está apagado o encendiéndose".

**Antes de actualizar** a una versión nueva, tome una copia con "QA – Respaldar ahora".

## Respaldos

- **La copia diaria se hace sola** a las 03:00 de Lima y se guardan los últimos 30 días. Guarda todo junto: la base de datos, los PDF y la blockchain.
- **Antes de una operación delicada** (una actualización, un cambio grande de cuentas), tome una copia con "QA – Respaldar ahora".
- **Restaurar** vuelve todo al momento de la copia:
  1. Avise a los usuarios: la plataforma no estará disponible unos minutos.
  2. Ejecute "QA – Restaurar respaldo" con la copia elegida y la confirmación que pide.
  3. Compruebe que un documento firmado antes de la copia salga "Documento válido" en el portal.
  4. **Avise al Director** que restablezca su cuenta en MetaMask antes de volver a firmar.
  5. Lo que se registró o firmó después de la copia **se pierde** y hay que volver a hacerlo.

El paso a paso está en `respaldos.md`.

## Alertas

Las alertas llegan por correo con el asunto "ALARM" y, cuando el problema se resuelve, "OK". Si llega "OK" poco después, no hace falta hacer nada.

| Alerta                           | Qué hacer primero                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La plataforma no responde        | Abra la plataforma. Si no carga, revise que no esté apagada; si está encendida, vea `monitoreo.md`                                                                      |
| La blockchain no produce bloques | Espere: tras una parada larga, la red vuelve sola, pero puede tardar varios minutos (en una prueba, 17). Si sigue sin avanzar después de 30 minutos, vea `monitoreo.md` |
| El IPFS no responde              | Los PDF no se pueden guardar ni mostrar. Vea `monitoreo.md`                                                                                                             |
| El disco supera el 85 por ciento | Avise al equipo de desarrollo para liberar espacio o agrandar el disco                                                                                                  |
| El servidor falla                | AWS detectó una falla en la máquina: vea `monitoreo.md`                                                                                                                 |
| Falló una copia del disco        | Tome una copia con "QA – Respaldar ahora". Si vuelve a fallar, avise al equipo de desarrollo                                                                            |

## Seguridad

- **Los secretos nunca están en el repositorio ni en esta guía.** Están:
  - la clave que usa GitHub para entrar a AWS: en los secretos del ambiente de GitHub;
  - las contraseñas y claves del servidor: en el almacén de parámetros de AWS (Parameter Store), cifradas;
  - las claves de las billeteras: solo en el MetaMask de cada persona.
- **Nunca comparta** una contraseña, la frase de recuperación de una billetera ni una clave de AWS, ni por correo, ni por mensaje, ni en una captura de pantalla.
- **Si sospecha que una clave se filtró:**
  - si es la de AWS, cámbiela de inmediato (`despliegue-aws.md`, sección 8);
  - si es la contraseña de alguien, restablézcala;
  - si es la billetera del Director, revoque su permiso de firmar y otórgueselo a una billetera nueva.
- **Las cuentas de administrador de AWS** deben tener la verificación en dos pasos activada.

## Costos

- La cuenta tiene un presupuesto que avisa por correo al gastar $10, $25 y $50 en el mes, sin descontar los créditos.
- El gasto se revisa en AWS, en **Billing and Cost Management → Budgets** (`despliegue-aws.md`, sección 6).
- Apagar el servidor cuando no se usa reduce el costo. Las copias diarias cuestan menos de $1 al mes y las alertas, nada.

## Ante un incidente

1. **Mantenga la calma y anote** la hora y lo que ve (el mensaje exacto, qué pantalla).
2. **Compruebe el alcance:** ¿falla la plataforma, el portal o los dos? ¿Para todos o para una persona?
3. **Revise lo básico:** que el ambiente esté encendido y si llegó algún correo de alerta.
4. **Avise** a los usuarios afectados y al equipo de desarrollo.
5. **No restaure una copia** sin confirmar antes que los datos se perdieron o están dañados: restaurar también borra lo que se hizo después de la copia.
6. **Después**, anote qué pasó, cómo se resolvió y qué se puede hacer para que no se repita.

## Documentos técnicos

- [Despliegue en AWS](https://github.com/Garyn14/TESIS_FERNANDO/blob/main/docs/arquitectura/despliegue-aws.md): la cuenta, los disparadores, los costos y el cambio de la clave de GitHub.
- [Respaldos y recuperación](https://github.com/Garyn14/TESIS_FERNANDO/blob/main/docs/arquitectura/respaldos.md): las copias, cómo restaurar y cómo limpiar.
- [Monitoreo y alertas](https://github.com/Garyn14/TESIS_FERNANDO/blob/main/docs/arquitectura/monitoreo.md): qué significa cada alerta y cómo entrar al servidor.
