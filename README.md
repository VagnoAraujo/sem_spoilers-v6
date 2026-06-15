# 🎬 Sem Spoilers

> App pessoal de catálogo cinematográfico — Filmes, Séries, Animações e Documentários  
> Visual dark estilo HBO · Azul 💙 + Dourado 💛 + Dark 🖤 (Cruzeiro!)

---

## ✨ Funcionalidades

- 📋 **Listas pessoais** — Assistido, Assistindo, Quero Assistir, Abandonado
- 🎬 **Dados automáticos via TMDB** — Pôster, ano, elenco, diretor, sinopse, continuações
- 📺 **Status de séries** — Finalizada, Cancelada ⚠, Em Andamento
- 🌀 **Marcador de Plot Twist**
- 🤖 **Assistente IA Groq** — Recomendações e resumos sem spoilers
- 📸 **OCR de prints de tela** — Extrai títulos de screenshots de qualquer app
- 📁 **Importação inteligente** — TXT, XLSX, DOCX, PDF, imagens
- 🔄 **Deduplicação automática** — Nunca duplica títulos ao mesclar listas
- ☁️ **Sincronização Supabase** (opcional)
- 🔍 **Filtros avançados** — por gênero, diretor, tipo, status, plot twist
- 📊 **Dashboard** com estatísticas da sua coleção

---

## 🚀 Configuração rápida

### 1. Clone e instale

```bash
git clone https://github.com/[seu-usuario]/sem-spoilers.git
cd sem-spoilers
npm install
```

### 2. Chaves de API (todas gratuitas)

| API | Link | Para que serve |
|-----|------|----------------|
| **TMDB** | [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) | Pôsteres, dados de filmes/séries |
| **Groq** | [console.groq.com/keys](https://console.groq.com/keys) | Assistente IA + OCR de imagens |
| **Supabase** | [app.supabase.com](https://app.supabase.com) | Backup na nuvem (opcional) |

Configure as chaves dentro do próprio app → aba **Config**.

### 3. Supabase (opcional)

Abra o SQL Editor do seu projeto e cole o conteúdo de `supabase/schema.sql`.

### 4. Rodar no celular

```bash
npx expo start
# Escaneie o QR code com o Expo Go (Android/iOS)
```

---

## 📦 Build do APK

### Via GitHub Actions (recomendado)

1. Crie uma conta em [expo.dev](https://expo.dev)
2. Gere um token: **expo.dev → Account Settings → Access Tokens**
3. Adicione no GitHub: **Settings → Secrets → EXPO_TOKEN**
4. Clique em **Actions → Build APK → Run workflow**
5. Quando concluir, baixe o APK em **expo.dev → Projects → sem-spoilers → Builds**

### Via terminal local

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

---

## 📱 Telas do app

| Tela | Descrição |
|------|-----------|
| **Início** | Dashboard com stats, assistindo agora, ações rápidas |
| **Listas** | Catálogo completo com busca e filtros avançados |
| **IA** | Chat com assistente cinematográfico (Groq) |
| **Descobrir** | Tendências TMDB + busca global |
| **Config** | Chaves de API, Supabase, backup |

---

## 🎨 Design

- Tema **dark cinema** com paleta Cruzeiro (azul `#1B3F9E` + dourado `#C49A00`)
- Animações fluidas com `Animated API`
- Efeito HUD com cantos estilo sci-fi no dashboard
- Cards com gradiente e pôsteres TMDB

---

## 🛠 Stack técnica

- **Expo SDK 52** + Expo Router v4
- **TypeScript** estrito
- **AsyncStorage** — persistência local
- **Supabase** — banco em nuvem (opcional)
- **TMDB API** — dados cinematográficos
- **Groq API** — LLM gratuito (llama-3.3-70b + llama-4-scout vision)
- **XLSX** — leitura de planilhas
- **expo-document-picker** + **expo-image-picker**

---

## 📂 Estrutura do projeto

```
sem-spoilers/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Início / Dashboard
│   │   ├── listas.tsx         # Catálogo com filtros
│   │   ├── assistente.tsx     # Chat IA
│   │   ├── descobrir.tsx      # TMDB trending + busca
│   │   └── configuracoes.tsx  # Configurações
│   ├── titulo/[id].tsx        # Detalhe do título
│   ├── editar/[id].tsx        # Edição manual
│   ├── buscar-tmdb.tsx        # Busca + adicionar
│   └── importar.tsx           # Importação de listas
├── lib/
│   ├── app-context.tsx        # Estado global
│   ├── storage.ts             # AsyncStorage
│   ├── supabase.ts            # Cliente Supabase
│   ├── tmdb.ts                # TMDB API
│   ├── groq.ts                # Groq AI + Vision
│   └── importacao.ts          # Importação de arquivos
├── constants/
│   └── cores.ts               # Paleta e gradientes
├── types/
│   └── index.ts               # TypeScript types
└── supabase/
    └── schema.sql             # Schema do banco
```

---

Feito com 💙🖤💛 por **AIra9 · Vagno Araújo**  
*"Cinema é a arte de fazer o tempo parar."*
