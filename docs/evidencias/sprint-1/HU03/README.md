# Evidencia HU03: Iniciar sesión según el rol (DRA-14)

**Prueba de punta a punta real** del 29/10/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. El script está en [`plataforma/e2e/sprint1.cjs`](../../../../plataforma/e2e/sprint1.cjs) y el resultado en [`resultado.txt`](resultado.txt): **16 de 16 pasos correctos**.

Esta prueba también cubre lo que HU01 y HU02 dejaron pendiente hasta tener el inicio de sesión: crear cuentas desde la pantalla real y comprobar que una cuenta desactivada no puede entrar.

| Captura | Qué muestra | Criterio |
|---|---|---|
| `hu03_01_login.png` | Inicio de sesión único, como en el prototipo | Login único |
| `hu03_02_credenciales_incorrectas.png` | "Usuario o contraseña incorrectos", el usuario se conserva | Mensaje que no revela qué falló |
| `hu03_03_inicio_administrador.png` | Menú del Administrador: Inicio, Usuarios, Billetera del director | Menú según el rol |
| `hu03_04_cuentas_reales.png` | Tres cuentas creadas desde la pantalla, una por rol (HU01) | HU01 de punta a punta |
| `hu03_05_menu_area_encargada.png` | Inicio, Mis documentos, Nuevo documento | Menú según el rol |
| `hu03_06_menu_director.png` | Inicio, Por revisar, Documentos firmados | Menú según el rol |
| `hu03_07_menu_consulta_interna.png` | Inicio, Buscar documentos | Menú según el rol |
| `hu03_08_sin_permiso.png` | Consulta interna escribe `#/usuarios`: no ve la pantalla y la API responde 403 | Dirección sin permiso |
| `hu03_09_cuenta_bloqueada.png` | Tras 3 intentos fallidos, bloqueada hasta una hora después; la contraseña correcta tampoco entra | Bloqueo de una hora |
| `hu03_10_sesion_cerrada_por_desactivacion.png` | El Administrador desactiva una cuenta con sesión abierta; en su siguiente acción vuelve al login con el motivo | Validación en cada solicitud |
| `hu03_11_cuenta_desactivada.png` | La cuenta desactivada intenta entrar: "Su cuenta está desactivada" (HU02) | HU02: no puede iniciar sesión |
| `hu03_12_sesion_expirada.png` | Tras el tiempo de inactividad, la siguiente acción lleva al login con "Su sesión expiró por inactividad" | Expiración de la sesión |

La expiración se probó con 1 minuto (`SESION_INACTIVIDAD=1m`) para no esperar 30. En producción el valor es 30 minutos, comprobado por la prueba `laSesionExpiraTras30MinutosDeInactividad`.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/sesion/InicioSesionTest.java` | 16, con sesiones reales, sin simular usuarios |
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/sesion/CsrfSesionTest.java` | 1: flujo CSRF como lo usa el navegador |
| Frontend | `plataforma/frontend/src/App.test.tsx` | 15: menú de cada rol, rutas sin permiso, cierre, expiración, desactivación y cambio de rol |
| Frontend | `plataforma/frontend/src/sesion/PaginaLogin.test.tsx` | 6 |

## Hallazgos durante la verificación

La prueba de punta a punta encontró cuatro errores que las pruebas de cada capa no detectaron. Los cuatro se corrigieron:

1. **Carga diferida fuera de la transacción (backend).** Al iniciar sesión se leía el rol de la cuenta después de cerrar la transacción. Las pruebas de HU01 y HU02 no lo vieron porque eran transaccionales. Las de HU03 ya no lo son, igual que en producción.
2. **Navegar a una pantalla sin datos no detectaba la desactivación (frontend).** Las pantallas pendientes no llaman al servidor. Ahora cada navegación vuelve a consultar la sesión, lo que además actualiza el menú si cambió el rol.
3. **Pulsar la opción actual no revalidaba la sesión (frontend).** Ahora cada clic en el menú cuenta como visita.
4. **Dos validaciones simultáneas mostraban el motivo equivocado (frontend).** La primera recibía "cuenta desactivada" y la segunda, ya sin sesión, "sesión expirada". Ahora cada navegación valida una sola vez y las respuestas viejas se descartan.

También se aisló una prueba: el ayudante `csrf()` de spring-security-test reemplaza el repositorio de tokens en todo el contexto, así que la prueba del flujo CSRF real usa un contexto propio.
