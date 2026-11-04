// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title Registro de documentos de la Agencia Agraria Satipo
/// @notice Registro en la blockchain de los certificados y constancias firmados por el director.
/// El administrador del contrato otorga y revoca el rol de firmante (HU06, RF08), y el firmante
/// registra los documentos que firma (HU11, RF31): su código, el hash SHA-256 de su PDF final y el
/// HMAC de su DNI. También anula un documento registrado (HU29): el registro original no se borra,
/// y la verificación pública lo muestra como anulado.
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

  /// @notice Máximo de documentos por transacción (HU11): una selección mayor se divide.
  uint256 public constant MAXIMO_POR_TRANSACCION = 50;

  /// @notice Registro de un documento firmado. Nunca se modifica (RNF10).
  /// @param hashPdf SHA-256 de los bytes exactos del PDF final (RF30).
  /// @param dniHmac HMAC-SHA256 del DNI del beneficiario; el DNI nunca va a la blockchain (RF17).
  /// @param firmante Billetera que lo firmó.
  /// @param registradoEn Fecha del bloque: es la fecha oficial de emisión (RF32).
  struct Registro {
    bytes32 hashPdf;
    bytes32 dniHmac;
    address firmante;
    uint64 registradoEn;
  }

  /// @dev Cantidad de billeteras con el rol de administrador.
  uint256 private _administradores;

  /// @dev Registros por keccak256 del código de verificación.
  mapping(bytes32 => Registro) private _registros;

  /// @dev Fecha del bloque de la anulación por keccak256 del código; 0 si no está anulado (HU29).
  mapping(bytes32 => uint64) private _anulaciones;
  /// @dev HU30: clave del original => código del documento que lo reemplaza.
  mapping(bytes32 => string) private _reemplazos;

  /// @notice Se registró un documento firmado (HU11). HU18 sincroniza los estados con este evento.
  /// @param clave keccak256 del código, para filtrar por documento.
  /// @param codigo Código de verificación (DRA-AAAA-XXXXXX).
  /// @param hashPdf SHA-256 del PDF final.
  /// @param dniHmac HMAC-SHA256 del DNI.
  /// @param firmante Billetera que firmó.
  event DocumentoRegistrado(
    bytes32 indexed clave,
    string codigo,
    bytes32 hashPdf,
    bytes32 dniHmac,
    address indexed firmante
  );

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
  /// @notice Se deben registrar de 1 a MAXIMO_POR_TRANSACCION documentos.
  /// @param cantidad Cantidad recibida.
  error CantidadInvalida(uint256 cantidad);
  /// @notice Las listas de códigos, hashes y HMAC deben tener el mismo largo.
  error LongitudesDistintas();
  /// @notice El código está vacío o es demasiado largo.
  /// @param codigo Código rechazado.
  error CodigoInvalido(string codigo);
  /// @notice El hash del PDF o el HMAC del DNI está vacío.
  /// @param codigo Código del documento.
  error DatosIncompletos(string codigo);
  /// @notice El código no está registrado: no se puede anular (HU29).
  /// @param codigo Código indicado.
  error NoRegistrado(string codigo);
  /// @notice El documento ya está anulado (HU29).
  /// @param codigo Código indicado.
  error YaAnulado(string codigo);
  /// @notice El código ya está registrado: un documento no se registra dos veces.
  /// @param codigo Código repetido.
  error CodigoYaRegistrado(string codigo);

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

  /// @notice Registra documentos firmados (HU11, RF31). Si uno no es válido, no se registra
  /// ninguno de esta transacción.
  /// @dev Solo el firmante. Emite `DocumentoRegistrado` por cada documento.
  /// @param codigos Códigos de verificación.
  /// @param hashes SHA-256 de cada PDF final.
  /// @param dniHmacs HMAC-SHA256 del DNI de cada beneficiario.
  function registrarDocumentos(
    string[] calldata codigos,
    bytes32[] calldata hashes,
    bytes32[] calldata dniHmacs
  ) external onlyRole(FIRMANTE_ROLE) {
    uint256 cantidad = codigos.length;
    if (cantidad == 0 || cantidad > MAXIMO_POR_TRANSACCION) revert CantidadInvalida(cantidad);
    if (hashes.length != cantidad || dniHmacs.length != cantidad) revert LongitudesDistintas();
    for (uint256 i = 0; i < cantidad; i++) {
      _registrar(codigos[i], hashes[i], dniHmacs[i]);
    }
  }

  /// @notice Se registró la reemisión de un documento (HU30, RF51).
  /// @param claveOriginal keccak256 del código del original.
  /// @param original Código del documento reemplazado, que queda anulado.
  /// @param reemplazo Código del documento nuevo.
  event DocumentoReemplazado(bytes32 indexed claveOriginal, string original, string reemplazo);

  /// @notice Registra reemisiones (HU30, RF51): en la misma transacción registra cada documento
  /// nuevo y anula el original que reemplaza. Si una no es válida, no se aplica ninguna.
  /// @dev Solo el firmante. Emite `DocumentoRegistrado`, `DocumentoAnulado` y
  /// `DocumentoReemplazado` por cada reemisión.
  /// @param codigos Códigos de verificación de los documentos nuevos.
  /// @param hashes SHA-256 de cada PDF final.
  /// @param dniHmacs HMAC-SHA256 del DNI de cada beneficiario.
  /// @param originales Código del documento que reemplaza cada uno.
  function registrarReemisiones(
    string[] calldata codigos,
    bytes32[] calldata hashes,
    bytes32[] calldata dniHmacs,
    string[] calldata originales
  ) external onlyRole(FIRMANTE_ROLE) {
    uint256 cantidad = codigos.length;
    if (cantidad == 0 || cantidad > MAXIMO_POR_TRANSACCION) revert CantidadInvalida(cantidad);
    if (hashes.length != cantidad || dniHmacs.length != cantidad || originales.length != cantidad)
      revert LongitudesDistintas();
    for (uint256 i = 0; i < cantidad; i++) {
      _reemitir(codigos[i], hashes[i], dniHmacs[i], originales[i]);
    }
  }

  /// @notice Código del documento que reemplaza a otro (HU30, HU21). Solo lectura.
  /// @param codigo Código de verificación del original.
  /// @return reemplazo Código de su reemisión firmada; vacío si no fue reemplazado.
  function reemplazadoPor(string calldata codigo) external view returns (string memory reemplazo) {
    reemplazo = _reemplazos[keccak256(bytes(codigo))];
  }

  function _registrar(
    string calldata codigo,
    bytes32 hash,
    bytes32 dniHmac
  ) private returns (bytes32 clave) {
    uint256 largo = bytes(codigo).length;
    if (largo == 0 || largo > 32) revert CodigoInvalido(codigo);
    if (hash == bytes32(0) || dniHmac == bytes32(0)) revert DatosIncompletos(codigo);
    clave = keccak256(bytes(codigo));
    if (_registros[clave].registradoEn != 0) revert CodigoYaRegistrado(codigo);
    _registros[clave] = Registro(hash, dniHmac, msg.sender, uint64(block.timestamp));
    emit DocumentoRegistrado(clave, codigo, hash, dniHmac, msg.sender);
  }

  function _reemitir(
    string calldata codigo,
    bytes32 hash,
    bytes32 dniHmac,
    string calldata original
  ) private {
    bytes32 clave = _registrar(codigo, hash, dniHmac);
    bytes32 claveOriginal = _anular(original);
    if (claveOriginal == clave) revert CodigoInvalido(original);
    _reemplazos[claveOriginal] = codigo;
    emit DocumentoReemplazado(claveOriginal, original, codigo);
  }

  function _anular(string calldata codigo) private returns (bytes32 clave) {
    clave = keccak256(bytes(codigo));
    if (_registros[clave].registradoEn == 0) revert NoRegistrado(codigo);
    if (_anulaciones[clave] != 0) revert YaAnulado(codigo);
    _anulaciones[clave] = uint64(block.timestamp);
    emit DocumentoAnulado(clave, codigo, msg.sender);
  }

  /// @notice Se anuló un documento firmado (HU29). HU18 sincroniza los estados con este evento.
  /// @param clave keccak256 del código.
  /// @param codigo Código de verificación.
  /// @param firmante Billetera que anuló.
  event DocumentoAnulado(bytes32 indexed clave, string codigo, address indexed firmante);

  /// @notice Anula un documento registrado (HU29, RF49). El registro original no cambia; la
  /// verificación pública lo mostrará como anulado. El motivo queda fuera de la cadena.
  /// @dev Solo el firmante. Emite `DocumentoAnulado`.
  /// @param codigo Código de verificación.
  function anularDocumento(string calldata codigo) external onlyRole(FIRMANTE_ROLE) {
    _anular(codigo);
  }

  /// @notice Indica si un documento está anulado y desde cuándo (HU29, HU21). Solo lectura.
  /// @param codigo Código de verificación.
  /// @return anulado Si está anulado.
  /// @return anuladoEn Fecha del bloque de la anulación; 0 si no está anulado.
  function anulacion(
    string calldata codigo
  ) external view returns (bool anulado, uint64 anuladoEn) {
    anuladoEn = _anulaciones[keccak256(bytes(codigo))];
    anulado = anuladoEn != 0;
  }

  /// @notice Consulta el registro de un documento (HU11, HU21). Es de solo lectura.
  /// @param codigo Código de verificación.
  /// @return registrado Si el código está registrado.
  /// @return registro Hash, HMAC, firmante y fecha del bloque; vacío si no está registrado.
  function consultar(
    string calldata codigo
  ) external view returns (bool registrado, Registro memory registro) {
    registro = _registros[keccak256(bytes(codigo))];
    registrado = registro.registradoEn != 0;
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
