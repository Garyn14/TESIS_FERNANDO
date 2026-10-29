import { describe, expect, it } from 'vitest'
import { generarContrasenaTemporal } from './generador'

describe('generarContrasenaTemporal (HU04)', () => {
  it('genera 12 caracteres sin los que se confunden, con al menos dos dígitos', () => {
    for (let i = 0; i < 200; i++) {
      const clave = generarContrasenaTemporal()
      expect(clave).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{12}$/)
      expect(clave.replace(/\D/g, '').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('no repite contraseñas', () => {
    const claves = new Set(Array.from({ length: 100 }, generarContrasenaTemporal))
    expect(claves.size).toBe(100)
  })
})
