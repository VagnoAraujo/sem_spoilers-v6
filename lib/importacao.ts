// lib/importacao.ts — Importação de listas (txt, xlsx, pdf, docx, imagem)

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as XLSX from 'xlsx';
import { extrairTitulosDaImagem } from './groq';
import { Titulo } from '@/types';

// ─── SELEÇÃO DE ARQUIVO ─────────────────────────────

export async function selecionarArquivo(): Promise<DocumentPicker.DocumentPickerResult> {
  return DocumentPicker.getDocumentAsync({
    type: ['*/*'],
    copyToCacheDirectory: true,
  });
}

// ─── SELEÇÃO DE IMAGEM/PRINT ────────────────────────

export async function selecionarImagem(): Promise<{
  base64: string;
  uri: string;
} | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    base64: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return { base64: asset.base64 ?? '', uri: asset.uri };
}

// ─── DECODE BASE64 SEGURO ────────────────────────────
// Hermes/RN: atob() pode falhar se base64 tem quebras de linha

function atobSafe(b64: string): string {
  // Remove espaços e quebras de linha antes de decodificar
  const clean = b64.replace(/[\r\n\s]/g, '');
  return atob(clean);
}

// ─── LEITURA DE ARQUIVO TXT ─────────────────────────

async function lerTxt(uri: string): Promise<string[]> {
  try {
    const conteudo = await FileSystem.readAsStringAsync(uri, {
      encoding: 'utf8',
    });
    return extrairNomesDoTexto(conteudo);
  } catch (e) {
    console.error('[Import] Erro txt:', e);
    return [];
  }
}

// ─── LEITURA DE XLSX ────────────────────────────────

async function lerXlsx(uri: string): Promise<string[]> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    // XLSX.read aceita base64 com ou sem quebras — mais robusto
    const wb  = XLSX.read(b64.replace(/[\r\n]/g, ''), { type: 'base64' });
    const nomes: string[] = [];

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const json  = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
      for (const row of json) {
        for (const cell of row) {
          if (typeof cell === 'string' && cell.trim().length > 1) {
            nomes.push(cell.trim());
          } else if (typeof cell === 'number') {
            // Ignora números soltos (anos, notas)
          }
        }
      }
    }
    return filtrarNomes(nomes.map(limparlinha));
  } catch (e) {
    console.error('[Import] Erro xlsx:', e);
    return [];
  }
}

// ─── LEITURA DE DOCX ────────────────────────────────
// DOCX é ZIP+XML. Tentamos extrair texto de <w:t> tags ou strings legíveis.

async function lerDocx(uri: string): Promise<string[]> {
  try {
    const b64  = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    const raw  = atobSafe(b64);

    // Estratégia 1: XML não comprimido — busca tags <w:t>
    const xmlMatches = raw.match(/<w:t(?:\s[^>]*)?>([^<]{2,150})<\/w:t>/g);
    if (xmlMatches && xmlMatches.length > 2) {
      const textos = xmlMatches
        .map(m => m.replace(/<[^>]+>/g, '').trim())
        .filter(t => t.length > 1);
      const resultado = filtrarNomes(textos.map(limparlinha));
      if (resultado.length > 0) return resultado;
    }

    // Estratégia 2: Extrai sequências de caracteres legíveis
    return extrairStringsLegiveis(raw);
  } catch (e) {
    console.error('[Import] Erro docx:', e);
    return [];
  }
}

// ─── LEITURA DE PDF ─────────────────────────────────
// Extrai texto real dos streams de conteúdo do PDF (blocos BT...ET)

