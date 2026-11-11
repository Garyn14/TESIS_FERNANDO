# Guion de pruebas del Sprint 7 para el PO

Este guion le permite al Product Owner probar las cinco historias del Sprint 7 y decidir si las aprueba. Son **propuestas del equipo**, fuera del backlog original de la tesis, para ajustar la plataforma a la organización:
- nombres de roles más claros;
- áreas y tipos de documento configurables por el Administrador;
- un rol de Mesa de Partes limitado a un área;
- la vigencia opcional de los documentos.

Cada historia tiene su objetivo, los pasos a seguir y lo que debe ver en cada paso. Al final se explica cómo dejar el ok en el ticket de Jira.

| Orden | Historia | Ticket | Puntos |
|---|---|---|---|
| 1 | Nombres de los roles: "Emisor de área" y "Mesa de Partes" | DRA-59 | 2 |
| 2 | El Administrador configura qué tipos de documento emite cada área | DRA-60 | 3 |
| 3 | El Administrador crea, renombra, deshabilita y reactiva áreas | DRA-61 | 3 |
| 4 | Nuevo rol "Mesa de Partes de área" | DRA-58 | 3 |
| 5 | Vigencia opcional por tipo de documento | DRA-62 | 5 |

**En la misma sesión** se pueden hacer los guiones de los Sprints 3 a 6, cuya validación está pendiente (tarea DRA-48): [Sprint 3](../sprint-3/guion-de-pruebas.md), [Sprint 4](../sprint-4/guion-de-pruebas.md), [Sprint 5](../sprint-5/guion-de-pruebas.md) y [Sprint 6](../sprint-6/guion-de-pruebas.md). Desde el Sprint 7, esos guiones ya usan los nombres de roles nuevos.

## Antes de empezar

El equipo de desarrollo levanta la plataforma como en el Sprint 6. Para ver el portal en el celular, agrega la dirección de la computadora:

```bash
PLATAFORMA_PORTAL_URL=http://<IP de la computadora>:5174 ./e2e/levantar.sh demo
```

