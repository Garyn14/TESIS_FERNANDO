# Evidencia HU04: Cambiar o restablecer la contraseña (DRA-15)

**Prueba de punta a punta real** del 29/10/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. Con HU04, toda cuenta nueva (incluida la primera del Administrador) debe cambiar su contraseña temporal al ingresar, así que la prueba del sprint se amplió para recorrer HU01 a HU04 juntas: [`plataforma/e2e/sprint1.cjs`](../../../../plataforma/e2e/sprint1.cjs). Resultado en [`resultado.txt`](resultado.txt): **24 de 24 pasos correctos**.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu04_01_cambio_obligatorio.png` | El Administrador entra con la contraseña temporal: solo ve "Cambie su contraseña", sin menú; la API responde 403 a todo lo demás | Cambio obligatorio en el siguiente ingreso |
| `hu04_02_actual_incorrecta.png` | "La contraseña actual no es correcta." en su campo | El cambio exige la contraseña actual |
| `hu04_03_bloqueada_en_lista.png` | La lista de Usuarios muestra "Bloqueada hasta…" y cabe a 1280 px con las tres acciones | Bloqueo visible para el Administrador |
| `hu04_04_restablecida.png` | Contraseña temporal generada y mostrada una sola vez para entregarla | Restablecimiento por el Administrador |
| `hu04_05_sesion_cerrada_por_restablecimiento.png` | La persona tenía la sesión abierta: en su siguiente acción vuelve al login con "El Administrador restableció su contraseña" | Restablecer cierra las sesiones |
| `hu04_06_cambio_voluntario.png` | Cambio desde "Cambiar contraseña" del encabezado | Cambio voluntario |
| `hu04_07_otra_sesion_cerrada.png` | La misma cuenta en otro navegador: "Su contraseña se cambió en otra sesión" | Cambiar cierra las demás sesiones |

Además, la prueba comprueba que:
- restablecer **desbloquea** la cuenta, que la contraseña anterior deja de servir y que la persona debe cambiar la temporal;
- el Administrador **no puede restablecer su propia** contraseña;
- la sesión desde la que se cambió la contraseña **sigue activa**.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/sesion/ContrasenasTest.java` | 10, con sesiones reales |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/usuarios/PermisosGestionUsuariosTest.java` | Incluye la ruta de restablecimiento (401 y 403) |
| Frontend | `plataforma/frontend/src/sesion/FormularioCambioContrasena.test.tsx` | 6 |
| Frontend | `plataforma/frontend/src/usuarios/generador.test.ts` | 2 |
| Frontend | `plataforma/frontend/src/usuarios/PaginaUsuarios.test.tsx` y `src/App.test.tsx` | 5 nuevas: restablecer, validación, bloqueo visible, cambio obligatorio y cambio desde el encabezado |

## Hallazgos durante la verificación

1. **Columna del historial demasiado corta.** `CONTRASENA_RESTABLECIDA` tiene 23 caracteres y la columna `evento` admitía 20. Lo detectó la prueba contra PostgreSQL real. Se amplió a 30 en la misma migración V7, que aún no estaba en `main`.
2. **Tabla desbordada a 1280 px.** Con la tercera acción por cuenta, la tabla de Usuarios necesitaba desplazamiento horizontal y ocultaba acciones. Ahora las acciones se apilan, el estado y la fecha pueden ocupar dos líneas, y la prueba de punta a punta verifica que no haya desborde.
