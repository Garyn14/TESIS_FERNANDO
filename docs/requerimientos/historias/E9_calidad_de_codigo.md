# E9: Mejora y revisión estática del código

**Objetivo:** medir y mejorar la calidad y la seguridad del código con revisión estática automática, sin frenar el avance.
**Épica Jira:** DRA-77 · **Fuera del backlog original** de la tesis: se agregó el 14/11/2026.
**Herramientas** (gratuitas para repositorios públicos): SonarQube Cloud, Slither y gitleaks. Se evaluó ZeroPath y quedó fuera.

---

## DRA-78: Revisión estática en la CI, en modo informativo, y medición inicial

**Como** equipo de desarrollo, **quiero** que la CI revise el código con herramientas de análisis estático y nos dé una medición inicial, **para** conocer el estado real de la calidad y la seguridad antes de decidir qué corregir.

**Contexto**

La CI tiene 7 jobs. Revisan formato y estilo (Spotless, oxlint, Prettier, shellcheck, actionlint, `terraform validate`, cfn-lint) y corren las pruebas, pero:
- no buscan errores probables, vulnerabilidades, código duplicado o complejo;
- no miden la cobertura: no hay JaCoCo en el backend ni cobertura de Vitest en el frontend y el portal;
- no revisan la seguridad del contrato de Solidity;
- no buscan claves filtradas en un repositorio que es público.

SonarQube Cloud ya está preparado por el dueño del repositorio:
- organización `garyn14`, plan gratuito;
- proyecto `Garyn14_TESIS_FERNANDO`, público;
- análisis automático desactivado;
- secreto `SONAR_TOKEN` en GitHub.

**Criterios de aceptación**

**SonarQube Cloud**
- [ ] Un archivo `sonar-project.properties` en la raíz define qué se analiza:
  - **código:** el backend (`src/main/java`), el frontend y el portal (`src`, sin las pruebas), y la infraestructura (Terraform, Dockerfiles y scripts);
  - **pruebas:** las del backend y los `*.test.ts(x)`;
  - **excluido:** el prototipo de Figma, `docs/`, el código generado, las dependencias y el contrato (Solidity lo revisa Slither).
- [ ] **Código nuevo:** se mide contra la rama `main` (`sonar.newCode.referenceBranch=main`). Lo usará DRA-79.
- [ ] **Cobertura de las pruebas:**
  - JaCoCo en el backend, con un informe XML en `mvn verify`;
  - `@vitest/coverage-v8` en el frontend y el portal, con un informe `lcov`.
  - Las cantidades de pruebas no cambian.
- [ ] Un **job nuevo, "Revisión estática (SonarQube Cloud)"**, que corre después del backend, el frontend y el portal y usa sus resultados (clases compiladas e informes de cobertura) sin volver a correr las pruebas. Analiza `main` y los pull requests del mismo repositorio. *(Ajuste al construir: el plan gratuito de SonarQube Cloud no muestra otras ramas, así que en las ramas `DRA-*` el job se omite.)*

**Contrato y secretos**
- [ ] Un **job nuevo, "Revisión estática (contrato y secretos)"**:
  - **Slither** analiza `RegistroDocumentos.sol` con solc 0.8.30;
  - **gitleaks** busca claves o contraseñas en el código y en **todo el historial**.
- [ ] Los resultados de los dos quedan en el resumen del job y como archivo descargable, y se suben en formato SARIF a la pestaña **Security** de GitHub (gratuita para repositorios públicos).

**Modo informativo**
- [ ] Ninguna de las herramientas bloquea la CI: si encuentran algo, lo informan y el job queda en verde.
- [ ] La CI pasa de 7 a **9 jobs**. Se mide cuánto tarda antes y después.

**Medición inicial**
- [ ] Un informe en `docs/calidad/medicion-inicial.md` con:
  - las notas de SonarQube (fiabilidad, seguridad, mantenibilidad), los hallazgos por gravedad y por proyecto, la duplicación y la cobertura;
  - los hallazgos de Slither por gravedad;
  - el resultado de gitleaks;
  - la **clasificación** de cada hallazgo (grave, falso positivo o sugerencia) y la **propuesta de tickets de corrección**.
