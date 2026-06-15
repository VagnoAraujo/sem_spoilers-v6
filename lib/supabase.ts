// lib/supabase.ts — Cliente Supabase (opcional, fallback AsyncStorage)
// CORRIGIDO: import estático em vez de dinâmico (Metro bundler)

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Titulo } from '@/types';

let supabaseInstance: SupabaseClient | null = null;

export async function initSupabase(
  url: string,
  anonKey: string
): Promise<boolean> {
  if (!url || !anonKey) return false;
  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        storage:          AsyncStorage,
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: false,
      },
    });
    // Testa conexão
    const { error } = await supabaseInstance
      .from('titulos')
      .select('id')
      .limit(1);
    if (error) {
      console.warn('[Supabase] Erro de conexão:', error.message);
      supabaseInstance = null;
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[Supabase] Não inicializado:', e);
    supabaseInstance = null;
    return false;
  }
}

export function isSupabaseAtivo(): boolean {
  return !!supabaseInstance;
}

// ─── OPERAÇÕES CRUD ─────────────────────────────────

export async function buscarTitulosSupabase(): Promise<Titulo[]> {
  if (!supabaseInstance) return [];
  try {
    const { data, error } = await supabaseInstance
      .from('titulos')
      .select('*')
      .order('data_adicionado', { ascending: false });
    if (error) throw error;
    return data as Titulo[];
  } catch (e) {
    console.error('[Supabase] Erro ao buscar títulos:', e);
    return [];
  }
}

export async function inserirTituloSupabase(
  titulo: Titulo
): Promise<Titulo | null> {
  if (!supabaseInstance) return null;
  try {
    const { data, error } = await supabaseInstance
      .from('titulos')
      .insert([titulo])
      .select()
      .single();
    if (error) throw error;
    return data as Titulo;
  } catch (e) {
    console.error('[Supabase] Erro ao inserir:', e);
    return null;
  }
}

export async function atualizarTituloSupabase(
  id: string,
  updates: Partial<Titulo>
): Promise<boolean> {
  if (!supabaseInstance) return false;
  try {
    const { error } = await supabaseInstance
      .from('titulos')
      .update({ ...updates, atualizado_em: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] Erro ao atualizar:', e);
    return false;
  }
}

export async function removerTituloSupabase(id: string): Promise<boolean> {
  if (!supabaseInstance) return false;
  try {
    const { error } = await supabaseInstance
      .from('titulos')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] Erro ao remover:', e);
    return false;
  }
}

export async function sincronizarComSupabase(
  titulos: Titulo[]
): Promise<boolean> {
  if (!supabaseInstance || titulos.length === 0) return false;
  try {
    const { error } = await supabaseInstance
      .from('titulos')
      .upsert(titulos, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[Supabase] Erro ao sincronizar:', e);
    return false;
  }
}
