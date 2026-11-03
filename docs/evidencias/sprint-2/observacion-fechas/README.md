# Observación de la revisión del Sprint 2: fechas en día/mes/año

**Observación del PO** (DRA-19 y DRA-20, 03/11/2026): los selectores de fecha mostraban mes/día/año y deben mostrar día/mes/año.

**Causa:** los formularios usaban el selector de fecha del navegador, que toma el formato del idioma configurado en Windows o en el navegador. En inglés muestra mes/día/año.

**Corrección:** ahora los formularios de HU08 y HU09 usan un campo de fecha propio.

- Siempre muestra `dd/mm/aaaa`, sin importar el idioma del navegador.
- Al escribir los números pone las barras solo: "02012025" se ve como 02/01/2025.
- El botón del calendario sigue disponible para elegir la fecha con el mouse.
- Si la fecha no existe, como 31/02/2025, se indica "Ingrese una fecha válida, en formato dd/mm/aaaa".
- El texto del certificado no cambia: ya usaba día/mes/año.
- El servidor sigue recibiendo la fecha en formato ISO.

## Verificación

Las capturas se tomaron con un navegador en inglés, el mismo caso que veía el PO:

| Captura | Qué muestra |
|---|---|
| `fechas_hu08_solicitud_de_parte.png` | Certificado de Trabajo: fecha de inicio 02/05/2026 y fecha de fin 01/05/2026, en día/mes/año. Aparece el mensaje de que la fecha de fin no puede ser anterior |
| `fechas_hu09_datos_del_evento.png` | Datos del evento del Certificado de Capacitación: del 14/09/2026 al 16/09/2026, con el botón del calendario |

Resultados:

- **Prueba de punta a punta del Sprint 2** (`plataforma/e2e/sprint2.cjs`): 23 de 23 pasos, con las fechas escritas en día/mes/año. Ahora comprueba además que el campo muestre 02/01/2025 con la guía `dd/mm/aaaa`.
- **Regresión del Sprint 1:** 32 de 32 pasos.
- **Frontend:** 90 pruebas, 5 nuevas. Cubren la conversión, el formato que se muestra, las barras automáticas, el botón del calendario y una fecha que no existe.
