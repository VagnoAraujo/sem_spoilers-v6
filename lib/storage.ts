// lib/storage.ts — Persistência local com AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Configuracoes, Titulo } from '@/types';

const CHAVE_TITULOS       = '@ss_titulos';
const CHAVE_CONFIGURACOES = '@ss_config';
const CHAVE_CHAT_IA       = '@ss_chat';

// ─── Gera ID único ──────────────────────────────────
export function gerarId(): string {
  const timestamp = Date.now().toString(36);
  const random1   = Math.random().toString(36).substring(2, 7);
  const random2   = Math.random().toString(36).substring(2, 7);
  return `${timestamp}-${random1}-${random2}`;
}

// ─── TÍTULOS ────────────────────────────────────────

export async function carregarTitulos(): Promise<Titulo[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAVE_TITULOS);
    if (!raw) return [];
    return JSON.parse(raw) as Titulo[];
  } catch {
    return [];
  }
}

export async function salvarTitulos(titulos: Titulo[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CHAVE_TITULOS, JSON.stringify(titulos));
  } catch (e) {
    console.error('[Storage] Erro ao salvar títulos:', e);
  }
}

export async function adicionarTituloLocal(
  titulo: Omit<Titulo, 'id' | 'data_adicionado'>
): Promise<Titulo> {
  const titulos = await carregarTitulos();
  const novo: Titulo = {
    ...titulo,
    id: gerarId(),
    data_adicionado: new Date().toISOString(),
  };
  await salvarTitulos([novo, ...titulos]);
  return novo;
}

export async function atualizarTituloLocal(
  id: string,
  updates: Partial<Titulo>
): Promise<Titulo | null> {
  const titulos = await carregarTitulos();
  const idx = titulos.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  titulos[idx] = { ...titulos[idx], ...updates };
  await salvarTitulos(titulos);
  return titulos[idx];
}

export async function removerTituloLocal(id: string): Promise<void> {
  const titulos = await carregarTitulos();
  await salvarTitulos(titulos.filter((t) => t.id !== id));
}

// ─── CONFIGURAÇÕES ──────────────────────────────────

const CONFIG_DEFAULT: Configuracoes = {
  tmdbApiKey:      '',
  groqApiKey:      '',
  geminiApiKey:    '',
  supabaseUrl:     '',
  supabaseAnonKey: '',
  usarSupabase:    false,
  nomeUsuario:     'Diretor',
};

export async function carregarConfiguracoes(): Promise<Configuracoes> {
  try {
    const raw = await AsyncStorage.getItem(CHAVE_CONFIGURACOES);
    if (!raw) return CONFIG_DEFAULT;
    return { ...CONFIG_DEFAULT, ...JSON.parse(raw) };
  } catch {
    return CONFIG_DEFAULT;
  }
}

export async function salvarConfiguracoes(
  config: Partial<Configuracoes>
): Promise<void> {
  try {
    const atual = await carregarConfiguracoes();
    await AsyncStorage.setItem(
      CHAVE_CONFIGURACOES,
      JSON.stringify({ ...atual, ...config })
    );
  } catch (e) {
    console.error('[Storage] Erro ao salvar config:', e);
  }
}

// ─── HISTÓRICO DO CHAT ──────────────────────────────

export async function carregarHistoricoChat(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAVE_CHAT_IA);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function salvarHistoricoChat(mensagens: any[]): Promise<void> {
  try {
    const ultimas = mensagens.slice(-50);
    await AsyncStorage.setItem(CHAVE_CHAT_IA, JSON.stringify(ultimas));
  } catch (e) {
    console.error('[Storage] Erro ao salvar chat:', e);
  }
}

// ─── UTILITÁRIOS ────────────────────────────────────

export async function limparTudo(): Promise<void> {
  await AsyncStorage.multiRemove([
    CHAVE_TITULOS,
    CHAVE_CONFIGURACOES,
    CHAVE_CHAT_IA,
  ]);
}

export async function exportarDados(): Promise<string> {
  const titulos = await carregarTitulos();
  const config  = await carregarConfiguracoes();
  return JSON.stringify(
    {
      exportado_em: new Date().toISOString(),
      app: 'Sem Spoilers v1.0',
      titulos,
      config: { nomeUsuario: config.nomeUsuario },
    },
    null,
    2
  );
}
