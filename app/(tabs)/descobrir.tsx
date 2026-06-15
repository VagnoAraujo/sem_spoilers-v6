// app/(tabs)/descobrir.tsx — Descobrir + Meu Perfil Cinéfilo

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, Image, TextInput, ActivityIndicator, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import { buscarTMDB, buscarPopulares } from '@/lib/tmdb';
import { TMDBSearchResult } from '@/types';

const GENEROS_DESTAQUE = ['Suspense', 'Terror', 'Ficção científica', 'Drama', 'Mistério', 'Animação', 'Documentário'];

export default function DescrobirScreen() {
  const router = useRouter();
  const { config, titulos } = useApp();
  const [tendencias, setTendencias] = useState<TMDBSearchResult[]>([]);
  const [resultados, setResultados]   = useState<TMDBSearchResult[]>([]);
  const [busca, setBusca]             = useState('');
  const [buscando, setBuscando]       = useState(false);
  const [carregando, setCarregando]   = useState(false);
  const [modoAtivo, setModoAtivo]     = useState<'filmes' | 'series' | 'perfil'>('filmes');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const temTMDB  = !!config.tmdbApiKey;

  useEffect(() => {
    if (!temTMDB || modoAtivo === 'perfil') return;
    (async () => {
      setCarregando(true);
      const data = await buscarPopulares(modoAtivo === 'filmes' ? 'movie' : 'tv');
      setTendencias(data);
      setCarregando(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    })();
  }, [modoAtivo, temTMDB]);

  function onBusca(txt: string) {
    setBusca(txt);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!txt.trim()) { setResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      const data = await buscarTMDB(txt);
      setResultados(data);
      setBuscando(false);
    }, 600);
  }

  function jaTemNaColecao(tmdbId: number): boolean {
    return titulos.some((t) => t.tmdb_id === tmdbId);
  }

  const lista = busca.trim() ? resultados : tendencias;

  return (
    <View style={estilos.container}>
      <LinearGradient colors={GRADIENTES.headerAzul as any} style={estilos.header}>
        <Text style={estilos.headerTitulo}>
          {modoAtivo === 'perfil' ? 'Meu Perfil Cinéfilo' : 'Descobrir'}
        </Text>
        <Text style={estilos.headerSub}>
          {modoAtivo === 'perfil' ? `${titulos.length} títulos na coleção` : 'Explore e adicione à sua coleção'}
        </Text>

        {/* Barra de busca — oculta no perfil */}
        {modoAtivo !== 'perfil' && (
          <View style={estilos.buscaContainer}>
            <Ionicons name="search-outline" size={18} color={CORES.textoSecundario} />
            <TextInput
              style={estilos.buscaInput}
              placeholder="Buscar filmes, séries, animações..."
              placeholderTextColor={CORES.textoFraco}
              value={busca}
              onChangeText={onBusca}
            />
            {buscando && <ActivityIndicator size="small" color={CORES.azulClaro} />}
            {busca.length > 0 && !buscando && (
              <TouchableOpacity onPress={() => { setBusca(''); setResultados([]); }}>
                <Ionicons name="close-circle" size={18} color={CORES.textoSecundario} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Toggle filmes / séries / perfil */}
        {!busca.trim() && (
          <View style={estilos.toggle}>
            {([
              { k: 'filmes', l: '🎬 Filmes' },
              { k: 'series', l: '📺 Séries' },
              { k: 'perfil', l: '📊 Perfil' },
            ] as const).map((t) => (
              <TouchableOpacity
                key={t.k}
                style={[estilos.toggleBtn, modoAtivo === t.k && estilos.toggleBtnAtivo]}
                onPress={() => setModoAtivo(t.k)}
              >
                <Text style={[estilos.toggleTxt, modoAtivo === t.k && estilos.toggleTxtAtivo]}>
                  {t.l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </LinearGradient>

      {/* ─── ABA PERFIL ─────────────────────────────── */}
      {modoAtivo === 'perfil' ? (
        <PainelEstatisticas titulos={titulos} nomeUsuario={config.nomeUsuario} />
      ) : !temTMDB ? (
        <View style={estilos.semChave}>
          <Ionicons name="key-outline" size={48} color={CORES.textoFraco} />
          <Text style={estilos.semChaveTitulo}>Chave TMDB não configurada</Text>
          <Text style={estilos.semChaveSub}>
            Acesse themoviedb.org, crie uma conta gratuita e adicione sua chave nas Configurações.
          </Text>
          <TouchableOpacity style={estilos.btnConfig} onPress={() => router.push('/(tabs)/configuracoes')}>
            <Text style={{ color: CORES.azulClaro }}>Abrir Configurações</Text>
          </TouchableOpacity>
        </View>
      ) : carregando ? (
        <View style={estilos.carregando}>
          <ActivityIndicator size="large" color={CORES.azulClaro} />
          <Text style={{ color: CORES.textoSecundario, marginTop: 12 }}>Buscando tendências...</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={lista}
            keyExtractor={(i) => `${i.id}-${i.media_type}`}
            numColumns={2}
            contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
            columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              !busca.trim() ? (
                <View style={{ marginBottom: 4 }}>
                  <Text style={estilos.secaoLabel}>
                    {modoAtivo === 'filmes' ? '🔥 Filmes em Alta' : '🔥 Séries em Alta'}
                  </Text>
                </View>
              ) : resultados.length > 0 ? (
                <Text style={estilos.secaoLabel}>{resultados.length} resultados para "{busca}"</Text>
              ) : null
            }
            ListEmptyComponent={
              busca.trim() ? (
                <View style={estilos.semChave}>
                  <Text style={{ color: CORES.textoSecundario }}>Nenhum resultado para "{busca}"</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <CardDescobrir
                item={item}
                jaTem={jaTemNaColecao(item.id)}
                onPress={() => router.push({ pathname: '/buscar-tmdb', params: { tmdbId: item.id, mediaType: item.media_type } })}
              />
            )}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ─── Painel de Estatísticas ───────────────────────────────────────────────────

function PainelEstatisticas({ titulos, nomeUsuario }: { titulos: any[]; nomeUsuario: string }) {

  const stats = useMemo(() => {
    const assistidos   = titulos.filter(t => t.status_usuario === 'assistido');
    const querendo     = titulos.filter(t => t.status_usuario === 'quero_assistir');
    const assistindo   = titulos.filter(t => t.status_usuario === 'assistindo');
    const abandonados  = titulos.filter(t => t.status_usuario === 'abandonado');

    // Tempo total (usa duração se disponível, senão média por tipo)
    const MEDIA_MIN: Record<string, number> = {
      filme: 100, serie: 45, animacao: 25, minisserie: 40, documentario: 90,
      anime: 24, especial: 60, curta: 15,
    };
    const minutos = assistidos.reduce((acc, t) => {
      return acc + (t.duracao_minutos ?? MEDIA_MIN[t.tipo] ?? 90);
    }, 0);
    const horas = Math.floor(minutos / 60);
    const dias  = Math.floor(horas / 24);

    // Tipos
    const porTipo: Record<string, number> = {};
    titulos.forEach(t => { porTipo[t.tipo] = (porTipo[t.tipo] ?? 0) + 1; });
    const tiposOrdenados = Object.entries(porTipo).sort((a, b) => b[1] - a[1]);

    // Nota média
    const comNota = assistidos.filter(t => t.nota_pessoal);
    const notaMedia = comNota.length
      ? (comNota.reduce((a, t) => a + t.nota_pessoal, 0) / comNota.length).toFixed(1)
      : null;

    // Review emocional
    const emoções: Record<string, number> = {};
    titulos.forEach(t => { if (t.nota_emocional) emoções[t.nota_emocional] = (emoções[t.nota_emocional] ?? 0) + 1; });

    // Top 5 bem avaliados
    const top5 = [...assistidos]
      .filter(t => t.nota_pessoal)
      .sort((a, b) => b.nota_pessoal - a.nota_pessoal)
      .slice(0, 5);

    // Gênero favorito (campo generos array)
    const generoCount: Record<string, number> = {};
    titulos.forEach(t => {
      (t.generos ?? []).forEach((g: string) => {
        generoCount[g] = (generoCount[g] ?? 0) + 1;
      });
    });
    const generoFav = Object.entries(generoCount).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return {
      total: titulos.length, assistidos: assistidos.length,
      querendo: querendo.length, assistindo: assistindo.length,
      abandonados: abandonados.length, minutos, horas, dias,
      tiposOrdenados, notaMedia, emoções, top5, generoFav,
    };
  }, [titulos]);

  const EMOJI_TIPO: Record<string, string> = {
    filme: '🎬', serie: '📺', animacao: '🎨', minisserie: '📖',
    documentario: '🎙️', anime: '⛩️', especial: '⭐', curta: '⚡',
  };

  const EMOJI_EMOCAO: Record<string, string> = {
    amei: '😍', gostei: '😊', ok: '😐', nao_gostei: '😕', odiei: '😤',
  };

  const LABEL_EMOCAO: Record<string, string> = {
    amei: 'Amei', gostei: 'Gostei', ok: 'Ok', nao_gostei: 'Não gostei', odiei: 'Odiei',
  };

  if (titulos.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 48 }}>🍿</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: CORES.textoPrimario, textAlign: 'center' }}>
          Sua coleção está vazia
        </Text>
        <Text style={{ fontSize: 13, color: CORES.textoSecundario, textAlign: 'center' }}>
          Adicione filmes e séries para ver suas estatísticas aqui!
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

      {/* ── Saudação ── */}
      <Text style={pe.saudacao}>Olá, {nomeUsuario}! 👋</Text>
      <Text style={pe.saudacaoSub}>Aqui está o seu perfil cinéfilo</Text>

      {/* ── Cards de status ── */}
      <View style={pe.statusGrid}>
        {[
          { v: stats.assistidos,  l: 'Assistidos',    cor: CORES.corAssistido,   ic: 'checkmark-circle' },
          { v: stats.querendo,    l: 'Quero ver',      cor: CORES.azulClaro,      ic: 'bookmark' },
          { v: stats.assistindo,  l: 'Assistindo',     cor: CORES.douradoPrimario,ic: 'play-circle' },
          { v: stats.abandonados, l: 'Abandonados',    cor: CORES.corAbandonado,  ic: 'close-circle' },
        ].map(s => (
          <View key={s.l} style={[pe.statusCard, { borderTopColor: s.cor, borderTopWidth: 3 }]}>
            <Ionicons name={s.ic as any} size={22} color={s.cor} />
            <Text style={[pe.statusValor, { color: s.cor }]}>{s.v}</Text>
            <Text style={pe.statusLabel}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* ── Tempo total ── */}
      {stats.horas > 0 && (
        <View style={pe.bloco}>
          <Text style={pe.blocoTitulo}>⏱️ Tempo na tela</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <View style={pe.tempoCard}>
              <Text style={pe.tempoValor}>{stats.horas}</Text>
              <Text style={pe.tempoLabel}>horas</Text>
            </View>
            {stats.dias > 0 && (
              <View style={pe.tempoCard}>
                <Text style={pe.tempoValor}>{stats.dias}</Text>
                <Text style={pe.tempoLabel}>dias inteiros</Text>
              </View>
            )}
            <View style={[pe.tempoCard, { flex: 2, alignItems: 'flex-start' }]}>
              <Text style={{ fontSize: 12, color: CORES.textoSecundario, lineHeight: 18 }}>
                {stats.dias >= 7
                  ? `Você passou mais de ${Math.floor(stats.dias / 7)} semana${Math.floor(stats.dias / 7) > 1 ? 's' : ''} assistindo! 🎉`
                  : stats.horas >= 24
                  ? 'Você passou pelo menos 1 dia assistindo! 🍿'
                  : 'Continue assistindo para mais estatísticas!'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Nota média ── */}
      {stats.notaMedia && (
        <View style={pe.bloco}>
          <Text style={pe.blocoTitulo}>⭐ Sua nota média</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
            <Text style={pe.notaGrande}>{stats.notaMedia}</Text>
            <View>
              <Text style={{ color: CORES.textoSecundario, fontSize: 13 }}>
                baseado em {titulos.filter(t => t.nota_pessoal).length} avaliações
              </Text>
              <Text style={{ color: CORES.textoFraco, fontSize: 12, marginTop: 2 }}>
                {Number(stats.notaMedia) >= 8 ? '🎯 Você é criterioso!' :
                 Number(stats.notaMedia) >= 6 ? '👍 Gosto equilibrado' :
                 '🎲 Você curte experimentar'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Reações emocionais ── */}
      {Object.keys(stats.emoções).length > 0 && (
        <View style={pe.bloco}>
          <Text style={pe.blocoTitulo}>😍 Como você se sentiu</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {Object.entries(stats.emoções).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <View key={k} style={pe.emocaoChip}>
                <Text style={{ fontSize: 18 }}>{EMOJI_EMOCAO[k]}</Text>
                <Text style={{ color: CORES.textoSecundario, fontSize: 13, fontWeight: '600' }}>
                  {LABEL_EMOCAO[k]}
                </Text>
                <View style={pe.emocaoBadge}><Text style={pe.emocaoBadgeTxt}>{v}</Text></View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Distribuição por tipo ── */}
      <View style={pe.bloco}>
        <Text style={pe.blocoTitulo}>🎭 Sua coleção por tipo</Text>
        {stats.tiposOrdenados.map(([tipo, qtd]) => {
          const pct = Math.round((qtd / stats.total) * 100);
          return (
            <View key={tipo} style={pe.barraRow}>
              <Text style={pe.barraTipo}>{EMOJI_TIPO[tipo] ?? '📽️'} {tipo.charAt(0).toUpperCase() + tipo.slice(1)}</Text>
              <View style={pe.barraFundo}>
                <View style={[pe.barraFill, { width: `${pct}%` as any, backgroundColor: CORES.azulPrimario }]} />
              </View>
              <Text style={pe.barraQtd}>{qtd}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Gêneros favoritos ── */}
      {stats.generoFav.length > 0 && (
        <View style={pe.bloco}>
          <Text style={pe.blocoTitulo}>🎯 Gêneros que você mais curte</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {stats.generoFav.map(([g, qtd], i) => (
              <View key={g} style={[pe.generoChip, i === 0 && { backgroundColor: CORES.azulPrimario }]}>
                <Text style={[pe.generoChipTxt, i === 0 && { color: '#fff' }]}>
                  {i === 0 ? '🏆 ' : ''}{g} ({qtd})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Top 5 avaliados ── */}
      {stats.top5.length > 0 && (
        <View style={pe.bloco}>
          <Text style={pe.blocoTitulo}>🏆 Seus favoritos</Text>
          {stats.top5.map((t, i) => (
            <View key={t.id} style={pe.topRow}>
              <Text style={pe.topPos}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={pe.topNome} numberOfLines={1}>{t.titulo}</Text>
                <Text style={pe.topTipo}>{EMOJI_TIPO[t.tipo] ?? '📽️'} {t.ano}</Text>
              </View>
              <View style={pe.topNota}>
                <Text style={pe.topNotaTxt}>{t.nota_pessoal}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

// ─── CardDescobrir ────────────────────────────────────────────────────────────

function CardDescobrir({ item, jaTem, onPress }: { item: TMDBSearchResult; jaTem: boolean; onPress: () => void }) {
  const IMG = 'https://image.tmdb.org/t/p/w300';
  const titulo = item.title ?? item.name ?? '—';
  const ano    = (item.release_date ?? item.first_air_date ?? '').slice(0, 4);
  const nota   = item.vote_average.toFixed(1);

  return (
    <TouchableOpacity style={estilos.card} onPress={onPress} activeOpacity={0.85}>
      {item.poster_path ? (
        <Image source={{ uri: `${IMG}${item.poster_path}` }} style={estilos.cardImg} />
      ) : (
        <View style={[estilos.cardImg, estilos.cardImgVazio]}>
          <Ionicons name="film-outline" size={36} color={CORES.azulClaro} />
        </View>
      )}
      <LinearGradient colors={GRADIENTES.card as any} style={estilos.cardGrad}>
        <Text style={estilos.cardTitulo} numberOfLines={2}>{titulo}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={estilos.cardAno}>{ano}</Text>
          <View style={estilos.notaBadge}>
            <Text style={estilos.notaTxt}>⭐ {nota}</Text>
          </View>
        </View>
      </LinearGradient>
      {jaTem && (
        <View style={estilos.badgeColecao}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const estilos = StyleSheet.create({
  container:    { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:       { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  headerTitulo: { fontSize: 26, fontWeight: '800', color: CORES.textoPrimario },
  headerSub:    { fontSize: 12, color: CORES.textoSecundario, marginTop: -8 },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.fundoPrincipal + 'CC', borderRadius: 12, paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: CORES.borda },
  buscaInput:   { flex: 1, color: CORES.textoPrimario, paddingVertical: 12, fontSize: 14 },
  toggle:       { flexDirection: 'row', backgroundColor: CORES.fundoPrincipal, borderRadius: 10, padding: 4, gap: 4 },
  toggleBtn:    { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  toggleBtnAtivo:{ backgroundColor: CORES.azulPrimario },
  toggleTxt:    { fontSize: 12, color: CORES.textoSecundario, fontWeight: '600' },
  toggleTxtAtivo:{ color: '#fff' },
  semChave:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  semChaveTitulo: { fontSize: 18, fontWeight: '700', color: CORES.textoPrimario, textAlign: 'center' },
  semChaveSub:  { fontSize: 13, color: CORES.textoSecundario, textAlign: 'center', lineHeight: 20 },
  btnConfig:    { marginTop: 8 },
  carregando:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  secaoLabel:   { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario, marginBottom: 12 },
  card:         { flex: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: CORES.fundoCard },
  cardImg:      { width: '100%', aspectRatio: 0.67, resizeMode: 'cover' },
  cardImgVazio: { alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.fundoCardElevado },
  cardGrad:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 10 },
  cardTitulo:   { fontSize: 12, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardAno:      { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  notaBadge:    { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  notaTxt:      { fontSize: 10, color: '#fff' },
  badgeColecao: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: CORES.corAssistido, alignItems: 'center', justifyContent: 'center' },
});

const pe = StyleSheet.create({
  saudacao:     { fontSize: 20, fontWeight: '800', color: CORES.textoPrimario, marginBottom: 2 },
  saudacaoSub:  { fontSize: 13, color: CORES.textoSecundario, marginBottom: 16 },
  bloco:        { backgroundColor: CORES.fundoCard, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: CORES.borda },
  blocoTitulo:  { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario },
  statusGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusCard:   { flex: 1, minWidth: '45%', backgroundColor: CORES.fundoCard, borderRadius: 12, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: CORES.borda },
  statusValor:  { fontSize: 26, fontWeight: '900' },
  statusLabel:  { fontSize: 11, color: CORES.textoSecundario, fontWeight: '600' },
  tempoCard:    { flex: 1, backgroundColor: CORES.fundoCardElevado, borderRadius: 10, padding: 12, alignItems: 'center' },
  tempoValor:   { fontSize: 24, fontWeight: '800', color: CORES.azulClaro },
  tempoLabel:   { fontSize: 10, color: CORES.textoFraco, marginTop: 2 },
  notaGrande:   { fontSize: 52, fontWeight: '900', color: CORES.douradoPrimario },
  emocaoChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CORES.fundoCardElevado, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: CORES.borda },
  emocaoBadge:  { backgroundColor: CORES.azulPrimario, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  emocaoBadgeTxt:{ fontSize: 11, color: '#fff', fontWeight: '700' },
  barraRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  barraTipo:    { width: 110, fontSize: 12, color: CORES.textoSecundario },
  barraFundo:   { flex: 1, height: 6, backgroundColor: CORES.fundoCardElevado, borderRadius: 3 },
  barraFill:    { height: 6, borderRadius: 3 },
  barraQtd:     { width: 24, fontSize: 12, color: CORES.textoFraco, textAlign: 'right' },
  generoChip:   { backgroundColor: CORES.fundoCardElevado, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: CORES.borda },
  generoChipTxt:{ fontSize: 13, color: CORES.textoSecundario, fontWeight: '600' },
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: CORES.borda },
  topPos:       { fontSize: 16, fontWeight: '900', color: CORES.textoFraco, width: 28 },
  topNome:      { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario },
  topTipo:      { fontSize: 11, color: CORES.textoFraco, marginTop: 2 },
  topNota:      { width: 36, height: 36, borderRadius: 18, backgroundColor: CORES.douradoPrimario, alignItems: 'center', justifyContent: 'center' },
  topNotaTxt:   { fontSize: 14, fontWeight: '900', color: '#000' },
});
