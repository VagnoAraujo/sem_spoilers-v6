// lib/tmdb.ts — The Movie Database API (gratuita)
// Chave em: https://www.themoviedb.org/settings/api

import { TMDBSearchResult, TMDBMovieDetail, TMDBTVDetail, Titulo, TipoTitulo, StatusSerie } from '@/types';

const BASE     = 'https://api.themoviedb.org/3';
const IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const IMG_W1280= 'https://image.tmdb.org/t/p/w1280';

let _apiKey = '';
export function setTMDBKey(key: string) { _apiKey = key; }
export function getTMDBKey() { return _apiKey; }

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!_apiKey) {
    console.warn('[TMDB] Chave de API não configurada.');
    return null;
  }
  const query = new URLSearchParams({ api_key: _apiKey, language: 'pt-BR', ...params });
  try {
    const res = await fetch(`${BASE}${path}?${query}`);
    if (!res.ok) return null;
    return await res.json() as T;
  } catch (e) {
    console.error('[TMDB] Erro de rede:', e);
    return null;
  }
}

// ─── BUSCA ──────────────────────────────────────────

export async function buscarTMDB(query: string, tipo?: 'movie' | 'tv'): Promise<TMDBSearchResult[]> {
  if (!query.trim()) return [];

  if (tipo) {
    const data = await tmdbFetch<{ results: TMDBSearchResult[] }>(
      `/search/${tipo}`, { query }
    );
    if (!data) return [];
    return data.results.map((r) => ({ ...r, media_type: tipo }));
  }

  // Busca combinada (filmes + séries)
  const data = await tmdbFetch<{ results: TMDBSearchResult[] }>(
    '/search/multi', { query }
  );
  if (!data) return [];
  return data.results.filter((r) => r.media_type === 'movie' || r.media_type === 'tv');
}

// ─── DETALHES DO FILME ──────────────────────────────

export async function detalharFilme(tmdbId: number): Promise<TMDBMovieDetail | null> {
  return tmdbFetch<TMDBMovieDetail>(`/movie/${tmdbId}`, { append_to_response: 'credits' });
}

// ─── DETALHES DA SÉRIE ──────────────────────────────

export async function detalharSerie(tmdbId: number): Promise<TMDBTVDetail | null> {
  return tmdbFetch<TMDBTVDetail>(`/tv/${tmdbId}`, { append_to_response: 'credits' });
}

// ─── TENDÊNCIAS / POPULARES ─────────────────────────

export async function buscarPopulares(tipo: 'movie' | 'tv' = 'movie'): Promise<TMDBSearchResult[]> {
  const data = await tmdbFetch<{ results: TMDBSearchResult[] }>(
    `/trending/${tipo}/week`
  );
  if (!data) return [];
  return data.results.map((r) => ({ ...r, media_type: tipo }));
}

// ─── CONVERTER TMDB → Titulo INTERNO ────────────────

export function converterFilme(detail: TMDBMovieDetail): Omit<Titulo, 'id' | 'status_usuario' | 'data_adicionado'> {
  const diretores = detail.credits.crew
    .filter((c) => c.job === 'Director')
    .map((c) => c.name);

  const elenco = detail.credits.cast
    .slice(0, 8)
    .map((c) => c.name);

  const ano = detail.release_date
    ? parseInt(detail.release_date.slice(0, 4), 10)
    : undefined;

  return {
    tmdb_id:          detail.id,
    titulo:           detail.title,
    titulo_original:  detail.original_title !== detail.title ? detail.original_title : undefined,
    tipo:             'filme' as TipoTitulo,
    ano_lancamento:   ano,
    poster_url:       detail.poster_path ? `${IMG_W500}${detail.poster_path}` : undefined,
    backdrop_url:     detail.backdrop_path ? `${IMG_W1280}${detail.backdrop_path}` : undefined,
    sinopse:          detail.overview || undefined,
    nota_tmdb:        detail.vote_average ? parseFloat(detail.vote_average.toFixed(1)) : undefined,
    generos:          detail.genres.map((g) => g.name),
    diretores,
    elenco,
    tem_continuacao:  !!detail.belongs_to_collection,
    continuacao_nome: detail.belongs_to_collection?.name,
    status_serie:     null,
    duracao_minutos:  detail.runtime || undefined,
    tem_plot_twist:   false,
    tags:             [],
  };
}

