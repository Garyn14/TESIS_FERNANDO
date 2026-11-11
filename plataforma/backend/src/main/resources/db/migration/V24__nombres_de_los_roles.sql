-- DRA-59: nombres de los roles que describen lo que hace cada uno. Solo cambia el nombre visible: los
-- códigos (AREA_ENCARGADA, CONSULTA_INTERNA), los permisos y la regla de área (RF05) no cambian. El
-- historial no se reescribe: usuario_historial.detalle conserva el texto con que se guardó cada evento
-- (por ejemplo, "Rol: Director → Consulta interna").
UPDATE rol SET nombre = 'Emisor de área' WHERE codigo = 'AREA_ENCARGADA';
UPDATE rol
SET nombre = 'Mesa de Partes',
    descripcion = 'Busca, consulta el historial, imprime y entrega documentos'
WHERE codigo = 'CONSULTA_INTERNA';
