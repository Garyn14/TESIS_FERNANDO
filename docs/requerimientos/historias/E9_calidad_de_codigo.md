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