export function converterSerie(detail: TMDBTVDetail): Omit<Titulo, 'id' | 'status_usuario' | 'data_adicionado'> {
  const diretores = [
    ...detail.created_by.map((c) => c.name),
    ...detail.credits.crew.filter((c) => c.job === 'Executive Producer').slice(0, 2).map((c) => c.name),
  ].filter(Boolean).slice(0, 3);

  const elenco = detail.credits.cast
    .slice(0, 8)
    .map((c) => c.name);

  const ano = detail.first_air_date
    ? parseInt(detail.first_air_date.slice(0, 4), 10)
    : undefined;

  const statusSerie = mapearStatusSerie(detail.status);

  // Detecta animação pelo gênero
  const generoNomes = detail.genres.map((g) => g.name);
  const isAnime = generoNomes.includes('Animation') || generoNomes.includes('Animação');

  return {
    tmdb_id:          detail.id,
    titulo:           detail.name,
    titulo_original:  detail.original_name !== detail.name ? detail.original_name : undefined,
    tipo:             isAnime ? 'animacao' : 'serie',
    ano_lancamento:   ano,
    poster_url:       detail.poster_path ? `${IMG_W500}${detail.poster_path}` : undefined,
    backdrop_url:     detail.backdrop_path ? `${IMG_W1280}${detail.backdrop_path}` : undefined,
    sinopse:          detail.overview || undefined,
    nota_tmdb:        detail.vote_average ? parseFloat(detail.vote_average.toFixed(1)) : undefined,
    generos:          generoNomes,
    diretores,
    elenco,
    tem_continuacao:  false,
    status_serie:     statusSerie,
    temporadas:       detail.number_of_seasons,
    episodios_total:  detail.number_of_episodes,
    tem_plot_twist:   false,
    tags:             [],
  };
}

function mapearStatusSerie(status: string): StatusSerie {
  const mapa: Record<string, StatusSerie> = {
    'Ended':            'Ended',
    'Canceled':         'Canceled',
    'Returning Series': 'Returning Series',
    'In Production':    'In Production',
    'Planned':          'Planned',
  };
  return mapa[status] ?? null;
}

// ─── BUSCA POR NOME (para importação) ───────────────

export async function buscarPorNome(nome: string): Promise<TMDBSearchResult | null> {
  const resultados = await buscarTMDB(nome);
  if (!resultados.length) return null;
  // Ordena por popularidade e pega o mais relevante
  return resultados.sort((a, b) => b.popularity - a.popularity)[0];
}

// ─── STREAMING PROVIDERS (Watch Providers) ───────────────

export interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export async function buscarStreaming(
  tmdbId: number,
  tipo: 'movie' | 'tv',
  apiKey: string,
): Promise<StreamingProvider[]> {
  try {
    const url = `https://api.themoviedb.org/3/${tipo}/${tmdbId}/watch/providers?api_key=${apiKey}`;
    const res  = await fetch(url);
    const data = await res.json();
    // Prioridade: BR → US
    const region = data.results?.BR ?? data.results?.US ?? null;
    if (!region) return [];
    // flatrate = assinatura (Netflix, Prime, etc.)
    return (region.flatrate ?? []) as StreamingProvider[];
  } catch {
    return [];
  }
}

// Lista de IDs dos streamings mais comuns no Brasil
export const STREAMING_IDS: Record<number, string> = {
  8:   'Netflix',
  119: 'Amazon Prime',
  337: 'Disney+',
  384: 'HBO Max',
  531: 'Paramount+',
  307: 'Telecine',
  167: 'Mubi',
  350: 'Apple TV+',
};
