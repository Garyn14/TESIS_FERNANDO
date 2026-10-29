// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Registro de documentos de la Agencia Agraria Satipo
/// @notice Registro en la blockchain de los certificados y constancias firmados por el director.
/// En esta versión (HU06, RF08) solo define quién puede hacer qué: el administrador del contrato
/// otorga y revoca el rol de firmante. Las funciones para registrar y anular documentos se agregan
/// en HU16–HU18 y HU29.
/// @dev Usa el control de acceso auditado de OpenZeppelin (RNF08). Reglas propias:
/// - El rol de administrador se asigna al desplegar a dos billeteras: la del Administrador y una de
///   respaldo fuera de línea (RNF05). La cuenta que despliega no recibe ningún rol.
/// - Una billetera no puede ser a la vez administradora y firmante (control interno).
/// - No se puede quedar sin administradores: siempre debe quedar al menos uno.
/// - Revocar el rol de firmante no borra ni modifica nada de lo ya registrado: la validez de un
///   documento dependerá de su registro, no del rol actual del firmante (RF08).
contract RegistroDocumentos is AccessControl {
  /// @notice Rol de las billeteras que pueden registrar documentos firmados (el director).
  bytes32 public constant FIRMANTE_ROLE = keccak256("FIRMANTE_ROLE");

  /// @dev Cantidad de billeteras con el rol de administrador.
  uint256 private _administradores;

  /// @notice La dirección es la dirección cero.
  error DireccionInvalida();
  /// @notice El Administrador y el respaldo deben ser billeteras distintas.
  error AdministradoresIguales();
  /// @notice Una billetera administradora del contrato no puede ser firmante.
  /// @param cuenta Billetera rechazada.
  error AdministradorNoPuedeFirmar(address cuenta);
  /// @notice Una billetera firmante no puede ser administradora del contrato.
  /// @param cuenta Billetera rechazada.
  error FirmanteNoPuedeAdministrar(address cuenta);
  /// @notice La operación dejaría el contrato sin administradores.
  error UltimoAdministrador();
  /// @notice La billetera ya tiene el rol de firmante.
  /// @param cuenta Billetera indicada.
  error YaEsFirmante(address cuenta);
  /// @notice La billetera no tiene el rol de firmante.
  /// @param cuenta Billetera indicada.
  error NoEsFirmante(address cuenta);

  /// @notice Despliega el contrato con dos administradores (RNF05).
  /// @param administrador Billetera del Administrador de la plataforma.
  /// @param respaldo Billetera de respaldo, guardada fuera de línea.
  constructor(address administrador, address respaldo) {
    if (administrador == respaldo) revert AdministradoresIguales();
    _grantRole(DEFAULT_ADMIN_ROLE, administrador);
    _grantRole(DEFAULT_ADMIN_ROLE, respaldo);
  }

  /// @notice Otorga el rol de firmante a la billetera del director (RF08).
  /// @dev Solo un administrador. Emite `RoleGranted(FIRMANTE_ROLE, cuenta, msg.sender)`.
  /// @param cuenta Billetera del director.
  function otorgarFirmante(address cuenta) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (!_grantRole(FIRMANTE_ROLE, cuenta)) revert YaEsFirmante(cuenta);
  }

  /// @notice Revoca el rol de firmante (RF08). Lo registrado antes no se modifica.
  /// @dev Solo un administrador. Emite `RoleRevoked(FIRMANTE_ROLE, cuenta, msg.sender)`.
  /// @param cuenta Billetera del director.
  function revocarFirmante(address cuenta) external onlyRole(DEFAULT_ADMIN_ROLE) {
    if (!_revokeRole(FIRMANTE_ROLE, cuenta)) revert NoEsFirmante(cuenta);
  }

  /// @notice Indica si una billetera tiene hoy el rol de firmante.
  /// @param cuenta Billetera a consultar.
  /// @return true si puede registrar documentos.
  function esFirmante(address cuenta) external view returns (bool) {
    return hasRole(FIRMANTE_ROLE, cuenta);
  }

  /// @notice Indica si una billetera es administradora del contrato.
  /// @param cuenta Billetera a consultar.
  /// @return true si puede otorgar y revocar el rol de firmante.
  function esAdministrador(address cuenta) external view returns (bool) {
    return hasRole(DEFAULT_ADMIN_ROLE, cuenta);
  }

  /// @dev Aplica las reglas propias a toda asignación de rol, también a `grantRole`.
  function _grantRole(bytes32 rol, address cuenta) internal override returns (bool) {
    if (cuenta == address(0)) revert DireccionInvalida();
    if (rol == FIRMANTE_ROLE && hasRole(DEFAULT_ADMIN_ROLE, cuenta)) {
      revert AdministradorNoPuedeFirmar(cuenta);
    }
    if (rol == DEFAULT_ADMIN_ROLE && hasRole(FIRMANTE_ROLE, cuenta)) {
      revert FirmanteNoPuedeAdministrar(cuenta);
    }
    bool otorgado = super._grantRole(rol, cuenta);
    if (otorgado && rol == DEFAULT_ADMIN_ROLE) _administradores++;
    return otorgado;
  }

  /// @dev Impide quitar el último administrador, también con `revokeRole` o `renounceRole`.
  function _revokeRole(bytes32 rol, address cuenta) internal override returns (bool) {
    bool revocado = super._revokeRole(rol, cuenta);
    if (revocado && rol == DEFAULT_ADMIN_ROLE) {
      if (_administradores == 1) revert UltimoAdministrador();
      _administradores--;
    }
    return revocado;
  }
}
