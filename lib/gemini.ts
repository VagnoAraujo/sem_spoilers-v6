// lib/gemini.ts - Google Gemini Flash: Vision/OCR para prints
// Chave gratuita: https://aistudio.google.com/app/apikey

const MODELOS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1/models';

let _geminiKey = '';
export function setGeminiKey(key: string) { _geminiKey = key; }
export function getGeminiKey() { return _geminiKey; }

export async function extrairTitulosComGemini(base64: string): Promise<string[]> {
  if (!_geminiKey) return [];

  const prompt = `Analise esta imagem e extraia TODOS os títulos de filmes, séries, animações ou documentários visíveis.
Pode ser: tela do Netflix, Amazon Prime, HBO, WhatsApp, lista escrita à mão, capturas de apps, etc.
Retorne SOMENTE um array JSON com os títulos encontrados, sem mais nenhum texto ou explicação.
Exemplo: ["Inception", "Breaking Bad", "Cidade de Deus", "Demon Slayer"]
Se não encontrar nenhum título, retorne: []`;

  for (const modelo of MODELOS) {
    try {
      const res = await fetch(
        `${GEMINI_BASE}/${modelo}:generateContent?key=${_geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: base64 } },
                { text: prompt },
              ],
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const code = (err as any)?.error?.code;

        if (code === 404) continue;
        return [];
      }

      const data = await res.json();
      const texto: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!texto) continue;

      // Tenta extrair array JSON da resposta
      const match = texto.match(/\[[\s\S]*?\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((item) => typeof item === 'string' && item.length > 1);
          }
        } catch {
          // JSON malformado, tenta extração linha a linha
        }
      }

      // Fallback: extrai linha a linha se não vier JSON
      const porLinhas = texto
        .split('\n')
        .map((l: string) =>
          l.replace(/^[\s\-*\d."']+/, '').replace(/["',]+$/, '').trim()
        )
        .filter((l: string) => l.length > 2 && /[a-zA-ZÀ-ÿ]/.test(l));

      if (porLinhas.length > 0) return porLinhas;
      continue;

    } catch {
      // Falha de rede, cota ou chave inválida — tenta próximo modelo
      continue;
    }
  }

  return [];
}