- [ ] Una guía corta en `docs/calidad/README.md`: dónde ver los resultados, cómo leerlos y cómo marcar un falso positivo con su justificación.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Bloquear la CI ante lo grave | DRA-79 |
| Corregir lo encontrado | Tickets de corrección, después de la medición |
| Reglas propias o un perfil de calidad distinto a "Sonar way" | Se decide con la medición, si hace falta |
| Cobertura del contrato | Ya tiene sus 28 pruebas; SonarQube no analiza Solidity |

**Notas técnicas**

- SonarQube corre con la acción oficial `SonarSource/sonarqube-scan-action` (un solo análisis para todo el repositorio).
- El job de SonarQube necesita el historial completo (`fetch-depth: 0`) para el código nuevo y la autoría por línea.
- gitleaks corre desde su imagen de Docker, con `fetch-depth: 0` para revisar el historial completo.
- Slither se instala con `pip` (`slither-analyzer` y `solc-select`).

| Prioridad | Puntos |
|---|---|
| Media | 5 |

---

## DRA-80: Clasificar los falsos positivos y aceptados de la revisión estática

*Propuesta C de la medición inicial de la DRA-78 · bloquea a la DRA-79.*

**Como** equipo de desarrollo, **quiero** que las herramientas dejen de mostrar los hallazgos que ya revisamos y no son defectos, **para** que cada análisis muestre solo lo pendiente y la DRA-79 pueda bloquear sin falsas alarmas.

**Contexto**

La medición inicial (`docs/calidad/medicion-inicial.md`) clasificó a mano los 115 hallazgos: en SonarQube, 83 falsos positivos y 12 aceptados; en Slither, 5 falsos positivos; en gitleaks, 3 falsos positivos. Si nadie los marca, aparecen igual en cada análisis. Y gitleaks revisa todo el historial: si la DRA-79 lo volviera bloqueante hoy, la CI quedaría en rojo.

**Criterios de aceptación**

**SonarQube**
- [ ] Los falsos positivos y aceptados se excluyen **en `sonar-project.properties`** (`sonar.issue.ignore.multicriteria`), cada uno por regla y archivo, con un comentario que dice por qué. No se marcan a mano en la web.
- [ ] Solo se excluye lo clasificado en la medición: los 12 hallazgos reales siguen visibles para la DRA-81 y la DRA-82.
- [ ] Tras el análisis de `main`, SonarQube muestra **12 hallazgos abiertos**, los reales.

**Slither**
- [ ] Se excluye el detector `timestamp` y `incorrect-equality` solo donde se comprobó que es un falso positivo (el 0 como "no registrado"), con su justificación. Tras el análisis, Slither muestra **0 avisos**.

**gitleaks**
- [ ] Un `.gitleaksignore` en la raíz con la huella (commit, archivo, regla y línea) de cada uno de los 3 falsos positivos, con un comentario. Tras el análisis, gitleaks muestra **0 coincidencias**.
- [ ] Una clave nueva sigue apareciendo: la huella incluye el commit, así que un hallazgo nuevo no queda oculto.

**Guía**
- [ ] `docs/calidad/README.md` explica cómo excluir un falso positivo en cada herramienta, con su justificación, y que nunca se excluye un hallazgo sin revisarlo antes.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Corregir los hallazgos reales | DRA-81 (backend y pruebas) y DRA-82 (buckets) |
| Bloquear la CI | DRA-79 |

**Decisión a validar**

- **Exclusiones en el repositorio, no en la web de SonarQube.** Quedan versionadas junto con su justificación, se revisan en cada cambio como el resto del código y no dependen de una cuenta. Lo que se pierde: en la web el hallazgo no aparece como "aceptado", simplemente no aparece. La justificación está en el archivo y en la medición inicial.

| Prioridad | Puntos |
|---|---|
| Media | 2 |

---

## DRA-79: Bloquear en la CI solo lo grave del código nuevo

*Refinada el 14/11/2026, con la medición inicial (DRA-78) y las exclusiones de la DRA-80.*

**Como** equipo de desarrollo, **quiero** que la CI rechace un cambio solo cuando agrega un problema grave, **para** mantener la calidad sin frenar el avance con observaciones menores o del código que ya existía.

**Contexto**

