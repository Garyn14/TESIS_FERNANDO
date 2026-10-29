# Tesis: Plataforma con Blockchain para la emisión y verificación de certificados y constancias

[![CI](https://github.com/Garyn14/TESIS_FERNANDO/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Garyn14/TESIS_FERNANDO/actions/workflows/ci.yml)

**Título:** Plataforma con Blockchain usando la metodología Scrum para la emisión y verificación de certificados y constancias en la Dirección Regional de Agricultura Satipo, Junín.

**Institución:** Universidad Nacional Mayor de San Marcos, FISI, Escuela Profesional de Ingeniería de Software.
**Autores:** Huarhuachi Ramos, Garyn Fernando · Ventura Ruiz, Jefferson Jesús.
**Año:** 2026.

## Resumen

La DRA Satipo emite cinco documentos de forma manual: Constancia de Productor Activo y certificados de Prácticas, Trabajo, Reconocimiento y Capacitación. Esto trae tres problemas principales:

- La emisión se detiene cuando el director no está en la sede para firmar.
- No hay respaldo de los documentos emitidos.
- La verificación de autenticidad se hace por correo y puede tardar días.

La propuesta es una plataforma web que hace lo siguiente:

- Genera los documentos desde plantillas, uno por uno o por lista.
- Permite que el director los firme con su billetera (MetaMask), de forma individual o en lote y desde cualquier lugar.
- Registra el hash de cada documento en una red blockchain permisionada (Hyperledger Besu, QBFT) y guarda el PDF en un IPFS privado.
- Ofrece un portal público para verificar la autenticidad con un código QR o un código de verificación, con respuesta en menos de 2 segundos.

## Estructura del repositorio

```
tesis/                 Componente teórico (documento de tesis)
  versiones/           Capturas del documento completo (PDF), fechadas
  capitulos/           Notas y borradores por capítulo
docs/                  Puente entre la tesis y el desarrollo
  PLAN_TESIS.md        Plan de desarrollo: capítulos, sprints y pendientes
  requerimientos/      Épicas, historias de usuario, backlog
  arquitectura/        Decisiones técnicas (ADR) e integración continua
  diseno/              Documentación, análisis y capturas del prototipo
prototipo/             Prototipo navegable (Figma Make, React), solo referencia
plataforma/            Componente técnico (código)
  contracts/           Smart contract (Solidity) y sus pruebas
  backend/             API, base de datos off-chain, integración Besu/IPFS
  frontend/            Interfaz interna y portal público de verificación
  infra/besu/          Red permisionada Besu QBFT (4 nodos validadores)
  infra/ipfs/          Nodo IPFS privado
experimento/           Evidencia del Capítulo IV
  instrumentos/        Fichas de observación, cuestionario Likert
  datos/control/       Mediciones del grupo de control (proceso actual)
  datos/experimental/  Mediciones del grupo experimental (plataforma)
  analisis/            Scripts de estadística (normalidad, prueba de hipótesis)
```

El plan completo de desarrollo está en [docs/PLAN_TESIS.md](docs/PLAN_TESIS.md).
