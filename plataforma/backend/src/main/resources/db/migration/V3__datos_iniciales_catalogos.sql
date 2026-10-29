-- DRA-47 (RF09): datos iniciales de roles, permisos, áreas y tipos de documento.
-- Son configurables (RF04, RF06): se modifican con nuevas migraciones o desde la gestión del
-- Administrador, nunca editando este archivo.

INSERT INTO rol (codigo, nombre, descripcion) VALUES
    ('ADMINISTRADOR',    'Administrador',    'Gestiona cuentas, áreas y la billetera del director'),
    ('AREA_ENCARGADA',   'Área encargada',   'Registra, corrige y reemite los documentos de su área'),
    ('DIRECTOR',         'Director',         'Revisa, observa, rechaza, firma y anula documentos'),
    ('CONSULTA_INTERNA', 'Consulta interna', 'Mesa de Partes: busca, consulta el historial e imprime documentos');

INSERT INTO permiso (codigo, descripcion) VALUES
    ('CUENTA_PROPIA',         'Cambiar la contraseña propia (HU04)'),
    ('USUARIOS_GESTIONAR',    'Crear, editar y desactivar cuentas; asignar área y restablecer contraseñas (HU01, HU02, HU04, HU05)'),
    ('BILLETERA_GESTIONAR',   'Registrar la billetera del director y su rol de firmante (HU06)'),
    ('DOCUMENTO_REGISTRAR',   'Registrar documentos a solicitud de parte o por lista (HU07–HU09)'),
    ('DOCUMENTO_VER_AREA',    'Ver los documentos del área propia (Mis documentos)'),
    ('DOCUMENTO_CORREGIR',    'Corregir y reenviar documentos observados (HU15)'),
    ('DOCUMENTO_REEMITIR',    'Reemitir un documento firmado con datos corregidos (HU30)'),
    ('DOCUMENTO_REVISAR',     'Ver y revisar documentos pendientes (HU10, HU12)'),
    ('DOCUMENTO_FIRMAR',      'Firmar documentos y lotes (HU11, HU12)'),
    ('DOCUMENTO_OBSERVAR',    'Observar documentos (HU13)'),
    ('DOCUMENTO_RECHAZAR',    'Rechazar documentos (HU14)'),
    ('DOCUMENTO_ANULAR',      'Anular documentos firmados (HU29)'),
    ('DOCUMENTO_VER_FIRMADOS','Ver los documentos firmados'),
    ('DOCUMENTO_BUSCAR',      'Buscar documentos y ver su estado (HU22, HU23)'),
    ('AUDITORIA_VER',         'Consultar el historial y el detalle técnico de auditoría (HU24)'),
    ('DOCUMENTO_IMPRIMIR',    'Descargar e imprimir documentos y duplicados (HU25)'),
    ('NOTIFICACIONES_VER',    'Recibir y leer avisos (HU26–HU28)');

-- Asignación inicial de permisos a cada rol (según la sección 3 del prototipo validado).
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM (VALUES
    ('ADMINISTRADOR',    'CUENTA_PROPIA'),
    ('ADMINISTRADOR',    'USUARIOS_GESTIONAR'),
    ('ADMINISTRADOR',    'BILLETERA_GESTIONAR'),
    ('AREA_ENCARGADA',   'CUENTA_PROPIA'),
    ('AREA_ENCARGADA',   'DOCUMENTO_REGISTRAR'),
    ('AREA_ENCARGADA',   'DOCUMENTO_VER_AREA'),
    ('AREA_ENCARGADA',   'DOCUMENTO_CORREGIR'),
    ('AREA_ENCARGADA',   'DOCUMENTO_REEMITIR'),
    ('AREA_ENCARGADA',   'NOTIFICACIONES_VER'),
    ('DIRECTOR',         'CUENTA_PROPIA'),
    ('DIRECTOR',         'DOCUMENTO_REVISAR'),
    ('DIRECTOR',         'DOCUMENTO_FIRMAR'),
    ('DIRECTOR',         'DOCUMENTO_OBSERVAR'),
    ('DIRECTOR',         'DOCUMENTO_RECHAZAR'),
    ('DIRECTOR',         'DOCUMENTO_ANULAR'),
    ('DIRECTOR',         'DOCUMENTO_VER_FIRMADOS'),
    ('DIRECTOR',         'NOTIFICACIONES_VER'),
    ('CONSULTA_INTERNA', 'CUENTA_PROPIA'),
    ('CONSULTA_INTERNA', 'DOCUMENTO_BUSCAR'),
    ('CONSULTA_INTERNA', 'AUDITORIA_VER'),
    ('CONSULTA_INTERNA', 'DOCUMENTO_IMPRIMIR'),
    ('CONSULTA_INTERNA', 'NOTIFICACIONES_VER')
) AS asignacion (rol, permiso)
JOIN rol r ON r.codigo = asignacion.rol
JOIN permiso p ON p.codigo = asignacion.permiso;

-- Los cinco tipos de documento de la sección 1.1.2 de la tesis.
INSERT INTO tipo_documento (codigo, nombre, titulo, origen) VALUES
    ('CONSTANCIA_PRODUCTOR_ACTIVO', 'Constancia de Productor Activo', 'CONSTANCIA',  'SOLICITUD_PARTE'),
    ('CERTIFICADO_PRACTICAS',       'Certificado de Prácticas',       'CERTIFICADO', 'SOLICITUD_PARTE'),
    ('CERTIFICADO_TRABAJO',         'Certificado de Trabajo',         'CERTIFICADO', 'SOLICITUD_PARTE'),
    ('CERTIFICADO_RECONOCIMIENTO',  'Certificado de Reconocimiento',  'CERTIFICADO', 'OFICIO'),
    ('CERTIFICADO_CAPACITACION',    'Certificado de Capacitación',    'CERTIFICADO', 'OFICIO');

-- Áreas y tipos que emite cada una, tomados del prototipo validado.
-- PENDIENTE: confirmar con el Product Owner los nombres reales de las áreas de la agencia.
INSERT INTO area (codigo, nombre) VALUES
    ('CAPACITACION',      'Área de Capacitación'),
    ('DESARROLLO_AGRARIO','Área de Desarrollo Agrario'),
    ('ADMINISTRACION',    'Área de Administración');

INSERT INTO area_tipo_documento (area_id, tipo_documento_id)
SELECT a.id, t.id
FROM (VALUES
    ('CAPACITACION',       'CERTIFICADO_CAPACITACION'),
    ('CAPACITACION',       'CERTIFICADO_RECONOCIMIENTO'),
    ('DESARROLLO_AGRARIO', 'CONSTANCIA_PRODUCTOR_ACTIVO'),
    ('ADMINISTRACION',     'CERTIFICADO_PRACTICAS'),
    ('ADMINISTRACION',     'CERTIFICADO_TRABAJO')
) AS asignacion (area, tipo)
JOIN area a ON a.codigo = asignacion.area
JOIN tipo_documento t ON t.codigo = asignacion.tipo;
