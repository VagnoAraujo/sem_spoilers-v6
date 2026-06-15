# Sem Spoilers

App Expo/React Native para organizar filmes, séries, animações e documentários sem spoilers, com listas pessoais, TMDB, assistente IA e importação de arquivos.

**Desenvolvido por AIra9 para cinéfilos.**

## O que o app faz

- Organiza títulos em listas: assistido, assistindo, quero assistir e abandonado.
- Busca pôster, ano, sinopse, elenco e diretores pelo TMDB.
- Permite cadastro manual quando o TMDB não encontra o título.
- Importa listas por arquivo TXT, CSV, XLS ou XLSX.
- Tenta ler prints/imagens com IA, usando Gemini ou Groq, quando uma chave válida está configurada.
- Salva dados localmente no celular com AsyncStorage.
- Pode sincronizar com Supabase, se configurado.

## Versão do projeto

- Expo SDK 54
- Expo Router 6
- React Native 0.81.5
- TypeScript

## Como rodar no PC e testar no Expo Go

```bash
git clone https://github.com/VagnoAraujo/sem_spoilers-v6.git
cd sem_spoilers-v6
npm install
npx expo start --clear
```

Depois, abra o Expo Go no celular e leia o QR Code.

## Formato certo para importar listas

Para evitar títulos quebrados, a importação confiável aceita somente:

- `.txt`
- `.csv`
- `.tsv`
- `.xls`
- `.xlsx`

PDF, DOC e DOCX não são recomendados no Expo Go. Eles podem chegar como texto binário e gerar nomes sem sentido, por isso foram removidos da importação local.

### Melhor modelo de planilha ou CSV

Use colunas com estes nomes:

```csv
Titulo;Diretor;Ano
Cidade de Deus;Fernando Meirelles;2002
Breaking Bad;Vince Gilligan;2008
A Viagem de Chihiro;Hayao Miyazaki;2001
```

Também funciona em Excel com as colunas:

```text
Titulo | Diretor | Ano
```

### Modelo simples para TXT

Um título por linha:

```text
Cidade de Deus
Breaking Bad
A Viagem de Chihiro
```

Ou com dados separados por ponto e vírgula:

```text
Cidade de Deus; Fernando Meirelles; 2002
Breaking Bad; Vince Gilligan; 2008
```

## Chaves de API

Configure dentro do próprio app, na aba de configurações.

| API | Link | Para que serve |
| --- | --- | --- |
| TMDB | https://www.themoviedb.org/settings/api | Buscar dados, pôsteres e detalhes dos títulos |
| Gemini | https://aistudio.google.com/app/apikey | Ler títulos em imagens/prints |
| Groq | https://console.groq.com/keys | Assistente IA e leitura alternativa de imagem |
| Supabase | https://app.supabase.com | Backup/sincronização opcional |

Se o Gemini mostrar erro 429, significa cota excedida. O app não deve travar; aguarde a cota voltar, use outra chave ou importe por TXT/CSV/XLSX.

## Observações importantes

- Para listas grandes, prefira Excel ou CSV.
- Se tiver diretores, coloque em uma coluna chamada `Diretor` ou `Diretores`.
- Se tiver ano, coloque em uma coluna chamada `Ano`.
- O TMDB ajuda a enriquecer os dados, mas a lista também pode ser salva manualmente.

## Estrutura principal

```text
app/                 Telas do aplicativo
app/importar.tsx     Tela de importação de listas
lib/importacao.ts    Leitura e limpeza dos arquivos importados
lib/tmdb.ts          Integração com TMDB
lib/gemini.ts        OCR com Gemini
lib/groq.ts          Assistente IA e OCR alternativo
lib/app-context.tsx  Estado global do app
types/index.ts       Tipos do projeto
```

## Descrição curta para o GitHub

App Expo/React Native para organizar filmes, séries e animações sem spoilers, com importação de listas, TMDB, IA e armazenamento local.
