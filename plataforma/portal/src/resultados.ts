/** Título, ícono y colores de cada resultado; también los usa la guía "¿Cómo verificar?" (DRA-70). */
export const ENCABEZADOS = {
  VALIDO: { titulo: 'Documento válido', icono: '✓', clase: 'border-institutional bg-green-pale' },
  ANULADO: {
    titulo: 'Documento anulado',
    icono: '⊘',
    clase: 'border-neutral-icon bg-neutral-pale',
  },
  // DRA-62: auténtico, pero su vigencia terminó.
  VENCIDO: { titulo: 'Documento vencido', icono: '⌛', clase: 'border-orange bg-orange-pale' },
  NO_VALIDO: { titulo: 'Documento no válido', icono: '✕', clase: 'border-red-700 bg-red-50' },
}
