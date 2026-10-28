# Análisis del prototipo de la plataforma interna

Prototipo de Figma Make, commit `b69c8c6` (28/10/2026), copiado en [`prototipo/`](../../prototipo/).
Análisis del 28/10/2026.

## 1. Resumen

El prototipo **compila y funciona**. Se recorrió automáticamente con un navegador, con los tres roles, sin errores en la consola. Se tomaron 28 capturas que cubren los flujos F1, F2 y F3 y las pantallas principales de cada rol.

Representa con fidelidad el proceso propuesto de la tesis (sección 3.1.1) y cubre la mayoría de las historias de usuario. Su valor principal es como **especificación visual y de comportamiento**. Como código no conviene reutilizarlo tal cual (ver §4).

## 2. Qué es técnicamente

| Aspecto | Detalle |
|---|---|
| Stack | React 19, TypeScript 5.7, Vite 8, Tailwind CSS 4, íconos lucide-react |
| Código | Un solo archivo `src/App.tsx` de ~6.100 líneas, con unos 50 componentes, y `src/index.css` |
| Estado | Un objeto `SharedState` en `sessionStorage`, compartido entre roles |
| Navegación | Por estado interno, sin rutas ni URLs |
| Datos | Fijos en el código (lotes 2026-006 y 2026-007, documentos individuales, avisos) |
| Diseño | Solo escritorio: `min-width: 1180px`, pensado para 1440 px |

## 3. Cobertura frente a las historias de usuario

| Épica | Historias | Cubierto | Notas |
|---|---|---|---|
| E1 Usuarios, roles y áreas | HU01–HU06 | HU03 (parcial) | Solo el login. No hay Administrador, bloqueo por intentos, expiración de sesión ni cambio de contraseña |
| E2 Registro de solicitudes | HU07–HU09 | HU07, HU09 | Falta el formulario a solicitud de parte (HU08) y el Certificado de Reconocimiento |
| E3 Revisión y autorización | HU10–HU18 | Completa (simulada) | Bandeja, revisión de lote e individual, observar, rechazar, corregir, firmar con falla parcial |
| E4 Verificación pública | HU19–HU21 | No | Proyecto aparte |
| E5 Consulta y trazabilidad | HU22–HU25 | Completa | Búsqueda, historial, auditoría técnica, impresión y duplicado |
| E6 Notificaciones | HU26–HU28 | Completa | |
| E7 Anulación y reemisión | HU29–HU30 | Completa (simulada) | |

## 4. Hallazgos

### 4.1 Diferencias con la tesis (conviene resolverlas)

1. **Nombre de la institución.** El prototipo dice "Agencia Agraria Satipo – DRA Junín", y la tesis dice "Dirección Regional de Agricultura Satipo, Junín". Afecta el título, el planteamiento y la población.
2. **No funciona en celular.** RNF09 exige que la firma con MetaMask funcione también en dispositivos móviles, pero el prototipo tiene un ancho mínimo de 1180 px. Si el director firma durante sus comisiones de campo, que es el problema central de la tesis, lo más probable es que lo haga desde el celular. Las pantallas del Director (bandeja, revisión y firma) deberían tener una versión móvil.
3. **Faltan controles de seguridad en el login.** HU03 pide bloquear la cuenta tras 3 intentos fallidos y cerrar la sesión tras 30 minutos de inactividad, y RNF02 pide contraseñas de 8 a 20 caracteres. El prototipo no lo muestra. No es grave en un prototipo, pero el sistema real debe implementarlo.
4. **"Procesando firma" no existe como estado.** La documentación lo lista entre los 6 estados y HU23 habla de "seis estados posibles", pero en el código solo hay 5 (`Pendiente`, `Observado`, `Rechazado`, `Firmado`, `Anulado`). "Procesando firma" solo aparece en la ventana de progreso. En el sistema real sí debe ser un estado persistente, porque HU18 corrige los documentos "detenidos en proceso de firma".
5. **Dominio de verificación.** El certificado impreso dice `verifica.agrojunin.gob.pe`. Hay que confirmar si ese dominio existe o si es un ejemplo, porque irá en cada documento impreso y en el código QR.

### 4.2 Problemas funcionales del prototipo (corregir antes de la reunión de validación)

