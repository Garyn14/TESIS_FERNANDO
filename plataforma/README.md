# Plataforma

Stack definido en [ADR-001](../docs/arquitectura/ADR-001-stack-tecnico.md).

| Carpeta | Contenido | Tecnología |
|---|---|---|
| `backend/` | API, base de datos off-chain, integración con Besu e IPFS | Java 21, Spring Boot 4.1, Spring Data JPA, Flyway, web3j |
| `frontend/` | Plataforma interna y portal público de verificación | React 19, TypeScript, Vite 8, Tailwind CSS 4, ethers.js |
| `contracts/` | Smart contract de registro de documentos | Solidity 0.8.30, OpenZeppelin 5, Hardhat 3 |
| `e2e/` | Pruebas de punta a punta en navegador real ([e2e](e2e/README.md)) |
| `infra/` | Servicios para desarrollo local | Docker Compose: PostgreSQL 17, red Besu QBFT de 4 validadores ([infra/besu](infra/besu/README.md)) y nodo IPFS privado ([infra/ipfs](infra/ipfs/README.md)) |

## Requisitos

- Java 21 (el Maven Wrapper descarga Maven 3.9 automáticamente)
- Node.js 22
- Docker (para PostgreSQL local y para las pruebas del backend con Testcontainers)

## Levantar en local

```bash
# 1. Base de datos, red Besu e IPFS
cd plataforma/infra
cp .env.example .env     # activa los perfiles besu e ipfs (COMPOSE_PROFILES)
./besu/generar-red.sh    # solo la primera vez
./ipfs/generar-clave.sh  # solo la primera vez
docker compose up -d

# 2. Backend (http://localhost:8080). La primera vez, con la contraseña temporal del Administrador:
cd ../backend
PLATAFORMA_ADMIN_CONTRASENA='<8 a 20 caracteres>' ./mvnw spring-boot:run

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
| `PLATAFORMA_ADMIN_USUARIO` / `PLATAFORMA_ADMIN_NOMBRE` / `PLATAFORMA_ADMIN_CONTRASENA` | Primera cuenta de Administrador (RF09). Ver [backend/README.md](backend/README.md#inicialización-del-sistema-rf09) |
| `SESION_INACTIVIDAD` | `30m`. Tiempo de inactividad de la sesión (RNF02). Solo se cambia para pruebas |
| `SESION_COOKIE_SEGURA` | `false`. Poner `true` en producción (HTTPS) |
| `PLATAFORMA_CONTRATO_DIRECCION` | *(vacía)*. Dirección del contrato `RegistroDocumentos` desplegado (HU06). Ver [contracts/README.md](contracts/README.md#despliegue) |
| `BESU_RPC_PUBLICA` | `http://localhost:8545`. Nodo que usa la billetera del navegador |
| `PLATAFORMA_IPFS_URL` | `http://localhost:5001`. API del nodo IPFS privado, donde se guardan los PDF finales (HU17). Ver [infra/ipfs](infra/ipfs/README.md) |
