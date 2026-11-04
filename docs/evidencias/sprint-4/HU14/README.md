# Evidencia HU14: Rechazar un documento (DRA-28)

**Prueba de punta a punta real** del 04/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. La prueba del Sprint 4 ([`plataforma/e2e/sprint4.cjs`](../../../../plataforma/e2e/sprint4.cjs)) recorre HU13 y HU14. Resultado en [`resultado.txt`](resultado.txt): **12 de 12 pasos correctos**, 5 de ellos de HU14.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu14_01_ventana_rechazar_documento.png` | La revisión con "Rechazar" (rojo), "Observar" y "Firmar", y la ventana "Rechazar documento" con el motivo y el aviso "El rechazo es definitivo. El documento no podrá reenviarse." | El motivo es obligatorio |
| `hu14_02_documento_rechazado.png` | "El documento fue rechazado." con el motivo, sin acciones | El rechazo es definitivo |
| `hu14_03_bandeja_al_dia.png` | Por revisar sin pendientes: "¡Todo al día!" | Sale de Por revisar |
| `hu14_04_mis_documentos_rechazado.png` | Mis documentos: el documento en **Rechazado** (rojo) y el observado de HU13 en naranja | El área lo ve |
| `hu14_05_detalle_rechazado.png` | El detalle con "El Director lo rechazó. El rechazo es definitivo." y el motivo | El área ve el motivo |

## Qué comprueba la prueba

1. **Ventana de rechazo:** muestra el aviso de que es definitivo, y "Confirmar" está deshabilitado hasta escribir el motivo.
2. **Al confirmar:**
   - en PostgreSQL el documento queda `RECHAZADO` con su motivo;
   - el historial registra "Rechazado por Ing. Carlos Mendoza Rivera: …", a nombre de cmendoza;
   - la pantalla ya no ofrece "Rechazar", "Observar" ni "Firmar".
3. **Es definitivo.** Volver a rechazar, observar o abrirlo para revisar responde 404, y el documento sigue Rechazado. La bandeja queda al día.
4. **Área:** lo ve Rechazado en Mis documentos y, en el detalle, el aviso y el motivo.
5. **Validación y acceso:** un motivo vacío responde 400, y el Área encargada recibe 403.

**Aviso a Mesa de Partes** (tercer criterio de la tesis): lo envía HU28, en el Sprint 6, con las notificaciones. El rechazo queda registrado con su motivo y su historial para que HU28 lo informe.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/RechazarDocumentoTest.java` | 3:<ul><li>queda Rechazado con su motivo y el historial, sale de Por revisar y el área lo ve;</li><li>es definitivo: no se rechaza de nuevo, no se observa, no se abre para revisar ni se prepara para firmar;</li><li>uno observado tampoco se rechaza;</li><li>motivo obligatorio y de hasta 500 caracteres;</li><li>otros roles (403) y sin sesión (401).</li></ul> |
| Frontend | `documentos/Revision.test.tsx` | 1 nueva: la ventana "Rechazar documento" con el aviso, el resultado sin acciones y la ruta del rechazo |

Totales: 171 pruebas de backend y 115 de frontend.

## Ajustes durante la verificación

Ninguno: la prueba de punta a punta pasó completa en su primera ejecución.
