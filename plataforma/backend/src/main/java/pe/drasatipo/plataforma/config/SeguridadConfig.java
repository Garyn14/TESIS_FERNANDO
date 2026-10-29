package pe.drasatipo.plataforma.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/**
 * Configuración de seguridad. Solo los endpoints de salud son públicos. Cada servicio exige su
 * permiso con {@code @PreAuthorize} (RF04). El inicio de sesión se implementa en HU03 (DRA-14).
 */
@Configuration
@EnableMethodSecurity
public class SeguridadConfig {

  /** Hash adaptativo de contraseñas (RNF02). Por defecto BCrypt, con prefijo de algoritmo. */
  @Bean
  PasswordEncoder codificadorContrasenas() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
  }

  @Bean
  SecurityFilterChain filtroSeguridad(HttpSecurity http) throws Exception {
    return http.authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/api/salud", "/actuator/health")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            e -> e.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
        .build();
  }
}
