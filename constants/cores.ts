// constants/cores.ts — Paleta Cruzeiro: Azul + Dourado + Dark Cinema

export const CORES = {
  // ─── Fundos (cinema escuro) ─────────────────────
  fundoPrincipal:   '#080910',
  fundoCard:        '#0F111B',
  fundoCardElevado: '#151725',
  fundoModal:       '#0C0E18',
  borda:            '#1C2040',
  bordaAtiva:       '#2A3560',

  // ─── Azul Cruzeiro ──────────────────────────────
  azulPrimario:    '#1B3F9E',
  azulIntermedio:  '#2A57D5',
  azulClaro:       '#4A78FF',
  azulFundo:       'rgba(27,63,158,0.18)',
  azulFundoSutil:  'rgba(27,63,158,0.08)',
  azulBrilho:      'rgba(74,120,255,0.30)',

  // ─── Dourado Cruzeiro ───────────────────────────
  douradoPrimario:  '#C49A00',
  douradoIntermedio:'#D9AB0A',
  douradoClaro:     '#F0C520',
  douradoFundo:     'rgba(196,154,0,0.18)',
  douradoFundoSutil:'rgba(196,154,0,0.08)',

  // ─── Textos ─────────────────────────────────────
  textoPrimario:   '#F0F2FF',
  textoSecundario: '#8B96C0',
  textoFraco:      '#3D4570',
  textoInvertido:  '#080910',

  // ─── Status do usuário ──────────────────────────
  corAssistido:     '#2ECC71',
  corAssistindo:    '#3498DB',
  corQueroAssistir: '#F39C12',
  corAbandonado:    '#E74C3C',

  // ─── Status de série ────────────────────────────
  corFinalizada:   '#2ECC71',
  corCancelada:    '#E74C3C',
  corEmAndamento:  '#3498DB',
  corPlanning:     '#9B59B6',

  // ─── Overlay ────────────────────────────────────
  overlay:     'rgba(8,9,16,0.85)',
  overlayCard: 'rgba(8,9,16,0.65)',
  overlayFraco:'rgba(8,9,16,0.40)',

  // ─── HUD cantos (sci-fi) ────────────────────────
  corHUD: 'rgba(255,255,255,0.30)',
} as const;

// Gradientes para uso com LinearGradient
export const GRADIENTES = {
  fundo:       ['#080910', '#0F111B'] as string[],
  azul:        ['rgba(27,63,158,0.95)', 'rgba(8,9,16,0.0)'] as string[],
  dourado:     ['rgba(196,154,0,0.95)', 'rgba(8,9,16,0.0)'] as string[],
  card:        ['rgba(21,23,37,0.0)', 'rgba(8,9,16,0.97)'] as string[],
  headerAzul:  ['#0F1830', '#080910'] as string[],
  backdrop:    ['rgba(8,9,16,0.0)', 'rgba(8,9,16,0.6)', '#080910'] as string[],
  botaoAzul:   ['#1B3F9E', '#2A57D5'] as string[],
  botaoDourado:['#A07E00', '#C49A00'] as string[],
} as const;

// Mapeamento de statusUsuario → cor
export const COR_STATUS: Record<string, string> = {
  assistido:      CORES.corAssistido,
  assistindo:     CORES.corAssistindo,
  quero_assistir: CORES.corQueroAssistir,
  abandonado:     CORES.corAbandonado,
};

// Mapeamento de statusUsuario → label
export const LABEL_STATUS: Record<string, string> = {
  assistido:      'Assistido',
  assistindo:     'Assistindo',
  quero_assistir: 'Quero Assistir',
  abandonado:     'Abandonado',
};

// Mapeamento de tipo → label
export const LABEL_TIPO: Record<string, string> = {
  filme:        'Filme',
  serie:        'Série',
  animacao:     'Animação',
  documentario: 'Documentário',
  minisserie:   'Minissérie',
  especial:     'Especial',
};

// Mapeamento de status de série → cor e label
export const INFO_STATUS_SERIE: Record<string, { cor: string; label: string }> = {
  'Ended':            { cor: CORES.corFinalizada,  label: 'Finalizada' },
  'Canceled':         { cor: CORES.corCancelada,   label: 'Cancelada ⚠' },
  'Returning Series': { cor: CORES.corEmAndamento, label: 'Em Andamento' },
  'In Production':    { cor: CORES.corEmAndamento, label: 'Em Produção' },
  'Planned':          { cor: CORES.corPlanning,    label: 'Anunciada' },
};
