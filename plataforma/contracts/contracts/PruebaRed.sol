// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title Contrato de prueba de la red Besu
/// @notice Solo verifica el despliegue y la lectura de eventos en la red local (DRA-45).
/// No forma parte de la plataforma: el contrato de registro de documentos se desarrolla en el Sprint 2.
contract PruebaRed {
  /// @notice Se emite cada vez que se registra una huella de prueba.
  /// @param huella Huella (hash) registrada.
  /// @param emisor Cuenta que envió la transacción.
  event Registrado(bytes32 indexed huella, address indexed emisor);

  /// @notice Registra una huella emitiendo el evento `Registrado`.
  /// @param huella Huella (hash) a registrar.
  function registrar(bytes32 huella) external {
    emit Registrado(huella, msg.sender);
  }
}
