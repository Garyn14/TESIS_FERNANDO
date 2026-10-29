package pe.drasatipo.plataforma.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import pe.drasatipo.plataforma.sesion.SeguridadDeSesion;

/**
 * Configuración de seguridad. Son públicos solo la salud y el inicio de sesión. Cada servicio exige
 * su permiso con {@code @PreAuthorize} (RF04).
 *
 * <p>Sesión del servidor (HU03): cookie HttpOnly, 30 minutos de inactividad (application.yml) y
 * protección CSRF con la cookie XSRF-TOKEN, que el frontend devuelve en la cabecera X-XSRF-TOKEN.
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
  SecurityContextRepository repositorioDeContextos() {
    return new HttpSessionSecurityContextRepository();
  }

  /** El frontend lee la cookie con JavaScript, por eso no es HttpOnly (la de sesión sí lo es). */
  @Bean
  CsrfTokenRepository repositorioCsrf() {
    return CookieCsrfTokenRepository.withHttpOnlyFalse();
  }

  @Bean
  SecurityFilterChain filtroSeguridad(
      HttpSecurity http,
      SecurityContextRepository contextos,
      CsrfTokenRepository tokensCsrf,
      SeguridadDeSesion seguridadDeSesion)
      throws Exception {
    http.authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/api/salud", "/actuator/health")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/api/sesion")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .securityContext(c -> c.securityContextRepository(contextos))
        .csrf(c -> c.spa().csrfTokenRepository(tokensCsrf))
        .httpBasic(b -> b.disable())
        .formLogin(f -> f.disable())
        .logout(l -> l.disable());
    seguridadDeSesion.aplicar(http);
    return http.build();
  }
}
