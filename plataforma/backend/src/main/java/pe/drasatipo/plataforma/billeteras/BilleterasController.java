package pe.drasatipo.plataforma.billeteras;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.drasatipo.plataforma.blockchain.ContratoRegistroWeb3j;
import pe.drasatipo.plataforma.blockchain.RedBlockchainProperties;

/** Billetera del director y rol de firmante (HU06). Exige BILLETERA_GESTIONAR (RF04). */
@RestController
@RequestMapping("/api")
public class BilleterasController {

  private final GestionBilleteras gestion;
  private final RedBlockchainProperties red;

  public BilleterasController(GestionBilleteras gestion, RedBlockchainProperties red) {
    this.gestion = gestion;
    this.red = red;
  }

  @GetMapping("/billeteras")
  @PreAuthorize("hasAuthority('BILLETERA_GESTIONAR')")
  public BilleterasRespuesta listar() {
    return gestion.listar();
  }

  @PutMapping("/billeteras/{idCuenta}")
  @PreAuthorize("hasAuthority('BILLETERA_GESTIONAR')")
  public CuentaConBilletera registrar(
      @PathVariable Long idCuenta,
      @RequestBody RegistroBilleteraSolicitud solicitud,
      Authentication sesion) {
    return gestion.registrar(idCuenta, solicitud.direccion(), sesion.getName());
  }

  @PostMapping("/billeteras/{idCuenta}/firmante")
  @PreAuthorize("hasAuthority('BILLETERA_GESTIONAR')")
  public CuentaConBilletera confirmarCambioDeRol(
      @PathVariable Long idCuenta,
      @RequestBody TransaccionSolicitud solicitud,
      Authentication sesion) {
    return gestion.confirmarCambioDeRol(idCuenta, solicitud.transaccion(), sesion.getName());
  }

  /** Red y contrato para conectar la billetera del navegador. */
  @GetMapping("/blockchain/red")
  @PreAuthorize("hasAuthority('CUENTA_PROPIA')")
  public RedRespuesta red() {
    return new RedRespuesta(
        red.chainId(),
        "0x" + Long.toHexString(red.chainId()),
        red.nombre(),
        red.rpcPublica(),
        red.contratoConfigurado() ? red.contrato() : null,
        ContratoRegistroWeb3j.FIRMANTE_ROLE);
  }
}
