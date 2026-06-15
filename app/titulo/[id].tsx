// app/titulo/[id].tsx — Tela de detalhe do título

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Animated, Dimensions, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { CORES, GRADIENTES, COR_STATUS, LABEL_STATUS, INFO_STATUS_SERIE, LABEL_TIPO } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import { StatusUsuario } from '@/types';
import { buscarStreaming, StreamingProvider } from '@/lib/tmdb';

const { width, height } = Dimensions.get('window');
const STATUS_LIST: { valor: StatusUsuario; label: string }[] = [
  { valor: 'assistido',      label: '✅ Assistido' },
  { valor: 'assistindo',     label: '▶ Assistindo' },
  { valor: 'quero_assistir', label: '🔖 Quero Assistir' },
  { valor: 'abandonado',     label: '🚫 Abandonado' },
];

export default function TituloDetalheScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const { titulos, atualizarTitulo, removerTitulo } = useApp();
  const titulo   = titulos.find((t) => t.id === id);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim= useRef(new Animated.Value(40)).current;
  const [statusAberto, setStatusAberto] = useState(false);
  const [streamings, setStreamings]     = useState<StreamingProvider[]>([]);
  const { config } = useApp();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9,   useNativeDriver: true }),
    ]).start();
  }, []);

  // Busca onde está disponível (só se tiver chave TMDB e tmdb_id)
  useEffect(() => {
    if (!titulo?.tmdb_id || !config.tmdbApiKey) return;
    const tipoTMDB = ['serie','animacao','anime','minisserie'].includes(titulo.tipo) ? 'tv' : 'movie';
    buscarStreaming(titulo.tmdb_id, tipoTMDB, config.tmdbApiKey)
      .then(setStreamings)
      .catch(() => {});
  }, [titulo?.tmdb_id]);

  if (!titulo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.fundoPrincipal }}>
        <Text style={{ color: CORES.textoPrimario }}>Título não encontrado.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: CORES.azulClaro, marginTop: 12 }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const corStatus = COR_STATUS[titulo.status_usuario];
  const infoSerie = titulo.status_serie ? INFO_STATUS_SERIE[titulo.status_serie] : null;

  function confirmarRemocao() {
    Alert.alert(
      'Remover título',
      `Remover "${titulo!.titulo}" da sua coleção?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: async () => { await removerTitulo(titulo!.id); router.back(); } },
      ]
    );
  }

  async function mudarStatus(novoStatus: StatusUsuario) {
    await atualizarTitulo(titulo!.id, { status_usuario: novoStatus });
    setStatusAberto(false);
  }

  async function togglePlotTwist() {
    await atualizarTitulo(titulo!.id, { tem_plot_twist: !titulo!.tem_plot_twist });
  }

  return (
    <View style={estilos.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ─── BACKDROP ───────────────────────── */}
        <View style={estilos.backdropContainer}>
          {titulo.backdrop_url ? (
            <Image source={{ uri: titulo.backdrop_url }} style={estilos.backdrop} />
          ) : titulo.poster_url ? (
            <Image source={{ uri: titulo.poster_url }} style={[estilos.backdrop, { opacity: 0.3 }]} />
          ) : (
            <View style={[estilos.backdrop, { backgroundColor: CORES.fundoCardElevado }]} />
          )}
          <LinearGradient
            colors={['rgba(8,9,16,0)', 'rgba(8,9,16,0.5)', '#080910'] as any}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* ─── BOTÃO VOLTAR ───────────────────── */}
        <TouchableOpacity style={estilos.btnVoltar} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        {/* ─── CONTEÚDO PRINCIPAL ─────────────── */}
        <Animated.View style={[estilos.conteudo, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {/* Poster + infos */}
          <View style={estilos.heroRow}>
            {titulo.poster_url ? (
              <Image source={{ uri: titulo.poster_url }} style={estilos.poster} />
            ) : (
              <View style={[estilos.poster, estilos.posterVazio]}>
                <FontAwesome5 name="film" size={40} color={CORES.azulClaro} />
              </View>
            )}
            <View style={estilos.heroInfo}>
              <Text style={estilos.tituloTxt}>{titulo.titulo}</Text>
              {titulo.titulo_original && titulo.titulo_original !== titulo.titulo && (
                <Text style={estilos.tituloOriginal}>{titulo.titulo_original}</Text>
              )}
              <Text style={estilos.tipoTxt}>{LABEL_TIPO[titulo.tipo]} · {titulo.ano_lancamento ?? '—'}</Text>
              {titulo.nota_tmdb && (
                <View style={estilos.notaRow}>
                  <Text style={estilos.notaTxt}>⭐ {titulo.nota_tmdb.toFixed(1)}</Text>
                  <Text style={estilos.notaSub}>TMDB</Text>
                </View>
              )}
              {titulo.duracao_minutos && titulo.tipo === 'filme' && (
                <Text style={estilos.metaTxt}>⏱ {titulo.duracao_minutos} min</Text>
              )}
              {titulo.temporadas && (
                <Text style={estilos.metaTxt}>📺 {titulo.temporadas} temp. · {titulo.episodios_total} ep.</Text>
              )}
            </View>
          </View>

          {/* Status badges */}
          <View style={estilos.badgesRow}>
            <View style={[estilos.statusBadge, { backgroundColor: corStatus + '22', borderColor: corStatus }]}>
              <View style={[estilos.statusDot, { backgroundColor: corStatus }]} />
              <Text style={[estilos.statusTxt, { color: corStatus }]}>{LABEL_STATUS[titulo.status_usuario]}</Text>
            </View>
            {infoSerie && (
              <View style={[estilos.statusBadge, { backgroundColor: infoSerie.cor + '22', borderColor: infoSerie.cor }]}>
                <Text style={[estilos.statusTxt, { color: infoSerie.cor }]}>{infoSerie.label}</Text>
              </View>
            )}
            {titulo.tem_continuacao && (
              <View style={[estilos.statusBadge, { backgroundColor: CORES.azulFundo, borderColor: CORES.azulClaro }]}>
                <Text style={[estilos.statusTxt, { color: CORES.azulClaro }]}>➕ Tem Continuação</Text>
              </View>
            )}
            {titulo.tem_plot_twist && (
              <View style={[estilos.statusBadge, { backgroundColor: CORES.azulFundo, borderColor: CORES.azulClaro }]}>
                <Text style={[estilos.statusTxt, { color: CORES.azulClaro }]}>🌀 Plot Twist</Text>
              </View>
            )}
          </View>

          {/* Botão mudar status */}
          <TouchableOpacity
            style={[estilos.btnStatus, { borderColor: corStatus }]}
            onPress={() => setStatusAberto(!statusAberto)}
          >
            <Text style={[estilos.btnStatusTxt, { color: corStatus }]}>
              Mudar status ▾
            </Text>
          </TouchableOpacity>

          {statusAberto && (
            <View style={estilos.statusDropdown}>
              {STATUS_LIST.map((s) => (
                <TouchableOpacity
                  key={s.valor}
                  style={[estilos.statusOpcao, titulo.status_usuario === s.valor && { backgroundColor: COR_STATUS[s.valor] + '22' }]}
                  onPress={() => mudarStatus(s.valor)}
                >
                  <Text style={[estilos.statusOpcaoTxt, titulo.status_usuario === s.valor && { color: COR_STATUS[s.valor] }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Sinopse */}
          {titulo.sinopse && (
            <View style={estilos.bloco}>
              <Text style={estilos.blocoTitulo}>Sinopse</Text>
              <Text style={estilos.sinopse}>{titulo.sinopse}</Text>
            </View>
          )}

          {/* Continuação */}
          {titulo.tem_continuacao && titulo.continuacao_nome && (
            <View style={[estilos.bloco, { backgroundColor: CORES.azulFundoSutil, borderColor: CORES.azulPrimario + '40' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="arrow-forward-circle" size={18} color={CORES.azulClaro} />
                <Text style={[estilos.blocoTitulo, { color: CORES.azulClaro }]}>Faz parte de</Text>
              </View>
              <Text style={estilos.continuacaoNome}>{titulo.continuacao_nome}</Text>
            </View>
          )}

          {/* Gêneros */}
          {titulo.generos.length > 0 && (
            <View style={estilos.bloco}>
              <Text style={estilos.blocoTitulo}>Gêneros</Text>
              <View style={estilos.chipsRow}>
                {titulo.generos.map((g) => (
                  <View key={g} style={estilos.chip}><Text style={estilos.chipTxt}>{g}</Text></View>
                ))}
              </View>
            </View>
          )}

          {/* Diretores */}
          {titulo.diretores.length > 0 && (
            <View style={estilos.bloco}>
              <Text style={estilos.blocoTitulo}>Diretor{titulo.diretores.length > 1 ? 'es' : ''}</Text>
              {titulo.diretores.map((d) => (
                <Text key={d} style={estilos.nomeTxt}>🎬 {d}</Text>
              ))}
            </View>
          )}

          {/* Elenco */}
          {titulo.elenco.length > 0 && (
            <View style={estilos.bloco}>
              <Text style={estilos.blocoTitulo}>Elenco principal</Text>
              <Text style={estilos.elencoTxt}>{titulo.elenco.slice(0, 6).join(' · ')}</Text>
            </View>
          )}

          {/* Progresso (séries em andamento) */}
          {['serie','animacao','minisserie'].includes(titulo.tipo) && titulo.status_usuario === 'assistindo' && (
            <View style={estilos.bloco}>
              <Text style={estilos.blocoTitulo}>📺 Progresso</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
                <View style={estilos.progressoCard}>
                  <Text style={estilos.progressoValor}>{titulo.temporada_atual ?? '–'}</Text>
                  <Text style={estilos.progressoLabel}>Temporada</Text>
                </View>
                <View style={estilos.progressoCard}>
                  <Text style={estilos.progressoValor}>{titulo.episodio_atual ?? '–'}</Text>
                  <Text style={estilos.progressoLabel}>Episódio</Text>
                </View>
                {titulo.episodios_total && titulo.episodio_atual ? (
                  <View style={[estilos.progressoCard, { flex: 2 }]}>
                    <Text style={estilos.progressoValor}>
                      {Math.round((titulo.episodio_atual / titulo.episodios_total) * 100)}%
                    </Text>
                    <View style={estilos.barraFundo}>
                      <View style={[estilos.barraPreenchida, {
                        width: `${Math.min(100, Math.round((titulo.episodio_atual / titulo.episodios_total) * 100))}%` as any
                      }]} />
                    </View>
                  </View>
                ) : null}
              </View>
              <TouchableOpacity
                style={estilos.btnAtualizarEp}
                onPress={() => router.push(`/editar/${titulo.id}`)}
              >
                <Ionicons name="pencil-outline" size={14} color={CORES.azulClaro} />
                <Text style={{ fontSize: 12, color: CORES.azulClaro }}>Atualizar episódio</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Onde assistir (streaming) */}
          {streamings.length > 0 && (
            <View style={estilos.bloco}>
              <Text style={estilos.blocoTitulo}>▶️ Disponível em</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {streamings.map((s) => (
                  <View key={s.provider_id} style={estilos.streamingChip}>
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w45${s.logo_path}` }}
                      style={{ width: 24, height: 24, borderRadius: 5 }}
                    />
                    <Text style={estilos.streamingNome}>{s.provider_name}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 11, color: CORES.textoFraco, marginTop: 8 }}>
                Disponibilidade para o Brasil via TMDB
              </Text>
            </View>
          )}

          {/* Minha Nota + Review emocional */}
          <View style={estilos.bloco}>
            <Text style={estilos.blocoTitulo}>Minha Nota</Text>
            {/* Reação emocional */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {([
                { v: 'amei', l: '😍' }, { v: 'gostei', l: '😊' }, { v: 'ok', l: '😐' },
                { v: 'nao_gostei', l: '😕' }, { v: 'odiei', l: '😤' },
              ] as const).map((r) => (
                <TouchableOpacity
                  key={r.v}
                  style={[estilos.emojiBtn, titulo.nota_emocional === r.v && estilos.emojiBtnAtivo]}
                  onPress={() => atualizarTitulo(titulo.id, {
                    nota_emocional: titulo.nota_emocional === r.v ? undefined : r.v,
                    data_review: new Date().toISOString(),
                  })}
                >
                  <Text style={{ fontSize: 22 }}>{r.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Nota numérica */}
            <View style={estilos.notasRow}>
              {[...Array(10)].map((_, i) => {
                const nota = i + 1;
                const ativo = titulo.nota_pessoal === nota;
                return (
                  <TouchableOpacity
                    key={nota}
                    style={[estilos.notaBtn, ativo && { backgroundColor: CORES.douradoPrimario }]}
                    onPress={() => atualizarTitulo(titulo.id, { nota_pessoal: ativo ? undefined : nota })}
                  >
                    <Text style={[estilos.notaBtnTxt, ativo && { color: '#000' }]}>{nota}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {titulo.comentario_pessoal ? (
              <Text style={{ fontSize: 13, color: CORES.textoSecundario, marginTop: 10, fontStyle: 'italic', lineHeight: 19 }}>
                "{titulo.comentario_pessoal}"
              </Text>
            ) : null}
          </View>

          {/* Toggle Plot Twist */}
          <TouchableOpacity style={estilos.togglePlotTwist} onPress={togglePlotTwist}>
            <Text style={estilos.togglePTLabel}>🌀 Tem Plot Twist</Text>
            <View style={[estilos.toggle, titulo.tem_plot_twist && estilos.toggleAtivo]}>
              <View style={[estilos.toggleDot, titulo.tem_plot_twist && estilos.toggleDotAtivo]} />
            </View>
          </TouchableOpacity>

          {/* Ações */}
          <View style={estilos.acoesRow}>
            <TouchableOpacity style={estilos.btnEditar} onPress={() => router.push(`/editar/${titulo.id}`)}>
              <Ionicons name="pencil-outline" size={18} color={CORES.douradoPrimario} />
              <Text style={[estilos.btnAcaoTxt, { color: CORES.douradoPrimario }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnRemover} onPress={confirmarRemocao}>
              <Ionicons name="trash-outline" size={18} color={CORES.corAbandonado} />
              <Text style={[estilos.btnAcaoTxt, { color: CORES.corAbandonado }]}>Remover</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  container:       { flex: 1, backgroundColor: CORES.fundoPrincipal },
  backdropContainer: { height: height * 0.32, marginTop: 0 },
  backdrop:        { width: '100%', height: '100%', resizeMode: 'cover' },
  btnVoltar:       { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  conteudo:        { marginTop: -48, paddingHorizontal: 16 },
  heroRow:         { flexDirection: 'row', gap: 16, marginBottom: 16 },
  poster:          { width: 110, height: 165, borderRadius: 10, resizeMode: 'cover', borderWidth: 2, borderColor: CORES.borda },
  posterVazio:     { backgroundColor: CORES.fundoCardElevado, alignItems: 'center', justifyContent: 'center' },
  heroInfo:        { flex: 1, paddingTop: 8, gap: 4 },
  tituloTxt:       { fontSize: 20, fontWeight: '800', color: CORES.textoPrimario, lineHeight: 24 },
  tituloOriginal:  { fontSize: 12, color: CORES.textoSecundario, fontStyle: 'italic' },
  tipoTxt:         { fontSize: 12, color: CORES.azulClaro },
  notaRow:         { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  notaTxt:         { fontSize: 16, fontWeight: '800', color: CORES.douradoClaro },
  notaSub:         { fontSize: 10, color: CORES.textoSecundario },
  metaTxt:         { fontSize: 12, color: CORES.textoSecundario },
  badgesRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, gap: 5 },
  statusDot:       { width: 6, height: 6, borderRadius: 3 },
  statusTxt:       { fontSize: 11, fontWeight: '700' },
  btnStatus:       { borderRadius: 10, borderWidth: 1, padding: 12, alignItems: 'center', marginBottom: 4 },
  btnStatusTxt:    { fontSize: 14, fontWeight: '700' },
  statusDropdown:  { backgroundColor: CORES.fundoCard, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: CORES.borda, marginBottom: 12 },
  statusOpcao:     { padding: 14, borderBottomWidth: 1, borderBottomColor: CORES.borda },
  statusOpcaoTxt:  { fontSize: 14, color: CORES.textoPrimario },
  bloco:           { backgroundColor: CORES.fundoCard, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: CORES.borda },
  blocoTitulo:     { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  sinopse:         { fontSize: 14, color: CORES.textoPrimario, lineHeight: 22 },
  continuacaoNome: { fontSize: 14, color: CORES.textoPrimario, fontWeight: '600', marginTop: 4 },
  chipsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:            { backgroundColor: CORES.azulFundoSutil, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: CORES.azulPrimario + '40' },
  chipTxt:         { fontSize: 12, color: CORES.azulClaro },
  nomeTxt:         { fontSize: 14, color: CORES.textoPrimario, marginBottom: 4 },
  elencoTxt:       { fontSize: 13, color: CORES.textoSecundario, lineHeight: 20 },
  notasRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  notaBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: CORES.fundoCardElevado, borderWidth: 1, borderColor: CORES.borda, alignItems: 'center', justifyContent: 'center' },
  notaBtnTxt:      { fontSize: 13, fontWeight: '700', color: CORES.textoSecundario },
  progressoCard:   { flex: 1, backgroundColor: CORES.fundoCardElevado, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: CORES.borda },
  progressoValor:  { fontSize: 22, fontWeight: '800', color: CORES.azulClaro },
  progressoLabel:  { fontSize: 10, color: CORES.textoFraco, marginTop: 2 },
  barraFundo:      { width: '100%', height: 4, backgroundColor: CORES.borda, borderRadius: 2, marginTop: 6 },
  barraPreenchida: { height: 4, backgroundColor: CORES.azulClaro, borderRadius: 2 },
  streamingChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CORES.fundoCardElevado, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 8, borderWidth: 1, borderColor: CORES.borda },
  streamingNome:   { fontSize: 12, color: CORES.textoSecundario, fontWeight: '600' },
  btnAtualizarEp:  { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  emojiBtn:        { width: 48, height: 48, borderRadius: 24, backgroundColor: CORES.fundoCardElevado, borderWidth: 1, borderColor: CORES.borda, alignItems: 'center', justifyContent: 'center' },
  emojiBtnAtivo:   { borderColor: CORES.douradoPrimario, backgroundColor: CORES.douradoPrimario + '22' },
  togglePlotTwist: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CORES.fundoCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: CORES.borda, marginBottom: 10 },
  togglePTLabel:   { fontSize: 14, color: CORES.textoPrimario },
  toggle:          { width: 46, height: 26, borderRadius: 13, backgroundColor: CORES.borda, padding: 3 },
  toggleAtivo:     { backgroundColor: CORES.azulPrimario },
  toggleDot:       { width: 20, height: 20, borderRadius: 10, backgroundColor: CORES.textoSecundario },
  toggleDotAtivo:  { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  acoesRow:        { flexDirection: 'row', gap: 12, marginTop: 8 },
  btnEditar:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CORES.douradoPrimario + '60', backgroundColor: CORES.douradoFundoSutil },
  btnRemover:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CORES.corAbandonado + '60', backgroundColor: CORES.corAbandonado + '11' },
  btnAcaoTxt:      { fontSize: 14, fontWeight: '700' },
});
