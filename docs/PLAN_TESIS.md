# Plan de desarrollo de la tesis

Basado en la captura del documento del 27/10/2026 (`tesis/versiones/2026-10-27_proyecto_de_tesis.pdf`).

La tesis tiene dos componentes que avanzan en paralelo y se alimentan entre sí:

| Componente | Qué produce | Dónde vive |
|---|---|---|
| **Teórico** | Documento de tesis (Caps. I a V) | `tesis/` |
| **Técnico** | Plataforma funcionando y evidencia medible | `plataforma/`, `experimento/` |

El punto de unión es el **Capítulo III**, que documenta la construcción, y el **Capítulo IV**, que solo puede escribirse con datos reales del componente técnico.

---

## 1. Mapa capítulo ↔ trabajo técnico

| Capítulo | Estado actual | Depende de | Entregable técnico asociado |
|---|---|---|---|
| I. Planteamiento metodológico | Avanzado | — | Instrumentos de medición (`experimento/instrumentos/`) |
| II. Marco referencial | Avanzado | — | — |
| III. Construcción de la solución | Parcial: hay modelado de negocio, requerimientos y planificación, pero no ejecución | Sprints 0 a 6 | Código, arquitectura, pruebas |
| IV. Resultados y contrastación | Esqueleto | Plataforma desplegada + mediciones | `experimento/datos/`, `experimento/analisis/` |
| V. Conclusiones y recomendaciones | Vacío | Cap. IV | — |

---

## 2. Estructura propuesta del Capítulo III

Hoy el capítulo III termina en la planificación de sprints. Una tesis de ingeniería de software suele documentar también el diseño, la ejecución de cada sprint y las pruebas. Propuesta:

```
3.1 Modelamiento del negocio                (ya existe)
3.2 Requerimientos                          (ya existe: RF01–RF51, RNF01–RNF12, épicas, HU, backlog)
3.3 Arquitectura de la solución             (NUEVO)
    3.3.1 Vista general (on-chain / off-chain)
    3.3.2 Diseño del smart contract (estados, roles, eventos)
    3.3.3 Modelo de datos off-chain
    3.3.4 Infraestructura (AWS, Besu QBFT, IPFS privado)
    3.3.5 Seguridad y datos personales (HMAC del DNI, custodia de claves)
3.4 Desarrollo por sprints                  (NUEVO: uno por sprint)
    3.4.x Sprint N: objetivo, HU, tareas, evidencias (capturas), revisión y retrospectiva
3.5 Pruebas                                 (NUEVO)
    3.5.1 Pruebas unitarias del smart contract
    3.5.2 Pruebas de integración (backend ↔ Besu ↔ IPFS)
    3.5.3 Pruebas de rendimiento (verificación < 2 s, RNF01)
    3.5.4 Pruebas de aceptación con el Product Owner
3.6 Despliegue
```

Cada sprint genera material para 3.4 y, al terminarlo, se deben guardar capturas, burndown y acta de revisión en `tesis/capitulos/cap3/`.

---

## 3. Calendario integrado

> **Actualizado el 28/10/2026:** el calendario se reprogramó en Jira (Sprint 0: 28/10–11/11 … Sprint 6: 23/12–30/12). Las fechas vigentes y la relación HU ↔ Jira están en [requerimientos/jira.md](requerimientos/jira.md). La tabla siguiente conserva el plan original de la tesis.

Periodo de desarrollo del documento: del 5 de octubre al 29 de noviembre de 2026.

| Sprint | Fechas | Técnico | Teórico (en paralelo) |
|---|---|---|---|
| 0 | 1–6 oct | AWS, red Besu (4 nodos QBFT), IPFS privado, repos y CI | Cerrar Caps. I y II; corregir observaciones (§5) |
| 1 | 7–13 oct | HU01–HU06: usuarios, roles, áreas, billetera del director | Redactar 3.3 Arquitectura |
| 2 | 14–20 oct | HU07–HU09: registro individual y por lista. **Smart contract completo y probado** | 3.3.2 Diseño del contrato; 3.4 Sprints 1–2 |
| 3 | 21 oct–3 nov | HU10–HU12, HU16–HU18: firma, PDF + hash, IPFS, sincronización con la blockchain | 3.4 Sprint 3 |
| 4 | 4–10 nov | HU13–HU15, HU29–HU30: observar, rechazar, corregir, anular, reemitir | 3.4 Sprint 4 |
| 5 | 11–17 nov | HU19–HU21: portal público de verificación (QR / código) | 3.4 Sprint 5; preparar instrumentos del experimento |
| 6 | 18–24 nov | HU22–HU28: consulta, auditoría, notificaciones | 3.4 Sprint 6; 3.5 Pruebas |
| — | 25–29 nov | Despliegue final, pruebas de aceptación | 3.6 Despliegue |
| — | Después | **Medición posprueba: 30 transacciones (Ge y Gc)** | Caps. IV y V |