async function lerPdf(uri: string): Promise<string[]> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const raw  = atobSafe(b64);

    const textos: string[] = [];

    // ── Estratégia 1: Blocos BT/ET (Begin Text / End Text) ──────────────
    // PDFs com texto nativo armazenam conteúdo entre BT e ET
    const blocosBT = raw.match(/BT[\s\S]*?ET/g) ?? [];
    for (const bloco of blocosBT) {
      // Extrai strings de operadores Tj: (texto)Tj
      const tj = bloco.match(/\(([^()\\]{1,200})\)\s*Tj/g) ?? [];
      tj.forEach(m => {
        const t = m.replace(/\)\s*Tj$/, '').replace(/^\(/, '').trim();
        if (t) textos.push(t);
      });
      // Extrai strings de operadores TJ: [(texto)...] TJ
      const tjArr = bloco.match(/\[([\s\S]*?)\]\s*TJ/g) ?? [];
      tjArr.forEach(m => {
        const partes = m.match(/\(([^()\\]{1,200})\)/g) ?? [];
        const linha = partes.map(p => p.slice(1, -1)).join('').trim();
        if (linha) textos.push(linha);
      });
    }

    // ── Estratégia 2: Todas as strings entre parênteses (PDF simples) ──
    if (textos.length < 3) {
      const matches = raw.match(/\(([^()\\]{2,150})\)/g) ?? [];
      matches.forEach(m => textos.push(m.slice(1, -1).trim()));
    }

    // ── Filtra lixo binário ──────────────────────────────────────────────
    const limpos = textos
      .filter(s => {
        // Precisa ter pelo menos 2 letras reais
        if (!/[a-zA-ZÀ-ÿ]{2,}/.test(s)) return false;
        // Rejeita se mais de 30% dos chars são não-imprimíveis
        const lixo = (s.match(/[^\x20-\x7EÀ-ÿ]/g) ?? []).length;
        return lixo / s.length < 0.3;
      });

    if (limpos.length > 0) {
      return filtrarNomes(limpos.map(limparlinha));
    }

    // ── Estratégia 3: Fallback — strings legíveis longas ────────────────
    return extrairStringsLegiveis(raw);
  } catch (e) {
    console.error('[Import] Erro pdf:', e);
    return [];
  }
}

// ─── EXTRAI STRINGS LEGÍVEIS DE BINÁRIO ─────────────
// Para PDF/DOCX comprimidos: varre os bytes e recolhe sequências de chars legíveis

function extrairStringsLegiveis(raw: string): string[] {
  const strings: string[] = [];
  let atual = '';

  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    // ASCII imprimível (32-126) + latim estendido para acentos portugueses (192-255)
    if ((c >= 32 && c <= 126) || (c >= 192 && c <= 255)) {
      atual += raw[i];
    } else {
      if (atual.length >= 4) strings.push(atual);
      atual = '';
    }
  }
  if (atual.length >= 4) strings.push(atual);

  return filtrarNomes(
    strings
      .filter(s => s.length >= 3 && s.length < 120)
      .filter(s => /[a-zA-ZÀ-ÿ]{3,}/.test(s))
      .filter(s => !/^[\s\-_\.\/\\:;,]+$/.test(s))
      .map(limparlinha)
      .filter(s => s.length >= 2)
  );
}

// ─── ORQUESTRADOR PRINCIPAL ─────────────────────────

export async function extrairNomesDoArquivo(
  uri: string,
  mimeType?: string | null
): Promise<string[]> {
  const ext  = uri.split('.').pop()?.toLowerCase() ?? '';
  const tipo = (mimeType ?? '').toLowerCase();

  if (tipo.includes('text/plain') || ext === 'txt')
    return lerTxt(uri);
  if (
    tipo.includes('xlsx') || tipo.includes('spreadsheet') ||
    tipo.includes('excel') || ext === 'xlsx' || ext === 'xls'
  )
    return lerXlsx(uri);
  if (tipo.includes('word') || tipo.includes('docx') || ext === 'docx' || ext === 'doc')
    return lerDocx(uri);
  if (tipo.includes('pdf') || ext === 'pdf')
    return lerPdf(uri);

  // Fallback inteligente por extensão
  if (['txt', 'csv', 'tsv'].includes(ext)) return lerTxt(uri);
  if (['xlsx', 'xls'].includes(ext))       return lerXlsx(uri);
  if (['docx', 'doc'].includes(ext))       return lerDocx(uri);
  if (ext === 'pdf')                        return lerPdf(uri);

  // Último fallback: tenta como texto
  return lerTxt(uri);
}

