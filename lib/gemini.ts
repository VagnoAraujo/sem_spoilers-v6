// lib/gemini.ts — Google Gemini Flash: Vision/OCR para prints
// Chave gratuita: https://aistudio.google.com/app/apikey

// Tenta modelos em ordem até um funcionar
const MODELOS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
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
        // 404 = modelo não existe, tenta o próximo
        if ((err as any)?.error?.code === 404) continue;
        console.error('[Gemini] Erro:', err);
        return [];
      }

      const data = await res.json();
      const texto: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

      const match = texto.match(/\[[\s\S]*\]/);
      if (!match) {
        return texto
          .split('\n')
          .map((l: string) => l.replace(/^[-*\d.)"'\s]+/, '').replace(/["',]+$/, '').trim())
          .filter((l: string) => l.length > 2 && /[a-zA-ZÀ-ÿ]/.test(l));
      }
      try { return JSON.parse(match[0]) as string[]; } catch { return []; }

    } catch (e: any) {
      console.error(`[Gemini] Erro no modelo ${modelo}:`, e.message);
    }
  }
  return [];
}