> Nota: hoy es 27/10 y el calendario ubica al proyecto dentro del Sprint 3. Conviene revisar el avance real del código y ajustar las fechas si hace falta.

---

## 4. Stack técnico

**Definido en la tesis (RNF):**
- Blockchain: Hyperledger Besu, consenso QBFT, 4 o más validadores, red EVM permisionada sin costo de gas (RNF11).
- Smart contract: Solidity, documentado con NatSpec, control de acceso con bibliotecas auditadas como OpenZeppelin AccessControl (RNF08).
- Almacenamiento: IPFS privado (RNF03).
- Firma: MetaMask; el servidor no custodia claves (RNF05, RNF09).
- Infraestructura: AWS (RNF06).
- Privacidad: en la blockchain solo va el HMAC del DNI; la clave se guarda en un gestor de secretos (RNF03, Ley 29733).

**Decidido en DRA-42** (detalle en [arquitectura/ADR-001-stack-tecnico.md](arquitectura/ADR-001-stack-tecnico.md)):
- Frontend: React + TypeScript + Vite + Tailwind (como el prototipo), con ethers.js para MetaMask.
- Backend: Java 21 + Spring Boot (Maven), con web3j para Besu.
- Base de datos: PostgreSQL, con Spring Data JPA + Flyway.
- Smart contract: Hardhat.

---

## 5. Observaciones encontradas en el documento actual

**De fondo:**
1. **La Tabla 27 ya tiene datos de posprueba** para Ge y Gc, aunque la plataforma todavía está en desarrollo según la Tabla 26. Si son datos ilustrativos, hay que marcarlos así o quitarlos. Los resultados finales deben salir de mediciones reales, guardadas en `experimento/datos/`.
2. **Hay una inconsistencia en el diseño experimental.** El texto habla de asignación aleatoria (R), pero el muestreo es no probabilístico por conveniencia. Conviene alinear ambos o justificar la combinación (por ejemplo, con un diseño cuasi-experimental).
3. **I4 (Tasa de certificados inmutables)** vale 0 % en Gc y 100 % en Ge por definición, así que no tiene varianza. Una prueba estadística no aporta nada en ese caso; conviene tratarlo de forma descriptiva o redefinir el indicador.
4. **Los índices de la Tabla 3** (3–7 días, 1–15 min) no coinciden con los valores de Gc de la Tabla 27 (5–10 días, 10–20 min).
5. En el **Marco Teórico** falta una sección sobre IPFS, smart contracts y redes permisionadas (Besu/QBFT), aunque son la base técnica de la solución.

**De forma:**
- Los indicadores de la Tabla 1 están numerados como secciones (1.7 a 1.11), lo que rompe la numeración del Capítulo I, que salta de 1.6 a 1.12.
- La numeración se duplica en el Cap. III: "3.1.2 Requerimiento No Funcionales" debería ser 3.2.2, y lo mismo pasa con 3.2.2/3.2.3/3.2.4. También queda un "3.1.2.1." suelto.
- Hay figuras y tablas sin numerar ("Figura X", "Tabla XX").
- El Capítulo V aparece numerado como "1." y sus secciones como 4.7 y 4.8.
- La E7 se llama "Anulación y remisión" en 3.2.1.7 y "Anulación y reemisión" en la Tabla 16.
- Hay erratas: "CONSTRASTACIÓN", "Pospueba", "novel de satisfacción".

---

## 6. Flujo de trabajo propuesto

- Cada vez que haya un avance importante del documento, agregar un PDF fechado en `tesis/versiones/` (`AAAA-MM-DD_descripcion.pdf`).
- El código se trabaja en ramas por sprint o por HU y se integra a `main` al cerrar cada sprint.
- Al cerrar un sprint, guardar las evidencias (capturas, burndown, acta) para el Cap. III.
- Las mediciones del experimento se guardan en CSV dentro de `experimento/datos/`, y el análisis en scripts reproducibles dentro de `experimento/analisis/`.