// ─── EXTRAI NOMES DE TEXTO LIVRE ────────────────────

function extrairNomesDoTexto(texto: string): string[] {
  const linhas = texto
    .split(/[\n\r]+/)           // separa por linhas primeiro
    .flatMap(l => l.split(/[;|•·]+/))  // depois por separadores secundários
    .map(limparlinha)
    .filter(l => l.length > 1 && l.length < 150);
  return filtrarNomes(linhas);
}

function limparlinha(linha: string): string {
  return linha
    // Remove numeração de lista: "1. " "2) " "3: " MAS NÃO "47 Roanins"
    .replace(/^\d{1,3}[\.\)\:][\s]/, '')
    // Remove ano entre parênteses no FINAL: "(2023)" ou " 2023"
    .replace(/\s*[\(\[]\s*[12][0-9]{3}\s*[\)\]]\s*$/, '')
    .replace(/\s+[12][0-9]{3}\s*$/, '')
    // Remove marcadores de série como "(S)" no final
    .replace(/\s*\([Ss]\)\s*$/, '')
    // Remove emojis e símbolos desnecessários
    .replace(/[★☆🎬🎥🍿\[\]]/g, '')
    .trim();
}

function filtrarNomes(nomes: string[]): string[] {
  const stopwords = new Set([
    'lista', 'filmes', 'séries', 'series', 'titulo', 'título',
    'nome', 'status', 'ano', 'gênero', 'genero', 'nota', 'sheet',
    'planilha', 'data', 'type', 'category', 'watched', 'diretores',
    'diretor', 'obs', 'observação', 'continua',
  ]);

  return [...new Set(
    nomes
      .filter(n => n.length >= 2 && n.length <= 150)
      .filter(n => !stopwords.has(n.toLowerCase()))
      .filter(n => /[a-zA-ZÀ-ÿ]/.test(n))
      .map(n => n.trim())
      .filter(n => n.length > 0)
  )];
}

// ─── DEDUPLICAÇÃO INTELIGENTE ────────────────────────

export function checarDuplicata(
  nomeImportado: string,
  listaAtual: Titulo[]
): Titulo | null {
  const norm = (s: string) =>
    s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normImportado = norm(nomeImportado);

  for (const t of listaAtual) {
    const normTitulo   = norm(t.titulo);
    const normOriginal = t.titulo_original ? norm(t.titulo_original) : '';

    if (normTitulo === normImportado || normOriginal === normImportado) return t;
    if (normTitulo.length > 4 && normImportado.includes(normTitulo)) return t;
    if (normImportado.length > 4 && normTitulo.includes(normImportado)) return t;
  }
  return null;
}

// ─── IMPORTAR VIA PRINT DE TELA ─────────────────────

export async function importarViaPrint(groqKey: string): Promise<string[]> {
  if (!groqKey) return [];
  const imagem = await selecionarImagem();
  if (!imagem || !imagem.base64) return [];
  return extrairTitulosDaImagem(imagem.base64);
}

// ─── IMPORTAR VIA PRINT COM GEMINI (preferido) + GROQ (fallback) ────

import { extrairTitulosComGemini } from './gemini';

export async function importarViaPrintInteligente(
  groqKey: string,
  geminiKey: string
): Promise<string[]> {
  const imagem = await selecionarImagem();
  if (!imagem || !imagem.base64) return [];

  // Tenta Gemini primeiro (melhor para OCR)
  if (geminiKey) {
    const { setGeminiKey } = await import('./gemini');
    setGeminiKey(geminiKey);
    const resultado = await extrairTitulosComGemini(imagem.base64);
    if (resultado.length > 0) return resultado;
  }

  // Fallback: Groq Vision
  if (groqKey) {
    return extrairTitulosDaImagem(imagem.base64);
  }

  return [];
}