Al terminar, muestra la dirección de la plataforma (<http://localhost:5173>), el usuario `admin` con su contraseña temporal y las dos claves de prueba para MetaMask. **Las claves son solo de prueba**: son billeteras nuevas, sin valor.

También se puede probar en **QA** (<https://d1px0ea1324c4y.cloudfront.net>), después de un **QA – Encender**, que publica la última versión de `main`.

Recomendaciones:
- Siga el guion en orden y en una sola sesión.
- Anote el número del paso si algo no se ve como se espera.
- Para pasar de una cuenta a otra, use "Cerrar sesión" y vuelva a ingresar, o una ventana privada.

Cuentas que se usan:

| Cuenta | Nombre completo | Rol y área | Contraseña temporal | Contraseña propia |
|---|---|---|---|---|
| admin | (ya creada) | Administrador | La que entrega el equipo | AdminPropia26 |
| pmorales | Pedro Morales Ccanto | Emisor de área – Área de Administración | Demo2026 | Propia2026 |
| rquispe | Rosa Quispe Huamán | Emisor de área – Área de Capacitación | Demo2026 | Propia2026 |
| cmendoza | Ing. Carlos Mendoza Rivera | Director | Demo2026 | Propia2026 |
| lflores | Luz Flores Ticona | Mesa de Partes | Demo2026 | Propia2026 |
| amontes | Ana Montes Rojas | Mesa de Partes de área – Área de Administración (se crea en el paso 4.1) | Demo2026 | Propia2026 |

### 0. Preparación

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 0.1 | Como `admin`, cree las cuentas `pmorales`, `rquispe`, `cmendoza` y `lflores` de la tabla. Registre la billetera del Director y otórguele el rol de firmante, como en el Sprint 4. | La fila del Director dice "✓ Firmante activo". |
| 0.2 | Como `pmorales`, registre un **Certificado de Trabajo** para Lucía Paredes Quinto, DNI `45829364`, expediente `EXP-2026-005391`, cargo `asistente administrativa`, del 02/01/2025 al 30/09/2026. | Queda Pendiente. |

---

## 1. DRA-59: Nombres de los roles

**Objetivo:** comprobar que los roles se llaman por lo que hacen: **Emisor de área** (antes "Área encargada") y **Mesa de Partes** (antes "Consulta interna").

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 1.1 | Como `admin`, abra **Usuarios** y pulse "Nueva cuenta". Despliegue **Rol**. | Aparecen cinco roles: Administrador, Director, **Emisor de área**, **Mesa de Partes** y **Mesa de Partes de área** (este último llega con DRA-58). Debajo del rol elegido se ve qué hace. Ya no aparecen "Área encargada" ni "Consulta interna". |
| 1.2 | Cierre la ventana y mire la lista de cuentas. | Pedro y Rosa aparecen como "Emisor de área", con su área; Luz, como "Mesa de Partes". |
| 1.3 | Ingrese como `pmorales`. | El encabezado dice "Emisor de área – Área de Administración". |

## 2. DRA-60: Qué tipos de documento emite cada área

**Objetivo:** comprobar que el Administrador decide qué documentos emite cada área, y que quitar un tipo no afecta a lo ya registrado.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 2.1 | Como `admin`, abra **Áreas y documentos**. | Una tarjeta por área, con sus tipos de documento, su origen y cuántas personas tiene. Al final, el **Historial de cambios**. |
| 2.2 | En el Área de Capacitación, elija **Constancia de Productor Activo** en "Asignar otro tipo de documento" y pulse **Asignar**. | "Área de Capacitación ya puede emitir Constancia de Productor Activo." Ese tipo sigue también en Desarrollo Agrario. |
| 2.3 | Como `rquispe`, abra **Nuevo documento**. | Aparece la Constancia de Productor Activo, junto a sus certificados de oficio. |
| 2.4 | Como `admin`, pulse **Quitar** junto al Certificado de Trabajo del Área de Administración. | La ventana pide confirmación: "1 persona del área dejará de poder registrar documentos de este tipo. Los documentos ya registrados siguen su trámite." Confirme. |
| 2.5 | Como `pmorales`, abra **Nuevo documento**. | Ya no aparece el Certificado de Trabajo. El de Lucía (paso 0.2) sigue Pendiente en **Mis documentos**. |
| 2.6 | Como `admin`, vuelva a **asignar** el Certificado de Trabajo al Área de Administración. Mire el historial. | Cada cambio aparece con la fecha, la hora y quién lo hizo. |

## 3. DRA-61: Crear, renombrar, deshabilitar y reactivar áreas

**Objetivo:** comprobar que el Administrador mantiene las áreas sin depender del equipo de desarrollo, y que un área no se elimina.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 3.1 | Como `admin`, en **Áreas y documentos**, pulse **Nueva área** y escriba `Área de Sanidad Agraria`. | "Se creó el área «Área de Sanidad Agraria»." Su tarjeta dice "Esta área no puede emitir documentos." |
| 3.2 | Pulse otra vez **Nueva área** y escriba `area de sanidad agraria`. | "Ya existe un área con ese nombre.": no distingue mayúsculas ni tildes. |
| 3.3 | Asígnele el **Certificado de Trabajo**. Cree en **Usuarios** la cuenta `lvargas`, Luis Vargas Inga, Emisor de área del Área de Sanidad Agraria. | La nueva área aparece en el formulario de cuentas. |
| 3.4 | En la tarjeta del área, pulse **Cambiar nombre** y escriba `Área de Sanidad Agraria y Forestal`. | El historial dice "Nombre: Área de Sanidad Agraria → Área de Sanidad Agraria y Forestal". Si `lvargas` ingresa, su encabezado muestra el nombre nuevo. |
| 3.5 | Pulse **Deshabilitar** en esa área y confirme. | "No se puede deshabilitar: el área tiene 1 persona activa. Muévalas a otra área desde Usuarios." |
| 3.6 | En **Usuarios**, desactive `lvargas`. Vuelva a deshabilitar el área. | El área pasa a la sección **Áreas deshabilitadas**, con "Conserva: Certificado de Trabajo". Ya no aparece en el formulario de cuentas. |
| 3.7 | En **Usuarios**, intente **reactivar** a `lvargas`. | "El área «Área de Sanidad Agraria y Forestal» está deshabilitada. Edite la cuenta y asígnele otra área antes de reactivarla." |
| 3.8 | En **Áreas y documentos**, pulse **Reactivar** en el área y confirme. Luego reactive a `lvargas`. | El área vuelve con su Certificado de Trabajo, y Luis puede ingresar. **En ningún lugar hay una opción para eliminar un área.** |

## 4. DRA-58: Mesa de Partes de área

**Objetivo:** comprobar que una persona puede buscar, consultar y entregar **solo** los documentos de su área.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 4.1 | Como `admin`, cree la cuenta `amontes`, Ana Montes Rojas, con el rol **Mesa de Partes de área**, sin elegir área, y pulse "Crear cuenta". | "Seleccione el área de la persona." Elija el **Área de Administración** y créela. |
| 4.2 | Como `lvargas`, registre un **Certificado de Trabajo** con el mismo DNI de Lucía (`45829364`), expediente `EXP-2026-007101`. | Queda Pendiente, en el Área de Sanidad Agraria y Forestal. |
| 4.3 | Ingrese como `amontes`. | El encabezado dice "Mesa de Partes de área – Área de Administración". El menú tiene solo **Inicio** y **Buscar documentos**. |
| 4.4 | En **Buscar documentos**, escriba `45829364`. | Aparece solo el documento de Lucía, del Área de Administración; **no** el de Sanidad Agraria. |
| 4.5 | Abra la ficha del documento de Lucía. | La ficha, con el historial y el detalle de auditoría. |
| 4.6 | Como `lflores` (Mesa de Partes), busque `45829364`. | Aparecen los dos: Mesa de Partes sigue viendo todas las áreas. |

## 5. DRA-62: Vigencia de los documentos

**Objetivo:** comprobar que un tipo de documento puede tener vigencia, que el PDF la imprime y que el portal la informa.

| Paso | Qué hacer | Qué se espera |
|---|---|---|
| 5.1 | Como `admin`, en **Áreas y documentos**, busque la sección **Vigencia de los documentos**. | Todos los tipos dicen "Ahora: Sin vencimiento". |
| 5.2 | Escriba `12` en "Meses de vigencia de Certificado de Trabajo" y pulse **Guardar**. | "Certificado de Trabajo: vigencia de 12 meses. Rige para los documentos que se firmen desde ahora." El cambio queda en el historial. |
| 5.3 | Como `pmorales`, registre un Certificado de Trabajo para Rosa Vílchez Pari, DNI `47112233`, expediente `EXP-2026-007301`. En la vista previa, mire el pie. | "Vigencia: 12 meses desde la fecha de emisión." |
| 5.4 | Como `cmendoza`, firme ese documento con MetaMask. | Se firma como siempre. |
| 5.5 | Escanee el QR del PDF con el celular (o abra el portal con su código). | **Documento válido**, con "Vigente hasta" y la fecha dentro de 12 meses. En el PDF, debajo de la fecha de emisión: "Válido hasta el …". |
| 5.6 | Verifique en el portal el documento de Lucía, firmado antes del cambio (si lo firmó en otro guion). | No muestra "Vigente hasta": un documento firmado antes del cambio no vence. |
| 5.7 | Como `lflores`, abra la ficha del documento de Rosa. | Muestra "Válido hasta" con la fecha. La búsqueda tiene el filtro **Vencidos** (todavía vacío). |
| 5.8 | Como `admin`, vuelva a dejar el Certificado de Trabajo en "Sin vencimiento" (campo vacío y **Guardar**). | "Certificado de Trabajo ya no vence." El documento de Rosa conserva su fecha. |

---

## Lo que no se prueba en este Sprint

Esto no forma parte del Sprint 7. Si nota que falta, no es una observación:
- **Ver un documento vencido.** Habría que esperar a que pase la fecha. Las pruebas automáticas adelantan el reloj y comprueban:
  - que el portal muestra "Documento vencido" sin el PDF;
  - que Mesa de Partes no lo entrega;
  - que aparece en el filtro "Vencidos".
  
  Ver la [evidencia de DRA-62](../../evidencias/sprint-7/DRA-62/).
- **Mover a varias personas de un área a otra de una vez:** se hace cuenta por cuenta.
- **Avisos para Mesa de Partes de área:** se decidió que este rol no los recibe.
- **Crear tipos de documento nuevos:** cada uno tiene su formulario y su plantilla del PDF, y los agrega el equipo de desarrollo.

## Cómo dejar el ok en el ticket

Por cada historia, en su ticket de Jira (DRA-58 a DRA-62):
- **Si todo se vio como se espera,** deje el comentario `Aprobado`.
- **Si algo no coincide,** deje el comentario `Observado` con el número de paso, lo que vio y lo que esperaba. El equipo lo registra como un **ticket nuevo**: las historias cerradas no se reabren.
- **Si tiene un cambio de criterio** sobre las [decisiones de la revisión](revision.md#decisiones-a-validar) o una respuesta a las preguntas, indíquelo en el comentario aunque apruebe.

Al terminar, el resultado se resume en **DRA-48**, junto con el de los Sprints 3 a 6.