- La DRA-78 dejó la revisión estática en modo informativo, y la DRA-80 excluyó los falsos positivos revisados: ahora cada herramienta muestra solo lo pendiente.
- **Dos límites del plan gratuito de SonarQube Cloud**, comprobados al construir la DRA-78:
  - **Solo analiza `main` y los pull requests**, no las ramas. Para revisar el código nuevo *antes* de que llegue a `main`, cada historia tiene que pasar por un pull request.
  - **Solo tiene el umbral predefinido "Sonar way"**, que no se puede editar. Exige al código nuevo calificación A en seguridad, fiabilidad **y mantenibilidad**, **80 % de cobertura** y **3 % de duplicación como máximo**. Eso es más de lo acordado: bloquear solo lo grave.

**Qué bloquea y qué no**

| Bloquea (la CI falla) | No bloquea (queda como aviso) |
|---|---|
| Una clave o contraseña nueva en el historial (gitleaks) | Mantenibilidad, cobertura y duplicación del código nuevo |
| Una vulnerabilidad o un error probable de gravedad **alta o bloqueante** que agrega el pull request (SonarQube) | Los hallazgos de gravedad media o baja |
| Un aviso nuevo de gravedad media o alta en el contrato (Slither) | Lo que ya existía: va en sus propios tickets (DRA-81, DRA-82) |

**Criterios de aceptación**

**Flujo con pull request**
- [ ] Cada historia, al terminar en su rama, abre un **pull request hacia `main`**. En el PR corren los 9 jobs, SonarQube incluido, y SonarQube comenta en el PR el resultado.
- [ ] Se fusiona **solo con los 9 jobs en verde**, igual que hoy: con *fast-forward* desde la terminal (GitHub marca el PR como fusionado solo). El historial sigue lineal.
- [ ] El flujo de `CLAUDE.md` y la guía de calidad describen el paso nuevo.

**SonarQube**
- [ ] Tras el análisis del PR, la CI **consulta a SonarQube los hallazgos nuevos del PR** y falla si hay alguno de seguridad o fiabilidad con gravedad alta o bloqueante. El mensaje dice cuál es y enlaza al detalle.
- [ ] El umbral "Sonar way" se sigue mostrando en el PR como **aviso**, sin bloquear.
- [ ] En `main` (después de fusionar) el job no bloquea: solo informa.

**Contrato y secretos**
- [ ] gitleaks falla la CI si encuentra algo fuera de `.gitleaksignore`.
- [ ] Slither falla la CI con un aviso nuevo de gravedad media o alta (`--fail-medium`); los revisados están en `slither.db.json`.
- [ ] Los jobs de revisión estática **dejan de ser informativos** (sin `continue-on-error`).

**Prueba**
- [ ] En un PR de ensayo, que se cierra sin fusionar:
  - una clave falsa hace fallar gitleaks;
  - una vulnerabilidad sembrada (por ejemplo, SQL armado con lo que escribe el usuario) hace fallar SonarQube;
  - un cambio limpio deja todo en verde.

**Fuera del alcance**

| Tema | Dónde se resuelve |
|---|---|
| Corregir lo que ya existía | DRA-81 y DRA-82 |
| Bloquear por mantenibilidad, cobertura o duplicación | A propósito: no se bloquea, para no frenar el avance |
| Proteger la rama `main` en GitHub (*branch protection*) | Opcional; lo decide el dueño del repositorio (ver decisiones) |

**Decisiones a validar**

1. **Pasar a fusionar por pull request.** Es la única forma de revisar el código nuevo antes de `main` con el plan gratuito. Se mantiene el *fast-forward*, así que el historial no cambia de forma.
2. **El bloqueo de SonarQube lo decide la CI, no el umbral "Sonar way".** El plan gratuito no deja editar el umbral, y "Sonar way" bloquearía también por mantenibilidad, cobertura y duplicación. El umbral queda visible como aviso.
3. **Sin protección de rama por ahora.** Exigir los checks en GitHub impediría subir a `main` los commits de registro de la CI y los de documentación. El bloqueo se cumple por el flujo: no se fusiona un PR en rojo.

**Notas técnicas**

- Los hallazgos del PR: `api/issues/search?componentKeys=…&pullRequest=N&resolved=false&impactSoftwareQualities=SECURITY,RELIABILITY&impactSeverities=HIGH,BLOCKER` (el proyecto es público: no hace falta token para leer).
- El análisis espera a que SonarQube procese el informe (`sonar.qualitygate.wait=true`, con un tiempo máximo), sin fallar por el umbral.
- Los PR de Dependabot no tienen acceso al secreto: en ellos el job de SonarQube se omite, y gitleaks y Slither sí corren.

| Prioridad | Puntos |
|---|---|
| Media | 3 |
