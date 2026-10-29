package pe.drasatipo.plataforma.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/**
 * Configuración inicial de seguridad: solo se exponen los endpoints de salud. La autenticación por
 * rol se implementa en HU03 (DRA-14).
 */
@Configuration
public class SeguridadConfig {

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
