# Evidencia HU13: Observar un documento (DRA-27)

**Prueba de punta a punta real** del 04/11/2026: navegador (Playwright) + frontend + backend + PostgreSQL 17, sin simulaciones. Es la primera historia del Sprint 4, con su propia prueba ([`plataforma/e2e/sprint4.cjs`](../../../../plataforma/e2e/sprint4.cjs)). Resultado en [`resultado.txt`](resultado.txt): **7 de 7 pasos correctos**, 5 de ellos de HU13.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos; Sprint 3, 34 de 34 pasos.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu13_01_ventana_observar_documento.png` | La revisión de un Certificado de Trabajo con los botones "Observar" y "Firmar", y la ventana "Observar documento" con el motivo escrito | El motivo es obligatorio |
| `hu13_02_documento_observado.png` | "El documento fue observado y volvió al área." con el motivo, sin acciones | Vuelve al área |
| `hu13_03_bandeja_sin_el_observado.png` | Por revisar sin el documento observado; el otro sigue | Sale de Por revisar |
| `hu13_04_mis_documentos_observado.png` | Mis documentos del área: el documento en **Observado** (naranja) y el otro Pendiente | El área lo ve |
| `hu13_05_detalle_con_motivo.png` | El detalle con "El Director lo observó y lo devolvió al área para que lo corrija." y el motivo | El área ve el motivo |

## Qué comprueba la prueba

1. **Ventana de motivo:**
   - "Confirmar" está deshabilitado sin motivo y también con solo espacios;
   - la ayuda es "Explique qué debe corregirse";
   - no aparece el aviso de rechazo.
2. **Al confirmar:**
   - en PostgreSQL el documento queda `OBSERVADO` con su motivo;
   - el historial suma un tercer evento: "Observado por Ing. Carlos Mendoza Rivera: El cargo no coincide con el contrato de trabajo", a nombre de cmendoza;
   - la pantalla ya no ofrece "Firmar" ni "Observar".
3. **Bandeja:** el observado sale de Por revisar y el otro documento sigue.
4. **Área:** lo ve Observado en Mis documentos y, en el detalle, el aviso y el motivo.
5. **Validación y acceso:**
   - un motivo vacío responde 400 ("Indique el motivo.");
   - observar otra vez responde 404 ("Este documento no está pendiente de revisión.");
   - el Área encargada recibe 403.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/ObservarDocumentoTest.java` | 4:<ul><li>vuelve al área con el motivo (recortado) y el historial;</li><li>sale de Por revisar; el área lo ve Observado y con el motivo;</li><li>motivo obligatorio y de hasta 500 caracteres (500 se acepta);</li><li>solo un Pendiente: ni uno ya observado, ni uno en Procesando firma, ni uno inexistente;</li><li>otros roles (403) y sin sesión (401).</li></ul> |
| Backend | `DecisionEnLoteTest.java` | 1 caso nuevo: un motivo de 500 caracteres en un lote entra completo en el historial |
| Frontend | `documentos/Revision.test.tsx` | 1 nueva: ventana "Observar documento", "Confirmar" deshabilitado sin motivo, cuerpo enviado, resultado sin acciones |

Totales: 171 pruebas de backend y 114 de frontend.

## Ajustes durante la verificación

- **Error real, también presente en HU12.** La prueba de un motivo de 500 caracteres falló: el detalle del historial ("Observado por …: [motivo]") superaba los 500 caracteres de su columna, y la base rechazaba la observación. La migración V17 amplía la columna a 1000. La prueba de lotes cubre ahora el mismo caso.
- **Texto para el área:** el aviso del detalle decía "(HU15)". Una referencia interna no debe verse en pantalla, así que se reemplazó por "para que lo corrija".
- **Script de prueba:** una ejecución falló porque dos enlaces tenían el mismo texto ("← Volver a Por revisar" y "Volver a Por revisar"). Ahora la prueba usa el texto exacto, y se repitió completa en un entorno limpio.
