// Función de CloudFront (DRA-54) del portal público: el QR de cada documento apunta a
// /verificar/{token} (HU16, HU19), una ruta de la aplicación que no existe como archivo en S3.
// Toda ruta cuyo último tramo no tiene extensión se sirve con index.html; los archivos (.js, .css,
// .svg…) pasan tal cual. Solo se asocia al comportamiento por defecto: /api/verificacion/* va al
// servidor y nunca pasa por aquí.
// Entorno: cloudfront-js-2.0 (sin export; se prueba con tests/rutas-del-portal.test.cjs).
function handler(event) {
  var pedido = event.request;
  var ultimo = pedido.uri.substring(pedido.uri.lastIndexOf('/') + 1);
  if (ultimo.indexOf('.') === -1) {
    pedido.uri = '/index.html';
  }
  return pedido;
}
