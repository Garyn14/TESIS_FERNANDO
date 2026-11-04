# Evidencia HU15: Corregir y reenviar un documento observado (DRA-29)

**Prueba de punta a punta real** del 04/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. La prueba del Sprint 4 ([`plataforma/e2e/sprint4.cjs`](../../../../plataforma/e2e/sprint4.cjs)) recorre HU13, HU14 y HU15. Resultado en [`resultado.txt`](resultado.txt): **17 de 17 pasos correctos**, 5 de ellos de HU15.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu15_01_correccion_precargada.png` | "Corregir y reenviar – Certificado de Trabajo": el motivo de la observación arriba y el formulario precargado, con el cargo y los apellidos ya corregidos | Se muestra el motivo de la observación |
| `hu15_02_reenviado.png` | "✓ Documento corregido y reenviado a revisión", con el mismo código | El documento vuelve a Pendiente |
| `hu15_03_bandeja_corregido.png` | Por revisar: Lucía Paredes Quintana con la etiqueta **Corregido** y "Sin revisar" | El Director lo revisa de nuevo |
| `hu15_04_corregir_certificado_del_lote.png` | En el detalle del lote, la ventana "Corregir certificado" con el motivo, después del aviso "El DNI ya está en otro certificado de este lote." | Mismas validaciones del registro |
| `hu15_05_lote_con_certificado_reenviado.png` | El lote con el certificado corregido de vuelta en Pendiente y el aviso de reenvío | Vuelve a Pendiente |

## Qué comprueba la prueba

1. **Documento a solicitud de parte.** En su detalle, el área pulsa "Corregir y reenviar":
   - el formulario viene precargado: expediente, apellidos, cargo y fecha en día/mes/año;
   - la pantalla muestra el motivo de la observación;
   - se corrigen el cargo y los apellidos, la vista previa muestra el nuevo texto y se reenvía con confirmación.
2. **En PostgreSQL:**
   - el documento queda Pendiente, con el mismo código, sin motivo y sin revisión, y marcado como corregido;
   - el historial suma CORREGIDO a nombre de pmorales: "Corregido y reenviado a revisión por Pedro Morales Ccanto (Área de Administración). … Apellidos: Paredes Quinto → Paredes Quintana; Cargo: asistente administrativa → secretaria";
   - la observación sigue en el historial.
3. **Director:** lo ve en Por revisar con "Corregido" y "Sin revisar". Al abrirlo ve el texto nuevo, puede firmarlo, y la revisión vuelve a quedar registrada.
4. **Certificado de un lote:**
   - el Director observa un beneficiario y el área lo corrige desde la fila del lote;
   - un DNI de otro certificado del lote se rechaza ("El DNI ya está en otro certificado de este lote.");
   - con los datos correctos vuelve a Pendiente, y el lote aparece en Por revisar con "Corregido".
5. **Reglas y acceso:**
   - un rechazado no se corrige (409, el rechazo es definitivo);
   - uno ya Pendiente tampoco (409);
   - otra área recibe 403, y el Director también.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/CorregirDocumentoTest.java` | 4:<ul><li>vuelve a Pendiente sin revisión ni motivo, con el HMAC del DNI y el texto recalculados, los cambios en el historial y "Corregido" en la bandeja;</li><li>mismas validaciones del registro (expediente, DNI, datos del tipo), el expediente de otro documento no se usa, y reenviar sin cambios queda anotado;</li><li>en un lote solo cambia el beneficiario, sin repetir un DNI del lote, y el texto del evento no cambia;</li><li>otra área, el Director y sin sesión no corrigen; un Pendiente o un rechazado no se corrigen.</li></ul> |
| Frontend | `documentos/Correccion.test.tsx` | 4: el botón en el detalle; el formulario precargado con el motivo y el reenvío; un documento no observado no se corrige; la corrección de un certificado del lote con el error del DNI y el reenvío |
| Frontend | `documentos/Revision.test.tsx` | 1 nueva: la etiqueta "Corregido" en la bandeja |

Totales: 178 pruebas de backend y 120 de frontend.

## Ajustes durante la verificación

Ninguno: la prueba de punta a punta pasó completa en su primera ejecución.
