# Evidencia HU02: Editar o desactivar cuentas (DRA-13)

Capturas de la pantalla **Usuarios** del Administrador, tomadas el 29/10/2026.

Igual que en HU01, el inicio de sesión llega con HU03, así que se usó la API simulada con las mismas respuestas que el backend real (comprobadas en sus pruebas). Para regenerarlas, levanta el frontend (`npm run dev` en `plataforma/frontend`) y ejecuta `node generar_capturas.cjs <carpeta de salida>`.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu02_1_lista_con_acciones.png` | Cada cuenta con sus acciones Editar y Desactivar; no hay opción para eliminar | No se eliminan cuentas |
| `hu02_2_editar.png` | Edición del nombre y del rol; el nombre de usuario se muestra pero no se edita | Editar nombre y rol |
| `hu02_3_editada.png` | Cambios guardados y reflejados en la lista | Editar nombre y rol |
| `hu02_4_confirmar_desactivar.png` | Confirmación antes de desactivar, en rojo, explicando que la cuenta no se elimina | Desactivar pide confirmación |
| `hu02_5_inactiva.png` | Cuenta marcada como Inactiva, con sus datos y la opción Reactivar | La desactivación no elimina la cuenta |
| `hu02_6_propia_cuenta.png` | El servidor rechaza que el Administrador desactive su propia cuenta | Bloqueo de la propia cuenta |
| `hu02_7_confirmar_reactivar.png` | Confirmación para reactivar con el mismo rol | Reactivar |

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/usuarios/EditarDesactivarCuentaTest.java` | 11 |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/usuarios/PermisosGestionUsuariosTest.java` | 3 (401 y 403 en las 6 rutas; no existe DELETE) |
| Frontend | `plataforma/frontend/src/usuarios/PaginaUsuarios.test.tsx` | 5 |

## Hallazgo durante la verificación

Las capturas en el navegador real revelaron que la ventana modal se cerraba sola en modo desarrollo. React ejecuta dos veces los efectos en StrictMode, y la limpieza del efecto llamaba a `close()`. Las pruebas no lo detectaron porque jsdom no implementa `showModal`. Se corrigió en `src/comun/Modal.tsx`.
