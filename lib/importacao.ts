// lib/importacao.ts — Importação confiável de listas no Expo Go

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as XLSX from 'xlsx';
import { extrairTitulosDaImagem } from './groq';
import { extrairTitulosComGemini, setGeminiKey } from './gemini';
import { Titulo } from '@/types';

export interface ImportacaoExtraida {
  titulo: string;
  ano?: number;
  diretores: string[];
}

const TIPOS_SUPORTADOS = [
  'text/plain',
  'text/csv',
  'text/tab-separated-values',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function selecionarArquivo(): Promise<DocumentPicker.DocumentPickerResult> {
  return DocumentPicker.getDocumentAsync({
    type: TIPOS_SUPORTADOS,
    copyToCacheDirectory: true,
  });
}

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

async function lerTexto(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

async function lerTxtOuCsv(uri: string): Promise<ImportacaoExtraida[]> {
  const conteudo = await lerTexto(uri);
  return extrairItensDoTexto(conteudo);
}

async function lerXlsx(uri: string): Promise<ImportacaoExtraida[]> {
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const wb = XLSX.read(b64.replace(/[\r\n]/g, ''), { type: 'base64' });
  const itens: ImportacaoExtraida[] = [];

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, blankrows: false });
    itens.push(...extrairItensDeLinhas(rows.map((row) => row.map((cell) => String(cell ?? '').trim()))));
  }

  return deduplicarItens(itens);
}

export async function extrairItensDoArquivo(
  uri: string,
  mimeType?: string | null,
  fileName?: string | null
): Promise<ImportacaoExtraida[]> {
  const origem = `${fileName ?? ''} ${uri}`.toLowerCase();
  const tipo = (mimeType ?? '').toLowerCase();
  const ext = origem.split('?')[0].split('.').pop() ?? '';

  if (['txt', 'csv', 'tsv'].includes(ext) || tipo.includes('text') || tipo.includes('csv')) {
    return lerTxtOuCsv(uri);
  }

  if (['xlsx', 'xls'].includes(ext) || tipo.includes('spreadsheet') || tipo.includes('excel')) {
    return lerXlsx(uri);
  }

  throw new Error('Formato não suportado. Use TXT, CSV ou XLSX para importar listas com precisão.');
}

export async function extrairNomesDoArquivo(
  uri: string,
  mimeType?: string | null
): Promise<string[]> {
  const itens = await extrairItensDoArquivo(uri, mimeType);
  return itens.map((item) => item.titulo);
}

function extrairItensDoTexto(texto: string): ImportacaoExtraida[] {
  const linhas = texto
    .replace(/^\uFEFF/, '')
    .split(/[\n\r]+/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  const rows = linhas.flatMap((linha) => {
    const cells = parseLinhaSeparada(linha);
    if (cells.length > 1) return [cells];
    return linha.split(/[;|•·]/).map((parte) => [parte.trim()]).filter((row) => row[0]);
  });

  return extrairItensDeLinhas(rows);
}

function extrairItensDeLinhas(rows: string[][]): ImportacaoExtraida[] {
  if (!rows.length) return [];

  const headerIndex = rows.findIndex((row) => row.some((cell) => ehColunaConhecida(cell)));
  const header = headerIndex >= 0 ? rows[headerIndex].map(normalizarHeader) : [];
  const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;

  const tituloIdx = header.findIndex((h) => ['titulo', 'nome', 'filme', 'serie', 'obra'].includes(h));
  const diretorIdx = header.findIndex((h) => ['diretor', 'diretores', 'director', 'criador', 'realizador'].includes(h));
  const anoIdx = header.findIndex((h) => ['ano', 'year', 'lancamento'].includes(h));

  const itens: ImportacaoExtraida[] = [];

  for (const row of dataRows) {
    const cells = row.map((cell) => String(cell ?? '').trim()).filter(Boolean);
    if (!cells.length) continue;

    if (header.length && tituloIdx >= 0) {
      const item = criarItem(cells[tituloIdx], cells[diretorIdx], cells[anoIdx]);
      if (item) itens.push(item);
      continue;
    }

    if (cells.length === 1) {
      const item = criarItem(cells[0]);
      if (item) itens.push(item);
      continue;
    }

    const primeiro = cells[0];
    const segundo = cells[1];
    const terceiro = cells[2];
    const item = criarItem(
      primeiro,
      pareceAno(segundo) ? terceiro : segundo,
      pareceAno(segundo) ? segundo : terceiro
    );
    if (item) itens.push(item);
  }

  return deduplicarItens(itens);
}

function criarItem(tituloRaw?: string, diretorRaw?: string, anoRaw?: string): ImportacaoExtraida | null {
  const tituloComAno = limparTitulo(String(tituloRaw ?? ''));
  if (!tituloComAno || ehLixo(tituloComAno)) return null;

  const anoNoTitulo = tituloComAno.match(/\b(19\d{2}|20\d{2})\b/);
  const titulo = limparTitulo(tituloComAno.replace(/\b(19\d{2}|20\d{2})\b/g, ''));
  if (!titulo || ehLixo(titulo)) return null;

  const ano = extrairAno(anoRaw) ?? (anoNoTitulo ? Number(anoNoTitulo[1]) : undefined);
  const diretores = separarDiretores(diretorRaw);

  return { titulo, ano, diretores };
}

function parseLinhaSeparada(linha: string): string[] {
  const separador = linha.includes('\t') ? '\t' : linha.includes(';') ? ';' : linha.includes('|') ? '|' : linha.includes(',') ? ',' : '';
  if (!separador) return [linha.trim()];

  const cells: string[] = [];
  let atual = '';
  let emAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];
    if (char === '"') {
      emAspas = !emAspas;
      continue;
    }
    if (char === separador && !emAspas) {
      cells.push(atual.trim());
      atual = '';
    } else {
      atual += char;
    }
  }
  cells.push(atual.trim());
  return cells.filter(Boolean);
}

