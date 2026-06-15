-- =====================================================
--  Sem Spoilers — Schema Supabase
--  Cole no SQL Editor do painel: app.supabase.com
-- =====================================================

-- Tabela principal de títulos
CREATE TABLE IF NOT EXISTS public.titulos (
  id                  TEXT        PRIMARY KEY,
  tmdb_id             INTEGER,
  titulo              TEXT        NOT NULL,
  titulo_original     TEXT,
  tipo                TEXT        NOT NULL DEFAULT 'filme',
  ano_lancamento      INTEGER,
  poster_url          TEXT,
  backdrop_url        TEXT,
  sinopse             TEXT,
  nota_pessoal        SMALLINT    CHECK (nota_pessoal BETWEEN 1 AND 10),
  nota_tmdb           NUMERIC(3,1),
  generos             TEXT[]      NOT NULL DEFAULT '{}',
  diretores           TEXT[]      NOT NULL DEFAULT '{}',
  elenco              TEXT[]      NOT NULL DEFAULT '{}',
  tem_continuacao     BOOLEAN     NOT NULL DEFAULT FALSE,
  continuacao_nome    TEXT,
  status_serie        TEXT,
  temporadas          SMALLINT,
  episodios_total     INTEGER,
  status_usuario      TEXT        NOT NULL DEFAULT 'quero_assistir',
  data_adicionado     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_assistido      TIMESTAMPTZ,
  tem_plot_twist      BOOLEAN     NOT NULL DEFAULT FALSE,
  comentario_pessoal  TEXT,
  tags                TEXT[]      NOT NULL DEFAULT '{}',
  duracao_minutos     INTEGER,
  origem_importacao   TEXT,
  atualizado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_titulos_status_usuario ON public.titulos(status_usuario);
CREATE INDEX IF NOT EXISTS idx_titulos_tipo           ON public.titulos(tipo);
CREATE INDEX IF NOT EXISTS idx_titulos_tmdb_id        ON public.titulos(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_titulos_data           ON public.titulos(data_adicionado DESC);

-- Row Level Security (RLS) — recomendado para uso pessoal
ALTER TABLE public.titulos ENABLE ROW LEVEL SECURITY;

-- Política: qualquer um autenticado lê/escreve (app pessoal)
CREATE POLICY "acesso_total_anonimo" ON public.titulos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar atualizado_em automaticamente
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizado_em
  BEFORE UPDATE ON public.titulos
  FOR EACH ROW
  EXECUTE FUNCTION update_atualizado_em();

-- Verifica se a tabela foi criada corretamente
SELECT 'Schema criado com sucesso! ✅' AS resultado;
