// lib/app-context.tsx — Contexto global do Sem Spoilers

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  carregarTitulos,
  salvarTitulos,
  carregarConfiguracoes,
  salvarConfiguracoes,
  gerarId,
} from './storage';
import { initSupabase, isSupabaseAtivo, sincronizarComSupabase } from './supabase';
import { setTMDBKey } from './tmdb';
import { setGroqKey } from './groq';
import { setGeminiKey } from './gemini';
import { Configuracoes, EstatisticasApp, StatusUsuario, Titulo, TipoTitulo } from '@/types';

// ─── Tipos do Contexto ──────────────────────────────

interface FiltrosAtivos {
  busca: string;
  status?: StatusUsuario;
  tipo?: TipoTitulo;
  genero?: string;
  diretor?: string;
  soPlotTwist: boolean;
  ordenar: 'recente' | 'titulo' | 'nota' | 'ano';
}

interface AppContextValue {
  // Dados
  titulos: Titulo[];
  carregando: boolean;
  sincronizando: boolean;

  // Config
  config: Configuracoes;

  // Filtros
  filtros: FiltrosAtivos;
  setFiltros: (f: Partial<FiltrosAtivos>) => void;
  titulosFiltrados: Titulo[];

  // CRUD
  adicionarTitulo: (t: Omit<Titulo, 'id' | 'data_adicionado'>) => Promise<Titulo>;
  atualizarTitulo: (id: string, updates: Partial<Titulo>) => Promise<void>;
  removerTitulo: (id: string) => Promise<void>;
  importarLote: (novos: Omit<Titulo, 'id' | 'data_adicionado'>[]) => Promise<{ adicionados: number; duplicatas: number }>;

  // Config
  salvarConfig: (c: Partial<Configuracoes>) => Promise<void>;

  // Estatísticas
  estatisticas: EstatisticasApp;

  // Utilitários
  recarregar: () => Promise<void>;
  sincronizarNuvem: () => Promise<void>;

  // Listas derivadas
  todosGeneros: string[];
  todosDiretores: string[];
}

// ─── Filtros padrão ─────────────────────────────────

const FILTROS_INICIAIS: FiltrosAtivos = {
  busca:       '',
  status:      undefined,
  tipo:        undefined,
  genero:      undefined,
  diretor:     undefined,
  soPlotTwist: false,
  ordenar:     'recente',
};

