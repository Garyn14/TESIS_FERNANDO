# Medición inicial de la revisión estática (DRA-78, 14/11/2026)

Primera revisión de todo el código con las tres herramientas, sobre `main` en el commit `9596a9d` ([CI 43646320191](https://github.com/Garyn14/TESIS_FERNANDO/actions/runs/43646320191)). Se registra **antes de corregir nada**, para comparar después. Cada hallazgo se revisó a mano y se clasificó en una de tres clases:

- **Real:** conviene corregirlo; va a un ticket de corrección propuesto.
- **Aceptado:** es cierto, pero es una decisión de diseño o de costo ya tomada; se deja documentado.
- **Falso positivo:** la herramienta no ve el contexto; el código es correcto.

## 1. Resumen

| Medida (SonarQube Cloud) | Valor |
| --- | --- |
| Líneas de código analizadas | 23 449 |
| Cobertura de las pruebas (total / líneas) | 88,3 % / 91,1 % |
| Código duplicado | 3,1 % |
| Hallazgos abiertos | 107: 7 de fiabilidad (*bugs*), 45 de seguridad (*vulnerabilities*), 55 de mantenibilidad (*code smells*) |
| Calificación de mantenibilidad | A (deuda técnica estimada: 203 minutos) |
| Calificación de fiabilidad | D (por los 7 *bugs*; ver sección 2) |
| Calificación de seguridad | E (por 2 hallazgos "bloqueantes" que resultaron falso positivo y diseño aceptado; ver sección 3) |
| Puerta de calidad | Sin evaluar todavía: es el primer análisis de `main` y aún no hay "código nuevo" (DRA-79) |

| Herramienta | Hallazgos | Reales | Aceptados | Falsos positivos |
| --- | --- | --- | --- | --- |
| SonarQube Cloud | 107 | 12 | 12 | 83 |
| Slither (contrato) | 5 | 0 | 0 | 5 |
| gitleaks (historial) | 3 | 0 | 0 | 3 |

**Lectura:** las calificaciones D y E se deben a hallazgos que, revisados, no son defectos (sección 3). Lo real es poco y de impacto bajo: ajustes pequeños del backend, una política de solo HTTPS en los buckets y orden en los scripts de prueba. **No se encontró ninguna clave real en el historial ni ninguna vulnerabilidad en el contrato.**

## 2. SonarQube Cloud: fiabilidad (7)

| Regla | Dónde | Clase | Por qué |
| --- | --- | --- | --- |
| java:S6218 (2) | `PdfFinal`, `VerificacionDeAutenticidad.Comprobacion`: *records* con `byte[]` | **Real** (bajo) | `equals` compara la referencia del arreglo, no su contenido. Hoy no se comparan, pero es una trampa para el futuro |
| java:S5850 | `GestionCatalogo`: `^_+\|_+$` | **Real** (claridad) | La precedencia es la buscada, pero agrupar `(^_+)\|(_+$)` la hace explícita |
| javascript:S9383 | `infra/aws/pruebas/cloudfront.cjs`: función asíncrona sin `.catch` | **Real** (bajo) | Si falla, la prueba termina sin un error claro |
| java:S8696 | `PlantillasDeDocumento`: `inicio.getMonth() != fin.getMonth()` | Falso positivo | `Month` es un `enum`: comparar con `!=` es correcto |
| javascript:S2871 (2) | `e2e/sprint6.cjs`: `.sort()` de textos | Falso positivo | Se ordenan cadenas a propósito, en orden alfabético |

## 3. SonarQube Cloud: seguridad (45)

| Regla | Dónde | Clase | Por qué |
| --- | --- | --- | --- |
| java:S6437 (bloqueante) | `AutenticacionUsuarios`: `encode("contrasena-ficticia-para-igualar-tiempos")` | Falso positivo | No es una contraseña: es un hash ficticio para que un usuario inexistente tarde lo mismo que uno real (evita enumerar usuarios) |
| terraform:S6329 (bloqueante) | `servidor.tf`: el EC2 con IP pública | Aceptado | Decisión de costo (sin NAT, balanceador ni IP elástica, escenario A). El grupo de seguridad solo deja entrar a CloudFront |
| java:S2254 (crítico) | `RespuestasDeSeguridad`: `getRequestedSessionId()` | Falso positivo | Solo elige el mensaje "su sesión expiró"; no se usa para autenticar |
| java:S2077 (2) | `GestionCatalogo`, `BusquedaDeDocumentos`: SQL con `formatted` | Falso positivo | Solo se insertan fragmentos constantes del código; todo lo que escribe el usuario va como parámetro (`:palabra0`, `:texto`…) |
| java:S3330 | `SeguridadConfig`: cookie CSRF sin `HttpOnly` | Falso positivo | Es el patrón de Spring para una SPA: el navegador debe leer la cookie para enviarla en el encabezado |
| tssecurity:S8476 | `portal/src/api.ts`: `fetch(url)` | Falso positivo | La dirección se arma con el código ya validado por una expresión regular o el token del QR, siempre hacia la misma API |
| secrets:S2068 | `infra/aws/servidor/probar-servidor.sh`: `DB_PASSWORD='clave-de-base-de-prueba'` | Falso positivo | Clave de una base de datos de prueba, desechable, en Docker |
| shell:S5332 | `vigilar.sh`: HTTP sin cifrar | Falso positivo | Consulta servicios internos del mismo servidor (red de Docker), que no salen a internet |
| terraform:S6249 (3) | `almacenamiento.tf`: buckets sin política de solo HTTPS | **Real** (bajo) | Se entra por CloudFront con HTTPS, pero una política `aws:SecureTransport` lo garantiza. Es barato agregarla |
| terraform:S6258 (4), cloudformation:S6258 | Buckets, CloudFront y bucket del estado sin registros de acceso | Aceptado | Decisión de costo para QA. Se reconsidera para PROD (DRA-65) |
| cloudformation:S6327 | `cuenta.yml`: tema de alertas sin cifrado KMS | Aceptado | Las alertas no llevan datos sensibles; KMS tiene costo mensual |
| javascript:S4036 (22) | Pruebas de punta a punta: `execFileSync` con `PATH` | Falso positivo | Scripts de prueba que corren en la máquina del equipo, no en el servidor |
| jssecurity:S6350 | `e2e/sprint5.cjs`: `psql` con SQL de la prueba | Falso positivo | El SQL lo escribe la prueba; no hay entrada de usuario |
| shell:S6505 (4) | `e2e/levantar.sh`, `de-punta-a-punta.sh`: `npm ci` sin `--ignore-scripts` | Aceptado | Hardhat y otras dependencias necesitan sus scripts de instalación. Dependabot vigila las dependencias (DRA-49) |

## 4. SonarQube Cloud: mantenibilidad (55)

| Regla | Dónde | Clase | Por qué |
| --- | --- | --- | --- |
| shell:S7688 (49) | `e2e/*.sh` y scripts de `infra`: `[` en lugar de `[[` | Falso positivo (estilo) | Estilo de bash; `shellcheck` ya revisa estos scripts en la CI y no marca nada |
| java:S8786 (4), javascript:S8786 | `"/+$"`, `"_+$"`: expresiones con retroceso | **Real** (bajo) | Los textos son cortos (direcciones de configuración, nombres), así que no hay riesgo práctico, pero se reemplazan fácil sin expresión regular |
| typescript:S9379 | `PaginaAreas.tsx`: `autoFocus` | Aceptado | Pone el cursor en el campo de la ventana que se acaba de abrir, como piden las pautas de accesibilidad de los diálogos |

## 5. Slither (contrato `RegistroDocumentos.sol`)

| Detector | Dónde | Clase | Por qué |
| --- | --- | --- | --- |
| incorrect-equality (1) | `_anular`: `registradoEn == 0` | Falso positivo | El 0 significa "no registrado": `block.timestamp` nunca es 0 en una red real |
| timestamp (4) | `_registrar`, `_anular`, `anulacion`, `consultar` | Falso positivo | La fecha solo se guarda y se compara con 0 para saber si existe; ninguna decisión depende de su valor exacto, así que un validador no puede sacar ventaja de moverla unos segundos |

## 6. gitleaks (todo el historial, 308 commits)

| Regla | Dónde | Clase | Por qué |
| --- | --- | --- | --- |
| generic-api-key | `sonar-project.properties`, línea 4 | Falso positivo | Es el comentario que dice que la credencial va solo en el secreto `SONAR_TOKEN` de GitHub |
| generic-api-key | `portal/src/App.test.tsx` (en un commit anterior) | Falso positivo | Token de verificación inventado para una prueba |
| generic-api-key | `GeneradorDePdfTest.java`, línea 22 | Falso positivo | Token de verificación inventado para una prueba |

## 7. Tickets de corrección propuestos

Los propongo para que el equipo los valide; ninguno es urgente.

| Propuesta | Contenido | Prioridad |
| --- | --- | --- |
| **A. Ajustes del backend y de las pruebas** | *Records* con `byte[]` (S6218), expresiones regulares (S5850, S8786) y la promesa de `cloudfront.cjs` (S9383) | Baja |
| **B. Buckets solo con HTTPS** | Política `aws:SecureTransport` en los buckets de la plataforma y el portal (S6249), con su prueba de Terraform | Baja |
| **C. Clasificar en las herramientas** | Marcar en SonarQube Cloud los falsos positivos y aceptados con su justificación (lo hace el dueño del proyecto en la web; un token de solo lectura no alcanza) y un `.gitleaksignore` con los 3 falsos positivos. Así el siguiente análisis muestra solo lo pendiente | Media: lo necesita la DRA-79 para no bloquear por falsos positivos |

**Para la DRA-79:** el plan gratuito de SonarQube Cloud solo evalúa `main` y los pull requests. Bloquear "lo grave del código nuevo" antes de fusionar exige que cada historia llegue a `main` por un pull request, en lugar del fast-forward actual. Hay que decidirlo al refinar la DRA-79.
