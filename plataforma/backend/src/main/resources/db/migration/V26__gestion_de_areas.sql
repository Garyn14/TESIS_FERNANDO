-- DRA-61: el Administrador crea, renombra, deshabilita y reactiva áreas desde "Áreas y documentos".
-- El nombre ya era único (V2); ahora también lo es sin distinguir mayúsculas ni tildes, para que
-- "Área de Capacitación" y "area de capacitacion" no puedan existir a la vez. La misma expresión
-- está en GestionCatalogo.NOMBRE_NORMALIZADO.
CREATE UNIQUE INDEX area_nombre_normalizado_idx
    ON area (translate(lower(nombre), 'áéíóúüàèìòù', 'aeiouuaeiou'));
