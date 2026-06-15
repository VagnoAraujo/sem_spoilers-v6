// types/index.ts — Tipos globais do Sem Spoilers

export type TipoTitulo =
  | 'filme'
  | 'serie'
  | 'animacao'
  | 'documentario'
  | 'minisserie'
  | 'especial';

export type StatusUsuario =
  | 'assistido'
  | 'assistindo'
  | 'quero_assistir'
  | 'abandonado';

export type StatusSerie =
  | 'Ended'
  | 'Canceled'
  | 'Returning Series'
  | 'In Production'
  | 'Planned'
  | null;

export interface Titulo {
  id: string;
  tmdb_id?: number;
  titulo: string;
  titulo_original?: string;
  tipo: TipoTitulo;
  ano_lancamento?: number;
  poster_url?: string;
  backdrop_url?: string;
  sinopse?: string;
  nota_pessoal?: number; // 0-10
  nota_tmdb?: number;    // 0-10
  generos: string[];
  diretores: string[];
  elenco: string[];
  tem_continuacao: boolean;
  continuacao_nome?: string;
  status_serie?: StatusSerie;
  temporadas?: number;
  episodios_total?: number;
  status_usuario: StatusUsuario;
  data_adicionado: string;
  data_assistido?: string;
  tem_plot_twist: boolean;
  comentario_pessoal?: string;
  tags: string[];
  duracao_minutos?: number;
  origem_importacao?: string;
  // Feature #2: progresso de séries
  temporada_atual?: number;
  episodio_atual?: number;
  // Feature #3: review
  nota_emocional?: 'amei' | 'gostei' | 'ok' | 'nao_gostei' | 'odiei';
  data_review?: string;
}

// TMDB API Types
export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  media_type: 'movie' | 'tv' | 'person';
  genre_ids: number[];
  popularity: number;
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  runtime: number | null;
  genres: { id: number; name: string }[];
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path: string | null;
  } | null;
  credits: {
    crew: { id: number; name: string; job: string }[];
    cast: { id: number; name: string; character: string }[];
  };
}

export interface TMDBTVDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  number_of_seasons: number;
  number_of_episodes: number;
  status: string;
  genres: { id: number; name: string }[];
  created_by: { id: number; name: string }[];
  credits: {
    crew: { id: number; name: string; job: string }[];
    cast: { id: number; name: string; character: string }[];
  };
  in_production: boolean;
}

// AI Assistant Types
export interface MensagemIA {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imagemBase64?: string;
}

// App Settings
export interface Configuracoes {
  tmdbApiKey: string;
  groqApiKey: string;
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  usarSupabase: boolean;
  nomeUsuario: string;
}

// Statistics
export interface EstatisticasApp {
  totalAssistidos: number;
  totalAssistindo: number;
  totalQueroAssistir: number;
  totalAbandonados: number;
  totalFilmes: number;
  totalSeries: number;
  totalAnimacoes: number;
  totalDocumentarios: number;
}

// Import feature
export interface TituloImportado {
  tituloOriginal: string;        // text extracted from file/screenshot
  tmdbResult?: TMDBSearchResult; // match found on TMDB
  duplicata?: Titulo | null;     // existing title in user's list
  status: 'buscando' | 'encontrado' | 'nao_encontrado' | 'duplicata';
  selecionado: boolean;
  tipo?: TipoTitulo;
}