function limparTitulo(valor: string): string {
  return valor
    .replace(/^\s*[-–—•·*✓✔☑☐]+\s*/, '')
    .replace(/^\s*\d{1,4}\s*[.)\-:]\s*/, '')
    .replace(/\s*\[[^\]]*\]\s*$/g, '')
    .replace(/\s*\([^)]*(assistido|visto|quero assistir|filme|série|serie)[^)]*\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function separarDiretores(valor?: string): string[] {
  if (!valor || pareceAno(valor)) return [];
  const limpo = valor.replace(/diretor(?:es)?\s*:/i, '').trim();
  if (!limpo || ehLixo(limpo)) return [];
  return limpo
    .split(/\s*(?:,|\/|&|\be\b)\s*/i)
    .map((nome) => nome.trim())
    .filter((nome) => nome.length > 2 && !ehLixo(nome));
}

function extrairAno(valor?: string): number | undefined {
  const match = String(valor ?? '').match(/\b(19\d{2}|20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function pareceAno(valor?: string): boolean {
  return /^\s*(19\d{2}|20\d{2})\s*$/.test(String(valor ?? ''));
}

function normalizarHeader(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function ehColunaConhecida(valor: string): boolean {
  return ['titulo', 'nome', 'filme', 'serie', 'obra', 'diretor', 'diretores', 'director', 'criador', 'ano', 'year', 'lancamento'].includes(normalizarHeader(valor));
}

function ehLixo(valor: string): boolean {
  const texto = valor.trim();
  if (texto.length < 2 || texto.length > 120) return true;
  if (!/[a-zA-ZÀ-ÿ]/.test(texto)) return true;
  if (/^(obj|endobj|stream|endstream|xref|trailer|startxref)$/i.test(texto)) return true;
  if (/[�]/.test(texto)) return true;
  const estranhos = (texto.match(/[^\x20-\x7EÀ-ÿ]/g) ?? []).length;
  if (estranhos / texto.length > 0.08) return true;
  const simbolos = (texto.match(/[{}<>#@$%^_=+~`]/g) ?? []).length;
  return simbolos / texto.length > 0.2;
}

function deduplicarItens(itens: ImportacaoExtraida[]): ImportacaoExtraida[] {
  const vistos = new Set<string>();
  const resultado: ImportacaoExtraida[] = [];

  for (const item of itens) {
    const chave = item.titulo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push(item);
  }

  return resultado;
}

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
    const normTitulo = norm(t.titulo);
    const normOriginal = t.titulo_original ? norm(t.titulo_original) : '';

    if (normTitulo === normImportado || normOriginal === normImportado) return t;
    if (normTitulo.length > 4 && normImportado.includes(normTitulo)) return t;
    if (normImportado.length > 4 && normTitulo.includes(normImportado)) return t;
  }
  return null;
}

export async function importarViaPrint(groqKey: string): Promise<string[]> {
  if (!groqKey) return [];
  const imagem = await selecionarImagem();
  if (!imagem || !imagem.base64) return [];
  try {
    return await extrairTitulosDaImagem(imagem.base64);
  } catch {
    return [];
  }
}

export async function importarViaPrintInteligente(
  groqKey: string,
  geminiKey: string
): Promise<string[]> {
  const imagem = await selecionarImagem();
  if (!imagem || !imagem.base64) return [];

  if (geminiKey) {
    try {
      setGeminiKey(geminiKey);
      const resultado = await extrairTitulosComGemini(imagem.base64);
      if (resultado.length > 0) return resultado;
    } catch {
      // Gemini pode falhar por cota (429). O app cai para Groq sem travar.
    }
  }

  if (groqKey) {
    try {
      return await extrairTitulosDaImagem(imagem.base64);
    } catch {
      return [];
    }
  }

  return [];
}
