# Evidencia HU17: Almacenar el PDF en IPFS (DRA-25)

**Prueba de punta a punta real** del 03/11/2026, sin simulaciones. Participan:

- navegador (Playwright), frontend y backend;
- PostgreSQL 17;
- un **nodo IPFS privado nuevo** (Kubo v0.43.1, con la clave de enjambre y la configuración de [`infra/ipfs`](../../../../plataforma/infra/ipfs/README.md)).

La prueba del Sprint 3 ([`plataforma/e2e/sprint3.cjs`](../../../../plataforma/e2e/sprint3.cjs)) ahora recorre HU10, HU16 y HU17. Resultado en [`resultado.txt`](resultado.txt): **15 de 15 pasos correctos**, 5 de ellos de HU17.

**Regresión** en entornos limpios: Sprint 1, 32 de 32 pasos; Sprint 2, 23 de 23 pasos.

La pantalla de firma llega con HU11, así que la prueba llama a la preparación de la firma por la API (`POST /api/firma/preparacion`), con la sesión del Director en el navegador.

| Archivo | Qué muestra | Criterio |
|---|---|---|
| `hu17_pdf_final_desde_ipfs.pdf` y `hu17_01_pdf_final_desde_ipfs.png` | El PDF final de Lucía Paredes Quinto **tal como se recuperó de IPFS por su CID**: con la fecha de emisión, el QR y la leyenda, sin la marca "MUESTRA" | Se guarda el PDF final y su CID |
| `hu17_02_mis_documentos_procesando_firma.png` | Mis documentos del Área de Administración: el documento preparado en **Procesando firma** (azul) y el otro todavía Pendiente | Estado visible para el área |

## Qué comprueba la prueba

1. **Preparación de un documento revisado:**
   - la respuesta trae su hash (64 caracteres hexadecimales) y su CID (`bafy…`);
   - en PostgreSQL queda en `PROCESANDO_FIRMA`, con el mismo CID, el mismo hash y la fecha de emisión de hoy;
   - el historial es REGISTRADO, REVISADO, PREPARADO.
2. **El archivo en IPFS es el del hash (RF30):**
   - se recupera con `cat` por su CID;
   - su SHA-256, recalculado en la prueba, es el guardado;
   - su texto tiene la fecha de emisión, el código y el nombre, sin "MUESTRA" ni "VISTA PREVIA";
   - el QR leído desde la imagen lleva a la dirección de verificación con el token del documento.
3. **Fijado y red privada:** `pin/ls` lo muestra fijado (`recursive`), y el nodo no tiene nodos de arranque.
4. **Estados:** el documento sale de Por revisar y el área lo ve en Procesando firma.
5. **Falla de IPFS:** la prueba **detiene el contenedor de IPFS** y prepara un certificado del lote junto con un documento sin revisar:
   - el certificado vuelve a Pendiente, sin CID, con el motivo "No se pudo guardar el PDF. El documento volvió a Pendiente.";
   - su historial termina en ERROR_ALMACENAMIENTO, y el servidor registró el error (`Connection refused`);
   - el documento sin revisar se informa aparte ("El documento aún no fue revisado."), sin detener la operación;
   - el certificado vuelve a la bandeja, ya revisado.
6. **Recuperación:** con IPFS encendido de nuevo, los tres certificados del lote se guardan, cada uno con su CID y su hash comprobados. Volver a prepararlos no los guarda dos veces ("El documento ya está en proceso de firma.").
7. **Acceso:** el Área encargada recibe 403.

## Pruebas automáticas

| Capa | Archivo | Pruebas |
|---|---|---|
| Backend | `plataforma/backend/src/test/java/pe/drasatipo/plataforma/documentos/PreparacionDeFirmaTest.java` | 7, contra un **nodo Kubo real** levantado con Testcontainers:<ul><li>PDF guardado, fijado, con CID y hash, recuperado e idéntico;</li><li>sale de Por revisar y el área lo ve en Procesando firma;</li><li>sin revisar, inexistente o ya en proceso: se informan sin detener al resto;</li><li>si IPFS falla con uno, ese vuelve a Pendiente con el error en el historial y los demás siguen; después se puede preparar de nuevo;</li><li>los certificados de un lote, cada uno con su CID;</li><li>4 preparaciones a la vez del mismo documento guardan un solo PDF;</li><li>solo el Director, con 1 a 300 documentos;</li><li>sin nodo, el cliente de IPFS avisa con su propia excepción.</li></ul> |
| Frontend | `plataforma/frontend/src/documentos/Estado.test.tsx` | El estado Procesando firma en azul y Pendiente en ámbar, como en el prototipo |

Totales: 145 pruebas de backend y 97 de frontend.

## Ajustes durante la verificación

Las dos primeras ejecuciones fallaron por errores del script de prueba, no de la plataforma:

- **Lista de nodos de arranque:** Kubo devuelve `"Peers": null` cuando no hay ninguno, no una lista vacía.
- **Consulta en PostgreSQL:** concatenar un booleano lo convierte en `true` y no en `t`.

Se corrigieron y la prueba se repitió completa en un entorno limpio.
