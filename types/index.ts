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
  nota_pessoal?: number;
  nota_tmdb?: number;
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
  temporada_atual?: number;
  episodio_atual?: number;
  nota_emocional?: 'amei' | 'gostei' | 'ok' | 'nao_gostei' | 'odiei';
  data_review?: string;
}

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

export interface MensagemIA {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imagemBase64?: string;
}

export interface Configuracoes {
  tmdbApiKey: string;
  groqApiKey: string;
  geminiApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  usarSupabase: boolean;
  nomeUsuario: string;
}

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

export interface TituloImportado {
  tituloOriginal: string;
  tmdbResult?: TMDBSearchResult;
  duplicata?: Titulo | null;
  status: 'buscando' | 'encontrado' | 'nao_encontrado' | 'duplicata';
  selecionado: boolean;
  tipo?: TipoTitulo;
  anoExtraido?: number;
  diretoresExtraidos?: string[];
}
