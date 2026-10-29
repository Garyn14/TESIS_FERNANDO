package pe.drasatipo.plataforma.inicializacion;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Datos de la primera cuenta de Administrador (RF09). La contraseña llega por variable de entorno y
 * nunca se guarda en el repositorio.
 */
@ConfigurationProperties(prefix = "plataforma.inicializacion")
public record InicializacionProperties(
    String adminUsuario, String adminNombre, String adminContrasena) {}
