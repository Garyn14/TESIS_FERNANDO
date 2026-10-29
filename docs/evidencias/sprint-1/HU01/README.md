# Evidencia HU01: Crear cuentas de usuario (DRA-12)

Capturas de la pantalla **Usuarios** del Administrador, tomadas el 29/10/2026.

El inicio de sesión llega con HU03, así que estas capturas se generaron con la API simulada (mismas respuestas que el backend real, comprobadas en sus pruebas). Para regenerarlas, levanta el frontend (`npm run dev` en `plataforma/frontend`) y ejecuta `node generar_capturas.cjs <carpeta de salida>`.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu01_1_lista.png` | Lista de cuentas: usuario, nombre, rol, estado y fecha de creación | Pantalla Usuarios |
| `hu01_2_validacion.png` | Formulario enviado vacío: cada campo indica qué corregir | Datos inválidos |
| `hu01_3_duplicado.png` | "MQuispe" rechazado porque ya existe "mquispe" | Usuario no se repite, sin distinguir mayúsculas |
| `hu01_4_creada.png` | Cuenta creada, activa y al inicio de la lista, con aviso de confirmación | Cuenta activa con un único rol |
| `hu01_5_movil.png` | La misma pantalla a 390 px de ancho | Uso en celular |

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/usuarios/CrearCuentaTest.java` | 11 |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/usuarios/PermisoCrearCuentaTest.java` | 2 |
| Frontend | `plataforma/frontend/src/usuarios/FormularioCuenta.test.tsx` | 5 |
| Frontend | `plataforma/frontend/src/App.test.tsx` | 2 |
