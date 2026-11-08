// Prueba de la función de CloudFront del portal (DRA-54).  node --test tests/
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')

const codigo = readFileSync(path.join(__dirname, '..', 'rutas-del-portal.js'), 'utf8')
const handler = new Function(`${codigo}; return handler`)()
const uri = (u) => handler({ request: { uri: u, method: 'GET', headers: {} } }).uri

test('el enlace del QR se sirve con la aplicación', () => {
  assert.equal(uri('/verificar/3f9c2a7b-0d14-4c55-9a77-1b2c3d4e5f60'), '/index.html')
  assert.equal(uri('/verificar/abc/'), '/index.html')
})

test('la portada y cualquier ruta de la aplicación', () => {
  assert.equal(uri('/'), '/index.html')
  assert.equal(uri('/codigo'), '/index.html')
})

test('los archivos del build pasan tal cual', () => {
  assert.equal(uri('/assets/index-B2kQ9.js'), '/assets/index-B2kQ9.js')
  assert.equal(uri('/assets/index-Cx1.css'), '/assets/index-Cx1.css')
  assert.equal(uri('/escudo.svg'), '/escudo.svg')
  assert.equal(uri('/index.html'), '/index.html')
})

test('no usa sintaxis que el entorno de CloudFront no admite', () => {
  // cloudfront-js-2.0 no tiene módulos: la función debe llamarse handler y no exportar nada.
  assert.match(codigo, /^function handler\(event\)/m)
  const sinComentarios = codigo.replace(/\/\/.*$/gm, '')
  assert.doesNotMatch(sinComentarios, /\b(export|require|import)\b/)
})
