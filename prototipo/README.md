# Prototipo de la plataforma interna

Copia del prototipo navegable hecho en **Figma Make**.

- **Origen:** repositorio `Garyn14/AgenciaAgrariaSatipoPlataformaInternaPrototipo`, commit `b69c8c6` (28/10/2026).
- **Fuente de verdad:** el repositorio de Figma. Esta carpeta es una copia de referencia; si el prototipo cambia en Figma, hay que volver a copiarlo.
- **Documentación funcional:** [docs/diseno/prototipo_plataforma_interna.md](../docs/diseno/prototipo_plataforma_interna.md)
- **Análisis y capturas:** [docs/diseno/analisis_prototipo.md](../docs/diseno/analisis_prototipo.md)

No se copiaron `CLAUDE.md`, `AGENTS.md` ni `.gitattributes`, porque son propios del entorno de Figma Make.

## Ejecutarlo

Requiere Node.js 22.

```bash
cd prototipo
npm install
npm run dev        # http://localhost:8443
```

Usuarios de demostración (contraseña `Demo2026`): `rquispe` (Área encargada), `cmendoza` (Director), `ltorres` (Mesa de Partes).

Todo es simulado: blockchain, IPFS, MetaMask, Excel, PDF e impresión. Los datos viven en `sessionStorage`.
