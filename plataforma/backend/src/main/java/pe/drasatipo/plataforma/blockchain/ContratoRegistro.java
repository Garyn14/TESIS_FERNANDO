package pe.drasatipo.plataforma.blockchain;

import java.util.Optional;

/**
 * Lectura del contrato RegistroDocumentos. El backend nunca envía transacciones ni guarda claves
 * (RNF05): solo consulta el estado y verifica transacciones que firmó una billetera en el
 * navegador. Ante una falla de conexión lanza {@link BlockchainNoDisponibleException} (RNF10).
 */
public interface ContratoRegistro {

  boolean esFirmante(String billetera);

  boolean esAdministrador(String billetera);

  /**
   * Lee una transacción confirmada del contrato y devuelve el cambio del rol de firmante que
   * contiene. Vacío si la transacción no existe todavía, falló, es de otro contrato o no cambia ese
   * rol.
   */
  Optional<CambioDeRol> cambioDeRolEn(String transaccion);

  /**
   * Lee una transacción confirmada de registrarDocumentos (HU11) y los documentos que registró.
   * Vacío si la transacción no existe todavía, falló, es de otro contrato o no registró documentos.
   */
  Optional<RegistroDeFirma> registroDeFirmaEn(String transaccion);

  /** Indica si un código ya está registrado en el contrato (consulta de solo lectura). */
  boolean estaRegistrado(String codigo);
}
