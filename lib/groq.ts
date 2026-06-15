// lib/groq.ts — Groq API: Chat IA + Vision (OCR de prints)
// Chave gratuita em: https://console.groq.com

const GROQ_BASE = 'https://api.groq.com/openai/v1';
const MODELO_CHAT   = 'llama-3.3-70b-versatile';
const MODELO_VISION = 'llama-3.2-11b-vision-preview'; // suporta imagens (Groq free)

let _groqKey = '';
export function setGroqKey(key: string) { _groqKey = key; }
export function getGroqKey() { return _groqKey; }

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
}

// ─── CHAT ASSISTENTE ────────────────────────────────

export async function chatGroq(
  mensagens: GroqMessage[],
  systemPrompt: string,
  titulos: any[]
): Promise<string> {
  if (!_groqKey) return '⚠️ Configure sua chave Groq nas configurações para usar o assistente.';

  const resumoLista = titulos.slice(0, 80).map((t) =>
    `${t.titulo} (${t.tipo}, ${t.ano_lancamento ?? '?'}, ${t.status_usuario}${t.nota_pessoal ? `, nota: ${t.nota_pessoal}` : ''})`
  ).join('\n');

  const system = `${systemPrompt}

Você é o assistente cinematográfico do usuário chamado "Sem Spoilers". Você conhece profundamente filmes, séries, animações e documentários. Você NÃO revela spoilers a menos que o usuário peça explicitamente.

LISTA DO USUÁRIO (${titulos.length} títulos):
${resumoLista}${titulos.length > 80 ? `\n... e mais ${titulos.length - 80} títulos.` : ''}

Você pode:
- Recomendar títulos para assistir baseado no gosto do usuário
- Dar resumos SEM spoilers
- Analisar padrões de gosto (gêneros preferidos, diretores, etc)
- Responder sobre o universo cinematográfico em geral
- Alertar se uma série foi cancelada antes de o usuário começar

REGRA ABSOLUTA: Nunca dê spoilers sem o usuário pedir explicitamente com "pode spoilar".
Responda sempre em Português do Brasil, de forma amigável e entusiasmada com cinema.`;

  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_groqKey}`,
      },
      body: JSON.stringify({
        model: MODELO_CHAT,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          ...mensagens,
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return `❌ Erro Groq: ${err.error?.message ?? res.status}`;
    }

    const data = await res.json();
    return data.choices[0]?.message?.content ?? '(sem resposta)';
  } catch (e: any) {
    return `❌ Erro de conexão: ${e.message}`;
  }
}

// ─── VISION: OCR de screenshot ──────────────────────
// Recebe base64 da imagem e extrai nomes de filmes/séries

export async function extrairTitulosDaImagem(base64: string): Promise<string[]> {
  if (!_groqKey) return [];

  const prompt = `Analise esta imagem e extraia TODOS os títulos de filmes, séries, animações ou documentários que aparecem nela.

Pode ser: lista do Netflix, Amazon Prime, HBO, capturas de tela de apps, listas escritas, etc.

Retorne SOMENTE um array JSON com os títulos encontrados, sem mais nenhum texto.
Exemplo: ["Inception", "Breaking Bad", "Cidade de Deus", "Demon Slayer"]

Se não encontrar nenhum título, retorne: []`;

  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${_groqKey}`,
      },
      body: JSON.stringify({
        model: MODELO_VISION,
        max_tokens: 512,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64}`,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const texto = data.choices[0]?.message?.content ?? '[]';

    // Extrai JSON da resposta
    const match = texto.match(/\[.*\]/s);
    if (!match) return [];
    return JSON.parse(match[0]) as string[];
  } catch {
    return [];
  }
}

// ─── SUGESTÃO RÁPIDA ────────────────────────────────

export async function pedirSugestao(
  generos: string[],
  tiposPreferidos: string[],
  jaAssistidos: string[],
  groqKey: string
): Promise<string> {
  if (!groqKey) return '';

  const prompt = `Com base no perfil cinematográfico abaixo, sugira 3 títulos para assistir hoje.
Gêneros favoritos: ${generos.join(', ')}
Tipos preferidos: ${tiposPreferidos.join(', ')}
Já assistidos (não repetir): ${jaAssistidos.slice(0, 30).join(', ')}

Responda em PT-BR com título, breve descrição sem spoilers e por que vai gostar. Seja entusiasmado!`;

  try {
    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: MODELO_CHAT,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    return data.choices[0]?.message?.content ?? '';
  } catch {
    return '';
  }
}
