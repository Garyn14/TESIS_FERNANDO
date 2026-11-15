# Revisión estática del código (épica E9)

Parte del código se escribió con ayuda de un asistente de IA (lo declara la tesis). Para revisarlo con un criterio independiente, la CI analiza todo el repositorio con herramientas gratuitas en cada push a `main` o a una rama `DRA-*`, y en cada pull request.

| Herramienta | Qué revisa | Dónde se ven los resultados |
| --- | --- | --- |
| **SonarQube Cloud** (plan gratuito) | Backend (Java), plataforma interna y portal (TypeScript), infraestructura (Terraform, Dockerfiles, scripts), pruebas de punta a punta: errores, vulnerabilidades, puntos sensibles de seguridad, código duplicado, mantenibilidad y cobertura de las pruebas | [sonarcloud.io, proyecto Garyn14_TESIS_FERNANDO](https://sonarcloud.io/project/overview?id=Garyn14_TESIS_FERNANDO) |
| **Slither** 0.11.6 | El contrato `RegistroDocumentos.sol` (solc 0.8.30) | Resumen del job, artefacto `revision-estatica` y pestaña **Security** del repositorio |
| **gitleaks** 8.30.1 | Claves y contraseñas en **todo el historial** de git | Resumen del job, artefacto `revision-estatica` y pestaña **Security** |

## Cómo funciona en la CI

- Dos jobs nuevos en `.github/workflows/ci.yml`:
  - **Revisión estática (SonarQube Cloud):** espera al backend, al frontend y al portal, y usa lo que ellos dejan como artefactos (las clases compiladas, el informe de JaCoCo y el `lcov.info` de Vitest), sin volver a correr las pruebas.
    Corre **solo en `main` y en los pull requests**: el plan gratuito de SonarQube Cloud no deja ver el análisis de otras ramas (lo comprobé en la DRA-78: "Organization is not allowed to access data from non main branches"). En una rama `DRA-*` el job aparece como omitido.
  - **Revisión estática (contrato y secretos):** Slither y gitleaks.
- **Bloquean solo lo grave (DRA-79):**

  | Bloquea (la CI falla) | No bloquea (aviso) |
  | --- | --- |
  | Una clave nueva en el historial de lo que se integra (gitleaks, salvo las huellas de `.gitleaksignore`) | El umbral "Sonar way": mantenibilidad, cobertura y duplicación del código nuevo |
  | Un aviso nuevo de gravedad media o alta en el contrato (Slither, salvo los de `slither.db.json`) | Los hallazgos de gravedad media o baja |
  | En un **pull request**, un hallazgo nuevo de seguridad o fiabilidad con gravedad alta o bloqueante (SonarQube) | En `main`, un hallazgo grave: avisa para abrir un ticket de corrección |

  La decisión de SonarQube la toma `.github/scripts/revisar-sonarqube.sh` después del análisis, consultando los hallazgos del PR (el plan gratuito no deja editar el umbral "Sonar way", que exigiría más de lo acordado). Sus casos se prueban en la CI con un SonarQube simulado (`probar-revisar-sonarqube.sh`).
- **Cada historia llega a `main` por un pull request** (DRA-79), porque el plan gratuito solo analiza `main` y los PR. Se fusiona con fast-forward desde la terminal, solo con los 9 jobs en verde. Sin protección de rama en GitHub, a propósito: el bloqueo lo cumple el flujo (un PR en rojo no se fusiona).
- **Código nuevo** = lo que cambia respecto de `main` (`sonar.newCode.referenceBranch=main` en `sonar-project.properties`).
- **Cobertura:** el backend la mide con JaCoCo dentro de `./mvnw verify` (`target/site/jacoco/jacoco.xml`); el frontend y el portal con `npm test -- --coverage` (`coverage/lcov.info`).

## Configuración (una sola vez, ya hecha)

- En SonarQube Cloud: organización `garyn14` (plan Free), proyecto público `Garyn14_TESIS_FERNANDO`, con el **análisis automático desactivado** (lo hace la CI).
- En GitHub: el secreto de repositorio `SONAR_TOKEN`. **El token nunca va en el repositorio ni en un mensaje.** Si se filtra, se revoca en SonarQube Cloud (My Account → Security) y se crea otro.
- Los PR que vienen de otro repositorio (Dependabot, forks) no tienen acceso al secreto: en ellos el job de SonarQube no corre.

## Cómo excluir un falso positivo (DRA-80)

**Antes de excluir, se revisa el hallazgo.** Solo se excluye lo que, leído el código, no es un defecto (falso positivo) o es una decisión ya tomada (aceptado), y siempre con la justificación escrita. Las exclusiones viven en el repositorio, no en la web de las herramientas: así quedan versionadas y se revisan como el resto del código.

| Herramienta | Dónde | Cómo |
| --- | --- | --- |
| SonarQube Cloud | `sonar-project.properties` | Agregar un identificador a `sonar.issue.ignore.multicriteria` y sus dos líneas, `ruleKey` (la regla, por ejemplo `java:S2077`) y `resourceKey` (el archivo o un patrón), con un comentario que diga por qué. Se excluye esa regla en ese archivo, no la regla entera |
| Slither | `plataforma/contracts/slither.db.json` | Correr Slither con `--triage-mode --triage-database slither.db.json` y elegir los avisos revisados. Guarda una huella de cada aviso: uno nuevo sigue apareciendo. Anotar la justificación en la medición |
| gitleaks | `.gitleaksignore` en la raíz | Agregar la huella del hallazgo (`commit:archivo:regla:línea`, la muestra gitleaks en su informe) con un comentario. Una clave nueva tiene otra huella y sigue apareciendo |

**Si gitleaks encuentra una clave real**, excluirla no basta: el repositorio es público, así que hay que revocarla y cambiarla de inmediato. Después se decide si hace falta limpiar el historial.

Exclusiones vigentes: 20 reglas por archivo en SonarQube, 5 avisos en Slither y 3 huellas en gitleaks, todas justificadas en la [medición inicial](medicion-inicial.md).

## Correr las herramientas en local

```bash
# Slither (desde plataforma/contracts, con npm ci hecho)
pip install slither-analyzer==0.11.6 solc-select==1.2.0 && solc-select install 0.8.30
SOLC_VERSION=0.8.30 slither contracts/ --solc-remaps "@openzeppelin/=node_modules/@openzeppelin/" --filter-paths node_modules --exclude-dependencies --triage-database slither.db.json
```

```bash
# gitleaks (desde la raíz del repositorio)
docker run --rm -v "$PWD:/repo" ghcr.io/gitleaks/gitleaks:v8.30.1 git /repo --redact
```

```bash
# Cobertura del frontend o del portal
npx vitest run --coverage
```

## Resultados

- [Dependencias con vulnerabilidades conocidas (DRA-83)](dependencias.md): las alertas de Dependabot y `npm audit`, clasificadas. Ninguna afecta a lo que se despliega.
- [Medición inicial (DRA-78)](medicion-inicial.md): lo que encontró cada herramienta la primera vez, clasificado, y los tickets de corrección propuestos.
