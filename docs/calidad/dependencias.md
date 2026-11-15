# Dependencias con vulnerabilidades conocidas (DRA-83, 15/11/2026)

La revisión estática (DRA-78 a DRA-82) revisa el código del repositorio, no las bibliotecas de terceros que usa. Las bibliotecas las vigilan dos herramientas gratuitas:

- **Dependabot** (DRA-49): cada lunes propone actualizaciones y, cuando sale una vulnerabilidad nueva, abre una alerta en la pestaña **Security → Dependabot** del repositorio. Revisa los proyectos con Maven (`pom.xml`) y con npm (`package-lock.json` y `pnpm-lock.yaml`).
- **`npm audit`**: se corre a mano en cada proyecto de Node, con y sin las dependencias de desarrollo (`--omit=dev`).

## Resultado

**Ninguna dependencia de lo que se despliega tiene vulnerabilidades conocidas.** Todas las alertas son de herramientas de desarrollo.

| Proyecto | Dependabot | `npm audit` (todas) | `npm audit --omit=dev` (lo que se despliega) |
| --- | --- | --- | --- |
| Backend (`pom.xml`) | 0 | — (Maven) | — |
| Plataforma interna (`frontend`) | 0 | 0 | 0 |
| Portal | 0 | 0 | 0 |
| Pruebas de punta a punta (`e2e`) | 0 | 0 | — (no se despliega) |
| Contrato (`contracts`) | 1 | 16 (13 altas y 3 moderadas) | 0 |
| Copia del prototipo (`prototipo/`) | 8 | — (pnpm) | — (no se despliega ni se ejecuta) |

## Clasificación

### Copia del prototipo: 8 alertas, se descartan ("El código vulnerable no se usa")

| Alerta | Gravedad | Paquete |
| --- | --- | --- |
| #6 Denegación de servicio con secciones de *source maps* | Alta | source-map-js |
| #8 Se puede saltar la comprobación de existencia de archivos en Windows | Alta | launch-editor (de Vite) |
| #4, #10 El servidor de desarrollo puede entregar archivos fuera de lo permitido | Moderada | vite |
| #5, #7, #9 Manejo de rutas y argumentos del editor en Windows | Moderada | launch-editor (de Vite) |
| #11 Ejecución de scripts entre orígenes con un *middleware* propio | Baja | vite |

**Por qué se descartan:** `prototipo/` es una copia de referencia del prototipo hecho en Figma Make (ver su `README.md`). No se despliega, no se ejecuta en la CI ni en el servidor, y su fuente de verdad es el repositorio de Figma. Todas las fallas son del servidor de desarrollo de Vite, que solo corre si alguien ejecuta `npm run dev` en esa carpeta, y varias solo en Windows. **Por decisión del equipo (opción A), la copia no se actualiza**, para que siga igual al original.

### Contrato: herramientas de Hardhat, riesgo tolerable

| Origen | Gravedad | Qué es |
| --- | --- | --- |
| `zod` < 4.6.6 ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)), usado por Hardhat y sus complementos | Alta (13 paquetes la heredan) | Puede agotar la memoria al validar colecciones muy grandes |
| `minimatch` ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)), por `typechain` → `glob` y por `mocha` → `glob` (alerta #3 de Dependabot) | Moderada (3 paquetes) | Denegación de servicio con patrones de archivos muy complejos |

**Por qué es tolerable:**
- Son herramientas para compilar y probar el contrato en la máquina del equipo y en la CI. No se despliegan, y `npm audit --omit=dev` da 0.
- Solo procesan archivos del propio repositorio (la configuración de Hardhat y los patrones de las pruebas), no datos de terceros.
- `npm audit fix --force` propone volver a Hardhat 2, un cambio mayor hacia atrás que no tiene sentido. La corrección llega cuando Hardhat actualice esas dependencias: **Dependabot lo propondrá** un lunes, y se acepta con la CI en verde.

**En GitHub**, la alerta #3 se descarta como "Riesgo tolerable", con esta justificación. Si Dependabot abre una alerta de `zod`, se trata igual.

## Cómo se revisa en adelante

- **Cada lunes**, las actualizaciones de Dependabot: se aceptan con la CI en verde y, si tocan el PDF, el QR o el portal, también con las pruebas de punta a punta (`CLAUDE.md`).
- **Una alerta nueva** se clasifica igual que aquí:
  - si afecta a lo que se despliega, se corrige en un ticket;
  - si es de desarrollo, se justifica y se descarta, o se espera la actualización.
- **Antes de PROD (DRA-65)**, se vuelve a correr `npm audit --omit=dev` en el frontend y el portal y se revisa que no haya alertas abiertas del backend.