// ─── Contexto ───────────────────────────────────────

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [titulos,      setTitulos]      = useState<Titulo[]>([]);
  const [config,       setConfig]       = useState<Configuracoes>({
    tmdbApiKey: '', groqApiKey: '', supabaseUrl: '',
    supabaseAnonKey: '', usarSupabase: false, nomeUsuario: 'Diretor',
  });
  const [carregando,   setCarregando]   = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [filtros,      setFiltrosState] = useState<FiltrosAtivos>(FILTROS_INICIAIS);

  // ─── Inicialização ─────────────────────────────
  useEffect(() => {
    (async () => {
      setCarregando(true);
      const [titulosLocal, configLocal] = await Promise.all([
        carregarTitulos(),
        carregarConfiguracoes(),
      ]);

      setTitulos(titulosLocal);
      setConfig(configLocal);

      // Aplica chaves de API nas libs
      if (configLocal.tmdbApiKey) setTMDBKey(configLocal.tmdbApiKey);
      if (configLocal.groqApiKey) setGroqKey(configLocal.groqApiKey);
      if (configLocal.geminiApiKey) setGeminiKey(configLocal.geminiApiKey);

      // Inicia Supabase se configurado
      if (configLocal.usarSupabase && configLocal.supabaseUrl && configLocal.supabaseAnonKey) {
        await initSupabase(configLocal.supabaseUrl, configLocal.supabaseAnonKey);
      }

      setCarregando(false);
    })();
  }, []);

  // ─── CRUD ─────────────────────────────────────

  const adicionarTitulo = useCallback(
    async (dados: Omit<Titulo, 'id' | 'data_adicionado'>): Promise<Titulo> => {
      const novo: Titulo = {
        ...dados,
        id: gerarId(),
        data_adicionado: new Date().toISOString(),
      };
      const atualizados = [novo, ...titulos];
      setTitulos(atualizados);
      await salvarTitulos(atualizados);
      return novo;
    },
    [titulos]
  );

  const atualizarTitulo = useCallback(
    async (id: string, updates: Partial<Titulo>): Promise<void> => {
      const atualizados = titulos.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      );
      setTitulos(atualizados);
      await salvarTitulos(atualizados);
    },
    [titulos]
  );

  const removerTitulo = useCallback(
    async (id: string): Promise<void> => {
      const atualizados = titulos.filter((t) => t.id !== id);
      setTitulos(atualizados);
      await salvarTitulos(atualizados);
    },
    [titulos]
  );

  // ─── Importação em lote com dedup ───────────────

  const importarLote = useCallback(
    async (
      novos: Omit<Titulo, 'id' | 'data_adicionado'>[]
    ): Promise<{ adicionados: number; duplicatas: number }> => {
      let adicionados = 0;
      let duplicatas  = 0;
      const listaAtualizada = [...titulos];

      const norm = (s: string) =>
        s.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

      for (const novo of novos) {
        const jaExiste = listaAtualizada.some(
          (t) =>
            norm(t.titulo) === norm(novo.titulo) ||
            (t.tmdb_id && t.tmdb_id === novo.tmdb_id)
        );
        if (jaExiste) {
          duplicatas++;
        } else {
          const titulo: Titulo = {
            ...novo,
            id: gerarId(),
            data_adicionado: new Date().toISOString(),
          };
          listaAtualizada.unshift(titulo);
          adicionados++;
        }
      }

      setTitulos(listaAtualizada);
      await salvarTitulos(listaAtualizada);
      return { adicionados, duplicatas };
    },
    [titulos]
  );

  // ─── Config ────────────────────────────────────

  const salvarConfig = useCallback(async (novaConfig: Partial<Configuracoes>) => {
    const atualizada = { ...config, ...novaConfig };
    setConfig(atualizada);
    await salvarConfiguracoes(atualizada);

    if (novaConfig.tmdbApiKey) setTMDBKey(novaConfig.tmdbApiKey);
    if (novaConfig.groqApiKey) setGroqKey(novaConfig.groqApiKey);
    if (novaConfig.geminiApiKey) setGeminiKey(novaConfig.geminiApiKey);

    if (
      atualizada.usarSupabase &&
      (novaConfig.supabaseUrl || novaConfig.supabaseAnonKey)
    ) {
      await initSupabase(atualizada.supabaseUrl, atualizada.supabaseAnonKey);
    }
  }, [config]);

  // ─── Sync Supabase ─────────────────────────────

  const sincronizarNuvem = useCallback(async () => {
    if (!isSupabaseAtivo()) return;
    setSincronizando(true);
    await sincronizarComSupabase(titulos);
    setSincronizando(false);
  }, [titulos]);

  const recarregar = useCallback(async () => {
    const t = await carregarTitulos();
    setTitulos(t);
  }, []);

  // ─── Filtros ───────────────────────────────────

  const setFiltros = useCallback((f: Partial<FiltrosAtivos>) => {
    setFiltrosState((prev) => ({ ...prev, ...f }));
  }, []);

  const titulosFiltrados = React.useMemo(() => {
    let lista = [...titulos];

    if (filtros.status)      lista = lista.filter((t) => t.status_usuario === filtros.status);
    if (filtros.tipo)        lista = lista.filter((t) => t.tipo === filtros.tipo);
    if (filtros.genero)      lista = lista.filter((t) => t.generos.includes(filtros.genero!));
    if (filtros.diretor)     lista = lista.filter((t) => t.diretores.includes(filtros.diretor!));
    if (filtros.soPlotTwist) lista = lista.filter((t) => t.tem_plot_twist);

    if (filtros.busca.trim()) {
      const b = filtros.busca.toLowerCase();
      lista = lista.filter(
        (t) =>
          t.titulo.toLowerCase().includes(b) ||
          t.titulo_original?.toLowerCase().includes(b) ||
          t.generos.some((g) => g.toLowerCase().includes(b)) ||
          t.diretores.some((d) => d.toLowerCase().includes(b))
      );
    }

    switch (filtros.ordenar) {
      case 'titulo':  lista.sort((a, b) => a.titulo.localeCompare(b.titulo)); break;
      case 'nota':    lista.sort((a, b) => (b.nota_pessoal ?? 0) - (a.nota_pessoal ?? 0)); break;
      case 'ano':     lista.sort((a, b) => (b.ano_lancamento ?? 0) - (a.ano_lancamento ?? 0)); break;
      default:        lista.sort((a, b) => new Date(b.data_adicionado).getTime() - new Date(a.data_adicionado).getTime());
    }

    return lista;
  }, [titulos, filtros]);

  // ─── Estatísticas ──────────────────────────────

  const estatisticas = React.useMemo<EstatisticasApp>(() => ({
    totalAssistidos:      titulos.filter((t) => t.status_usuario === 'assistido').length,
    totalAssistindo:      titulos.filter((t) => t.status_usuario === 'assistindo').length,
    totalQueroAssistir:   titulos.filter((t) => t.status_usuario === 'quero_assistir').length,
    totalAbandonados:     titulos.filter((t) => t.status_usuario === 'abandonado').length,
    totalFilmes:          titulos.filter((t) => t.tipo === 'filme').length,
    totalSeries:          titulos.filter((t) => t.tipo === 'serie').length,
    totalAnimacoes:       titulos.filter((t) => t.tipo === 'animacao').length,
    totalDocumentarios:   titulos.filter((t) => t.tipo === 'documentario').length,
  }), [titulos]);

  // ─── Derivados ─────────────────────────────────

  const todosGeneros = React.useMemo(
    () => [...new Set(titulos.flatMap((t) => t.generos))].sort(),
    [titulos]
  );

  const todosDiretores = React.useMemo(
    () => [...new Set(titulos.flatMap((t) => t.diretores))].sort(),
    [titulos]
  );

  return (
    <AppContext.Provider value={{
      titulos, carregando, sincronizando,
      config, filtros, setFiltros, titulosFiltrados,
      adicionarTitulo, atualizarTitulo, removerTitulo, importarLote,
      salvarConfig, estatisticas, recarregar, sincronizarNuvem,
      todosGeneros, todosDiretores,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider');
  return ctx;
}
