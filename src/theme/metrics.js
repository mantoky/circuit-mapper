/**
 * Metricas de toque dimensionadas para operacao COM LUVA DE RASPA.
 * Alvo minimo 56dp (acima do 48dp do Material) conforme ergonomia industrial.
 */
export const metrics = {
  touchMin: 56,
  touchLarge: 68,
  rowHeight: 64,
  radius: 10,
  radiusLg: 16,
  gap: 12,
  gapLg: 18,
  pad: 16,
  padLg: 22,
  indent: 22,          // recuo por nivel na TreeView
  borderW: 1.5,
  accentW: 4,          // barra lateral colorida de status
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 18,
  },
};

/** Duracoes de transicao - suaves, sem exageros que atrasem o campo */
export const motion = { fast: 140, base: 220, slow: 340 };
