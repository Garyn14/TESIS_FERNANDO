package pe.drasatipo.plataforma.inicializacion;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.drasatipo.plataforma.usuarios.HistorialRepository;
import pe.drasatipo.plataforma.usuarios.RolRepository;
import pe.drasatipo.plataforma.usuarios.UsuarioRepository;

/** RNF02: la contraseña inicial debe tener entre 8 y 20 caracteres. */
class ValidacionContrasenaInicialTest {

  @ParameterizedTest
  @ValueSource(strings = {"corta", "esta-contrasena-es-demasiado-larga"})
  void rechazaContrasenasFueraDeRango(String contrasena) {
    UsuarioRepository usuarios = mock(UsuarioRepository.class);
    var inicializador =
        new InicializadorAdministrador(
            new InicializacionProperties("admin", "Administrador", contrasena),
            mock(RolRepository.class),
            usuarios,
            mock(PasswordEncoder.class),
            mock(HistorialRepository.class));

    assertThatThrownBy(() -> inicializador.run(new DefaultApplicationArguments()))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("entre 8 y 20 caracteres");
    verify(usuarios, never()).save(org.mockito.ArgumentMatchers.any());
  }
}
