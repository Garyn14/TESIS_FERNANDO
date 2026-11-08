# Evidencia HU26: Aviso de documento pendiente al director (DRA-39)

**Prueba de punta a punta real** del 08/11/2026. Recorre, sin simulaciones:
- el navegador (Chromium, Playwright), con las sesiones del Director, del Área encargada y de Mesa de Partes;
- el frontend, el backend y PostgreSQL 17;
- el IPFS privado y la red Besu local.

La prueba del Sprint 6 ([`plataforma/e2e/sprint6.cjs`](../../../../plataforma/e2e/sprint6.cjs)) recorre HU22 a HU26 con los mismos datos (ver la [evidencia de HU22](../HU22/README.md)). Resultado en [`resultado.txt`](resultado.txt): **26 de 26 pasos correctos**, 3 de ellos de HU26.

**Regresión** en entornos limpios: ver la sección final.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu26_01_avisos_del_director.png` | La campana del Director con **6** sin leer y su panel: la reemisión de Lucía, el lote 2026-001 (un solo aviso para sus 3 certificados) y los documentos enviados, del más reciente al más antiguo, con su antigüedad y el punto de "sin leer" | El aviso aparece dentro de la plataforma |
| `hu26_02_aviso_abre_el_documento.png` | Un documento nuevo enviado por el área: su aviso abre la revisión del documento (`#/por-revisar/{código}`) y queda leído | Abre el documento |
| `hu26_03_todos_leidos.png` | Después de abrir el aviso del lote (abre la revisión del lote) y de "Marcar todos como leídos": la campana queda sin cantidad | Abre el lote |

## Qué comprueba la prueba

1. **Un aviso por cada documento y lote pendiente.**
   - El Director tiene 6 avisos sin leer: 4 documentos, 1 lote de 3 certificados y la reemisión de la HU23. Coinciden con la tabla `aviso` de la base.
   - Los textos son "Reemisión pendiente: … (reemplaza a {código})", "Nuevo lote pendiente: Lote 2026-001 – Manejo integrado de plagas en café (3 certificados)" y "Nuevo documento pendiente: Certificado de Trabajo – …".
   - Cada aviso muestra su antigüedad.
2. **Un documento nuevo.**
   - El área envía un documento.
   - Al cambiar de pantalla, la campana del Director pasa a 7.
   - El aviso nuevo es el primero. Al pulsarlo se abre la revisión de ese documento, el aviso queda leído en la base y la campana vuelve a 6.
3. **El lote y "Marcar todos".**
   - El aviso del lote abre la revisión del lote.
   - "Marcar todos como leídos" deja la campana sin cantidad.
4. **Cada aviso es de su destinatario.**
   - El Área encargada no recibió avisos de revisión.
   - Mesa de Partes recibe 404 al intentar marcar un aviso del Director.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/AvisoPendienteAlDirectorTest.java` | 6:<ul><li>un documento enviado avisa a cada director activo, no a uno inactivo ni al área;</li><li>un lote genera un solo aviso, con el evento y la cantidad;</li><li>una corrección y una reemisión también avisan;</li><li>cada director marca sus avisos como leídos, y el de otro responde 404;</li><li>los más recientes primero, hasta 30;</li><li>solo `NOTIFICACIONES_VER` consulta avisos (401 y 403).</li></ul> |
| Frontend | `plataforma/frontend/src/avisos/Campana.test.tsx` | 12:<ul><li>la cantidad sin leer;</li><li>sin avisos;</li><li>el panel con antigüedad y el punto de "sin leer";</li><li>pulsar un aviso lo marca como leído;</li><li>marcar todos;</li><li>se cierra con Escape y al pulsar fuera;</li><li>consulta al cambiar de pantalla y al volver a la ventana, nunca a intervalos;</li><li>cinco casos de antigüedad: "hace un momento", "hace 5 min", "hace 3 h", "ayer" y la fecha.</li></ul> |

## Ajustes durante la verificación

- **Sin consultas a intervalos.** El refinamiento decía que la campana consultaría cada 30 segundos. Al construirla vi que cada consulta cuenta como actividad: la sesión ya no se cerraría por inactividad (HU03). Ahora se consulta al cambiar de pantalla, al abrir la campana y al volver a la ventana. Corregí el criterio en la historia y en Jira, y una prueba automática comprueba que no hay consultas a intervalos.
