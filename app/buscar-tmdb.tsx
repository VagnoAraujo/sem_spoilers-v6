// app/buscar-tmdb.tsx — Busca no TMDB e adiciona à coleção

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Image, ActivityIndicator,
  Modal, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES, LABEL_TIPO } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import {
  buscarTMDB, detalharFilme, detalharSerie,
  converterFilme, converterSerie,
} from '@/lib/tmdb';
import { TMDBSearchResult, TipoTitulo, StatusUsuario } from '@/types';

const STATUS_OPCOES: { valor: StatusUsuario; label: string; cor: string }[] = [
  { valor: 'assistido',      label: '✅ Já assisti',       cor: CORES.corAssistido },
  { valor: 'assistindo',     label: '▶  Estou assistindo', cor: CORES.corAssistindo },
  { valor: 'quero_assistir', label: '🔖 Quero assistir',   cor: CORES.corQueroAssistir },
  { valor: 'abandonado',     label: '🚫 Abandonei',        cor: CORES.corAbandonado },
];

const IMG_W300 = 'https://image.tmdb.org/t/p/w300';

export default function BuscarTMDBScreen() {
  const router   = useRouter();
  const params   = useLocalSearchParams<{ tmdbId?: string; mediaType?: string }>();
  const { config, adicionarTitulo, titulos } = useApp();

  const [query,      setQuery]      = useState('');
  const [resultados, setResultados] = useState<TMDBSearchResult[]>([]);
  const [buscando,   setBuscando]   = useState(false);
  const [selecionado, setSelecionado] = useState<TMDBSearchResult | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [statusEscolhido, setStatusEscolhido] = useState<StatusUsuario | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const temTMDB  = !!config.tmdbApiKey;

  // Se veio de Descobrir com tmdbId, abre direto o modal
  React.useEffect(() => {
    if (params.tmdbId && params.mediaType) {
      const mock = { id: parseInt(params.tmdbId), media_type: params.mediaType } as TMDBSearchResult;
      abrirDetalhe(mock);
    }
  }, []);

  function onBusca(txt: string) {
    setQuery(txt);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!txt.trim()) { setResultados([]); return; }
    timerRef.current = setTimeout(async () => {
      setBuscando(true);
      const data = await buscarTMDB(txt);
      setResultados(data);
      setBuscando(false);
    }, 500);
  }

  async function abrirDetalhe(item: TMDBSearchResult) {
    setSelecionado(item);
    setStatusEscolhido(null);
    setModalVisivel(true);
    setCarregandoDetalhe(true);

    // Busca detalhes completos
    if (item.media_type === 'movie') {
      const detalhe = await detalharFilme(item.id);
      if (detalhe) setSelecionado({ ...item, ...detalhe as any });
    } else if (item.media_type === 'tv') {
      const detalhe = await detalharSerie(item.id);
      if (detalhe) setSelecionado({ ...item, ...detalhe as any });
    }
    setCarregandoDetalhe(false);
  }

  async function confirmarAdicao() {
    if (!selecionado || !statusEscolhido) return;
    setAdicionando(true);

    let dadosTitulo: any;
    if (selecionado.media_type === 'movie') {
      const detalhe = await detalharFilme(selecionado.id);
      dadosTitulo = detalhe ? converterFilme(detalhe) : {
        tmdb_id: selecionado.id,
        titulo:  selecionado.title ?? 'Sem título',
        tipo:    'filme' as TipoTitulo,
        generos: [], diretores: [], elenco: [], tags: [],
        tem_plot_twist: false, tem_continuacao: false,
      };
    } else {
      const detalhe = await detalharSerie(selecionado.id);
      dadosTitulo = detalhe ? converterSerie(detalhe) : {
        tmdb_id: selecionado.id,
        titulo:  selecionado.name ?? 'Sem título',
        tipo:    'serie' as TipoTitulo,
        generos: [], diretores: [], elenco: [], tags: [],
        tem_plot_twist: false, tem_continuacao: false,
      };
    }

    await adicionarTitulo({ ...dadosTitulo, status_usuario: statusEscolhido });
    setAdicionando(false);
    setModalVisivel(false);
    router.back();
  }

  function jaTemNaColecao(tmdbId: number) {
    return titulos.some((t) => t.tmdb_id === tmdbId);
  }

  return (
    <View style={estilos.container}>
      {/* ─── HEADER ─────────────────────────────── */}
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.btnVoltar}>
          <Ionicons name="arrow-back" size={22} color={CORES.textoPrimario} />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo}>Adicionar Título</Text>
      </View>

      {/* ─── BUSCA ──────────────────────────────── */}
      <View style={estilos.buscaContainer}>
        <Ionicons name="search-outline" size={18} color={CORES.textoSecundario} style={{ marginLeft: 14 }} />
        <TextInput
          style={estilos.buscaInput}
          placeholder="Nome do filme, série ou animação..."
          placeholderTextColor={CORES.textoFraco}
          value={query}
          onChangeText={onBusca}
          autoFocus
        />
        {buscando ? (
          <ActivityIndicator size="small" color={CORES.azulClaro} style={{ marginRight: 12 }} />
        ) : query.length > 0 ? (
          <TouchableOpacity onPress={() => { setQuery(''); setResultados([]); }} style={{ marginRight: 10 }}>
            <Ionicons name="close-circle" size={18} color={CORES.textoSecundario} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ─── SEM CHAVE ──────────────────────────── */}
      {!temTMDB && (
        <View style={estilos.aviso}>
          <Ionicons name="warning-outline" size={20} color={CORES.corQueroAssistir} />
          <Text style={estilos.avisoTxt}>Configure sua chave TMDB nas Configurações para buscar títulos automaticamente.</Text>
        </View>
      )}

      {/* ─── RESULTADOS ─────────────────────────── */}
      {resultados.length === 0 && !buscando && !query && (
        <View style={estilos.placeholder}>
          <Ionicons name="film-outline" size={56} color={CORES.textoFraco} />
          <Text style={estilos.placeholderTxt}>Digite o nome de um filme ou série</Text>
          <Text style={estilos.placeholderSub}>Os dados serão buscados automaticamente no TMDB</Text>
        </View>
      )}

      <FlatList
        data={resultados}
        keyExtractor={(i) => `${i.id}-${i.media_type}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const titulo = item.title ?? item.name ?? '—';
          const ano    = (item.release_date ?? item.first_air_date ?? '').slice(0, 4);
          const isSerie = item.media_type === 'tv';
          const jaTem  = jaTemNaColecao(item.id);

          return (
            <TouchableOpacity
              style={[estilos.resultCard, jaTem && estilos.resultCardJaTem]}
              onPress={() => abrirDetalhe(item)}
              activeOpacity={0.8}
            >
              {item.poster_path ? (
                <Image source={{ uri: `${IMG_W300}${item.poster_path}` }} style={estilos.resultPoster} />
              ) : (
                <View style={[estilos.resultPoster, estilos.resultPosterVazio]}>
                  <Ionicons name="film-outline" size={24} color={CORES.azulClaro} />
                </View>
              )}
              <View style={estilos.resultInfo}>
                <Text style={estilos.resultTitulo} numberOfLines={2}>{titulo}</Text>
                <View style={estilos.resultMeta}>
                  <View style={[estilos.tipoBadge, isSerie && { backgroundColor: CORES.corAssistindo + '22' }]}>
                    <Text style={[estilos.tipoTxt, isSerie && { color: CORES.corAssistindo }]}>
                      {isSerie ? '📺 Série' : '🎬 Filme'}
                    </Text>
                  </View>
                  {ano && <Text style={estilos.anoTxt}>{ano}</Text>}
                  {item.vote_average > 0 && (
                    <Text style={estilos.notaTxt}>⭐ {item.vote_average.toFixed(1)}</Text>
                  )}
                </View>
                <Text style={estilos.overviewTxt} numberOfLines={2}>{item.overview}</Text>
              </View>
              {jaTem ? (
                <View style={estilos.jaTem}>
                  <Ionicons name="checkmark-circle" size={22} color={CORES.corAssistido} />
                </View>
              ) : (
                <Ionicons name="add-circle-outline" size={22} color={CORES.azulClaro} />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* ─── MODAL DE DETALHE + STATUS ──────────── */}
      <Modal visible={modalVisivel} animationType="slide" transparent onRequestClose={() => setModalVisivel(false)}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContainer}>
            <TouchableOpacity style={estilos.modalFechar} onPress={() => setModalVisivel(false)}>
              <Ionicons name="close" size={22} color={CORES.textoPrimario} />
            </TouchableOpacity>

            {carregandoDetalhe ? (
              <View style={{ alignItems: 'center', padding: 40 }}>
                <ActivityIndicator size="large" color={CORES.azulClaro} />
                <Text style={{ color: CORES.textoSecundario, marginTop: 12 }}>Buscando informações...</Text>
              </View>
            ) : selecionado ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Preview do título */}
                <View style={estilos.modalHero}>
                  {selecionado.poster_path ? (
                    <Image source={{ uri: `${IMG_W300}${selecionado.poster_path}` }} style={estilos.modalPoster} />
                  ) : (
                    <View style={[estilos.modalPoster, estilos.resultPosterVazio]}>
                      <Ionicons name="film-outline" size={36} color={CORES.azulClaro} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.modalTitulo}>{selecionado.title ?? selecionado.name}</Text>
                    <Text style={estilos.modalMeta}>
                      {(selecionado as any).release_date?.slice(0, 4) ?? (selecionado as any).first_air_date?.slice(0, 4)}
                      {selecionado.vote_average > 0 ? `  ⭐ ${selecionado.vote_average.toFixed(1)}` : ''}
                    </Text>
                    {(selecionado as any).status && (
                      <Text style={{ fontSize: 11, color: CORES.textoSecundario, marginTop: 4 }}>
                        Status: {(selecionado as any).status}
                      </Text>
                    )}
                    {(selecionado as any).number_of_seasons && (
                      <Text style={{ fontSize: 11, color: CORES.textoSecundario }}>
                        {(selecionado as any).number_of_seasons} temporadas · {(selecionado as any).number_of_episodes} episódios
                      </Text>
                    )}
                    {(selecionado as any).belongs_to_collection && (
                      <Text style={{ fontSize: 11, color: CORES.azulClaro, marginTop: 4 }}>
                        ➕ Faz parte de: {(selecionado as any).belongs_to_collection.name}
                      </Text>
                    )}
                  </View>
                </View>

                {selecionado.overview ? (
                  <Text style={estilos.modalSinopse}>{selecionado.overview}</Text>
                ) : null}

                {/* Escolha de status */}
                <Text style={estilos.modalPergunta}>Como você quer adicionar?</Text>
                <View style={estilos.statusGrid}>
                  {STATUS_OPCOES.map((s) => (
                    <TouchableOpacity
                      key={s.valor}
                      style={[
                        estilos.statusOpcao,
                        statusEscolhido === s.valor && { backgroundColor: s.cor + '22', borderColor: s.cor },
                      ]}
                      onPress={() => setStatusEscolhido(s.valor)}
                    >
                      <Text style={[estilos.statusOpcaoTxt, statusEscolhido === s.valor && { color: s.cor }]}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Botão confirmar */}
                <TouchableOpacity
                  style={[estilos.btnConfirmar, !statusEscolhido && { opacity: 0.4 }]}
                  onPress={confirmarAdicao}
                  disabled={!statusEscolhido || adicionando}
                >
                  <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnConfirmarGrad}>
                    {adicionando ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={estilos.btnConfirmarTxt}>Adicionar à Coleção</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  container:      { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:         { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  btnVoltar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: CORES.fundoCard, alignItems: 'center', justifyContent: 'center' },
  headerTitulo:   { fontSize: 18, fontWeight: '800', color: CORES.textoPrimario },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: CORES.fundoCard, borderRadius: 12, borderWidth: 1, borderColor: CORES.borda, marginBottom: 12 },
  buscaInput:     { flex: 1, color: CORES.textoPrimario, paddingHorizontal: 10, paddingVertical: 12, fontSize: 15 },
  aviso:          { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 12, backgroundColor: CORES.corQueroAssistir + '11', borderRadius: 10, borderWidth: 1, borderColor: CORES.corQueroAssistir + '44' },
  avisoTxt:       { flex: 1, fontSize: 12, color: CORES.corQueroAssistir, lineHeight: 18 },
  placeholder:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  placeholderTxt: { fontSize: 16, color: CORES.textoSecundario, fontWeight: '600' },
  placeholderSub: { fontSize: 12, color: CORES.textoFraco, textAlign: 'center', paddingHorizontal: 32 },
  resultCard:     { flexDirection: 'row', backgroundColor: CORES.fundoCard, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: CORES.borda, alignItems: 'center', padding: 10, gap: 12 },
  resultCardJaTem:{ borderColor: CORES.corAssistido + '44', backgroundColor: CORES.corAssistido + '08' },
  resultPoster:   { width: 60, height: 90, borderRadius: 8, resizeMode: 'cover' },
  resultPosterVazio: { backgroundColor: CORES.fundoCardElevado, alignItems: 'center', justifyContent: 'center' },
  resultInfo:     { flex: 1 },
  resultTitulo:   { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario, marginBottom: 4 },
  resultMeta:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tipoBadge:      { backgroundColor: CORES.azulFundoSutil, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  tipoTxt:        { fontSize: 11, color: CORES.azulClaro, fontWeight: '600' },
  anoTxt:         { fontSize: 11, color: CORES.textoSecundario },
  notaTxt:        { fontSize: 11, color: CORES.douradoClaro },
  overviewTxt:    { fontSize: 11, color: CORES.textoFraco, lineHeight: 16 },
  jaTem:          { paddingRight: 4 },
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: CORES.fundoModal, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalFechar:    { alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, backgroundColor: CORES.fundoCard, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  modalHero:      { flexDirection: 'row', gap: 14, marginBottom: 12 },
  modalPoster:    { width: 90, height: 135, borderRadius: 10, resizeMode: 'cover' },
  modalTitulo:    { fontSize: 17, fontWeight: '800', color: CORES.textoPrimario, lineHeight: 22, flex: 1 },
  modalMeta:      { fontSize: 12, color: CORES.textoSecundario, marginTop: 4 },
  modalSinopse:   { fontSize: 13, color: CORES.textoSecundario, lineHeight: 20, marginBottom: 16 },
  modalPergunta:  { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario, marginBottom: 12 },
  statusGrid:     { gap: 8, marginBottom: 16 },
  statusOpcao:    { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CORES.borda, backgroundColor: CORES.fundoCard },
  statusOpcaoTxt: { fontSize: 14, color: CORES.textoPrimario },
  btnConfirmar:   { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  btnConfirmarGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  btnConfirmarTxt:  { fontSize: 16, fontWeight: '700', color: '#fff' },
});
