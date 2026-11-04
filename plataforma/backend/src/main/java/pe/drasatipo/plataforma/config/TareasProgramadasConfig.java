package pe.drasatipo.plataforma.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Tareas programadas: la sincronización con la blockchain (HU18). Se apagan en las pruebas. */
@Configuration
@EnableScheduling
@ConditionalOnProperty(
    name = "plataforma.sincronizacion.activa",
    havingValue = "true",
    matchIfMissing = true)
public class TareasProgramadasConfig {}
