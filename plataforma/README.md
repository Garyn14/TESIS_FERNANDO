# Plataforma

Stack definido en [ADR-001](../docs/arquitectura/ADR-001-stack-tecnico.md).

| Carpeta | Contenido | Tecnología |
|---|---|---|
| `backend/` | API, base de datos off-chain, integración con Besu e IPFS | Java 21, Spring Boot 4.1, Spring Data JPA, Flyway, web3j |
| `frontend/` | Plataforma interna y portal público de verificación | React 19, TypeScript, Vite 8, Tailwind CSS 4, ethers.js |
| `contracts/` | Smart contract de registro de documentos | Solidity 0.8.30, OpenZeppelin 5, Hardhat 3 |
| `infra/` | Servicios para desarrollo local | Docker Compose: PostgreSQL 17 y red Besu QBFT de 4 validadores ([infra/besu](infra/besu/README.md)); IPFS en DRA-46 |

## Requisitos

- Java 21 (el Maven Wrapper descarga Maven 3.9 automáticamente)
- Node.js 22
- Docker (para PostgreSQL local y para las pruebas del backend con Testcontainers)

## Levantar en local

```bash
# 1. Base de datos y red Besu
cd plataforma/infra
cp .env.example .env
./besu/generar-red.sh            # solo la primera vez
docker compose --profile besu up -d   # sin --profile besu levanta solo PostgreSQL

# 2. Backend (http://localhost:8080)
cd ../backend
./mvnw spring-boot:run

# 3. Frontend (http://localhost:5173, redirige /api al backend)
cd ../frontend
npm install
npm run dev
```

Comprobación rápida: `curl http://localhost:8080/api/salud` responde `{"estado":"ok",...}`.

## Variables de entorno del backend

| Variable | Valor por defecto |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/plataforma` |
| `DB_USER` / `DB_PASSWORD` | `plataforma` / `plataforma` |
| `BESU_RPC_URL` | `http://localhost:8545` |
