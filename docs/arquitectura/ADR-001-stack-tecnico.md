# ADR-001: Stack técnico de la plataforma

- **Estado:** Aceptado (28/10/2026)
- **Fecha:** 28/10/2026
- **Tarea Jira:** DRA-42
- **Decisores:** Garyn Fernando Huarhuachi Ramos, Jefferson Jesús Ventura Ruiz

## Contexto

La tesis fija parte de la tecnología en los requerimientos no funcionales: Besu con QBFT (RNF11), Solidity con bibliotecas auditadas (RNF08), IPFS privado (RNF03), firma con MetaMask sin custodia de claves en el servidor (RNF05, RNF09) y AWS (RNF06). Quedaban abiertos el backend, el frontend, la base de datos y la herramienta del smart contract.

## Decisión

| Capa | Tecnología | Origen |
|---|---|---|
| Frontend (interno y portal público) | React + TypeScript + Vite + Tailwind CSS | Elegido: es el stack del prototipo, así se reutilizan su guía visual y sus componentes |
| Integración con la billetera | ethers.js + MetaMask | RNF05, RNF09 |
| Backend | **Java 21 (LTS) + Spring Boot**, construido con Maven | Elegido por el equipo |
| Base de datos off-chain | **PostgreSQL** (AWS RDS) | Elegido |
| Acceso a datos y migraciones | **Spring Data JPA (Hibernate) + Flyway** | Ver punto 3 |
| Smart contract | Solidity + OpenZeppelin `AccessControl`, documentado con NatSpec | RNF08 |
| Desarrollo y pruebas del contrato | **Hardhat** (pruebas en TypeScript) | Elegido |
| Integración backend ↔ Besu | web3j (envoltorios Java generados a partir del ABI de Hardhat) | Consecuencia de elegir Java |
| Blockchain | Hyperledger Besu, QBFT, 4 validadores, sin costo de gas | RNF11 |
| Almacenamiento de PDF | IPFS privado (Kubo con clave de enjambre), por su API HTTP | RNF03 |
| Infraestructura | AWS (EC2 o contenedores, RDS, Secrets Manager) | RNF06, RNF03 |
| Desarrollo local | Docker Compose: 4 nodos Besu + IPFS + PostgreSQL | Elegido |

### Bibliotecas del backend por requerimiento

| Necesidad | Biblioteca | Requerimiento |
|---|---|---|
| Autenticación, roles y sesión de 30 min | Spring Security | HU03, RNF02 |
| Hash adaptativo de contraseñas | Argon2 o BCrypt (`spring-security-crypto`) | RNF02 |
| HMAC del DNI | `javax.crypto` (HmacSHA256), clave en AWS Secrets Manager | RNF03 |
| Límite de 10 consultas por minuto por IP en el portal | Bucket4j | RNF04, HU20 |
| Generación del PDF y su hash SHA-256 | Apache PDFBox u OpenPDF, `MessageDigest` | HU16 |
| Código QR | ZXing | HU16, HU19 |
| Importación de la plantilla Excel | Apache POI | HU09 |
| Lectura de eventos del contrato | web3j (filtros de eventos con reanudación por bloque) | HU18 |

## Justificación

1. **Frontend en React + TypeScript.** El prototipo validado ya usa este stack. Rehacerlo en otro framework no aporta nada y se perdería la guía visual.
2. **Backend en Java + Spring Boot.** Es robusto, está muy difundido en el sector público peruano y tiene un ecosistema maduro para seguridad (Spring Security). Con web3j se integra con redes EVM como Besu. A cambio, el proyecto usa dos lenguajes: Java en el backend y TypeScript en el frontend y en las pruebas del contrato.
3. **Spring Data JPA + Flyway en lugar de Prisma.** El equipo eligió "PostgreSQL + Prisma", pero **Prisma es un ORM exclusivo de Node.js/TypeScript y no se puede usar desde Java**. El equivalente en Spring Boot es Spring Data JPA (Hibernate) como ORM y Flyway para las migraciones versionadas, que es lo que aportaba Prisma. La base de datos sigue siendo PostgreSQL. Confirmado por el equipo.
4. **Hardhat.** Las pruebas del contrato se escriben en TypeScript, igual que el frontend, y Hardhat se integra directamente con OpenZeppelin. Genera el ABI que web3j usa para crear los envoltorios Java.
5. **La firma ocurre en el navegador.** Para cumplir RNF05, el backend nunca recibe claves privadas. Prepara el PDF y su hash (HU16) y los guarda en IPFS (HU17). El frontend llama al contrato desde MetaMask con ethers.js, y el backend confirma el resultado leyendo los eventos del contrato con web3j (HU18). La blockchain es la fuente de verdad (RNF10).

## Consecuencias

- La estructura del repositorio queda así: `plataforma/contracts` (Hardhat, TypeScript), `plataforma/backend` (Spring Boot, Maven), `plataforma/frontend` (React + Vite) y `plataforma/infra` (Docker Compose, configuración de Besu e IPFS).
- La integración continua (DRA-43) tiene que compilar y probar tanto Java como TypeScript.
- Versiones fijadas en DRA-43 (última estable al 29/10/2026): Spring Boot 4.1.2, Maven 3.9.16 (wrapper), web3j 6.1.0, Flyway (gestionado por Spring Boot), PostgreSQL 17, Testcontainers 2; React 19.3, Vite 8.3, TypeScript 7.0 (frontend) y 6.0 (contratos), Tailwind CSS 4.3, ethers 6.17; Hardhat 3.21, Solidity 0.8.30, OpenZeppelin Contracts 5.6. Besu 26.10.2 (DRA-45) y Kubo v0.43.1 (DRA-46).
- En HU06 (DRA-17) el backend lee el contrato con `FunctionEncoder` de web3j en lugar de envoltorios generados, porque solo usa dos funciones de lectura; los envoltorios se generarán cuando el registro de documentos (HU18) lo justifique.
- Al compilar el contrato hay que usar una versión de la EVM compatible con el hito configurado en el génesis de Besu. En DRA-45 se fijó Cancun (`cancunTime: 0` en el génesis y `evmVersion: cancun` en Hardhat), con `chainId` 20260. Detalle en `plataforma/infra/besu/README.md`.

## Alternativas descartadas

| Alternativa | Motivo |
|---|---|
| Node.js + NestJS | Compartía lenguaje con el frontend, pero el equipo tiene amplia experiencia en Java y prefirió Spring Boot |
| Python + FastAPI | Agrega otro lenguaje sin ventajas para el caso |
| Foundry | Pruebas en Solidity; agrega curva de aprendizaje |
| MySQL | Sin ventajas frente a PostgreSQL para este caso |