1. **Mesa de Partes no encuentra documentos que no estén firmados.** Si se entra como Luis al empezar, al buscar "Teodoro", "004817", "Kevin" o "Ccori" sale "No se encontraron documentos", aunque esos trámites existen como Pendientes u Observados. Esto contradice HU23 ("ver el estado… para informar al ciudadano sobre su trámite", con seis estados posibles) y el rol de Mesa de Partes, que es quien recibe el expediente y atiende al ciudadano. El flujo F10 solo funciona si antes se hicieron F2 y F6.
2. **Las tablas se desbordan a 1440 px.** En "Documentos firmados" (Director), la columna Acciones queda cortada y el botón "Anular" se ve como "Anu". En "Buscar documentos" (Mesa de Partes), al desplazarse se pierde la columna Código.

### 4.3 Detalles visuales menores

- En el documento final, la franja verde del pie sobresale del marco dorado (captura 28).
- Los campos de fecha muestran el formato del navegador (`09/16/2026` en un navegador en inglés). En el sistema real conviene forzar `dd/mm/aaaa`.

### 4.4 Calidad del código

- `npm run build` funciona, pero el chequeo de tipos (`tsc --noEmit`) da **6 errores**. Por ejemplo, `RegistryDocument` no declara `annulmentRecord` ni `originalCode` aunque el código los usa. No rompen el prototipo, porque Vite no revisa tipos al compilar.
- Tener todo en un solo archivo, sin rutas ni capa de datos, está bien para un prototipo. Para el sistema real hace falta separar componentes, usar rutas con URL propia (por ejemplo, para abrir un documento desde una notificación o un enlace) y conectar una API.

## 5. Prueba de los flujos

Se automatizaron los flujos de la documentación con [`capturas/probar_flujos.cjs`](capturas/probar_flujos.cjs). Cada flujo parte de un estado limpio.

| Flujo | Resultado |
|---|---|
| F1 Emisión por lista | OK |
| F2 Firmar lote (y cancelar firma) | OK |
| F3 Consulta e impresión, duplicado | OK |
| F4 Observar un beneficiario y corregir | OK |
| F5 Observar o rechazar un lote | OK |
| F6 Rechazo individual con aviso a Mesa de Partes | OK |
| F7 Firma múltiple con falla y reintento | OK |
| F8 Reemisión | OK |
| F9 Anulación | OK |
| F10 Búsquedas | Solo funciona si antes se firmó o rechazó el documento (ver §4.2) |
| Login incorrecto | OK |

No hubo errores en la consola del navegador en ningún flujo.

## 6. Qué aprovechar para el desarrollo real

1. **Stack del frontend.** La tesis no lo definía. Usar **React + TypeScript + Vite + Tailwind**, igual que el prototipo, permite reutilizar los estilos y componentes visuales.
2. **Guía visual.** Los colores, tipografía y componentes ya están definidos como tokens en `prototipo/src/index.css` (`@theme`). Se pueden copiar tal cual.
3. **Modelo de datos.** Los tipos de `App.tsx` (`DirectorItem`, `RegistryDocument`, `CaseRecord`, `WorkflowHistory`, `Beneficiary`, `EventData`) son un buen punto de partida para el modelo de la base de datos y de la API.
4. **Textos y mensajes.** La sección 8 de la documentación del prototipo sirve como catálogo de mensajes del sistema.
5. **Criterios de aceptación visuales.** Los flujos F1 a F10 sirven como guiones de prueba de aceptación con el Product Owner.
6. **Evidencia para la tesis.** Las capturas sirven para el Cap. III (prototipado y validación con el negocio).

## 7. Capturas

Generadas con [`capturas/generar_capturas.cjs`](capturas/generar_capturas.cjs), a 1440 px de ancho, siguiendo F1, F2 y F3.

| # | Rol | Pantalla |
|---|---|---|
| 01–02 | — | Login y error de login |
| 03–13 | Área encargada | Inicio, notificaciones, Mis documentos, Nuevo documento, emisión por lista (vacía, error de DNI, corregida), vista previa, confirmación, envío exitoso, documento observado |
| 14–22 | Director | Inicio, Por revisar, revisión individual, ventana de rechazo, revisión de lote, billetera, progreso de firma, resultado, Documentos firmados |
| 23–28 | Mesa de Partes | Inicio, búsqueda, búsqueda "Ccori", detalle, detalle técnico de auditoría, documento final |

No se capturaron los flujos F4 a F10 (observar beneficiario, rechazo con aviso, firma con falla, reemisión, anulación y búsquedas adicionales). Se pueden agregar al script si se necesitan para la tesis.
