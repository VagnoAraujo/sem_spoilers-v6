// app/(tabs)/index.tsx — Tela Início: Dashboard estilo HBO

import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { CORES, GRADIENTES, COR_STATUS, LABEL_STATUS } from '@/constants/cores';
import { useApp } from '@/lib/app-context';

const { width } = Dimensions.get('window');
const CARD_W = width * 0.38;

const CANTOS_HUD = [
  { top: 0, left: 0,   borderTopWidth: 2,    borderLeftWidth: 2 },
  { top: 0, right: 0,  borderTopWidth: 2,    borderRightWidth: 2 },
  { bottom: 0, left: 0,  borderBottomWidth: 2, borderLeftWidth: 2 },
  { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },
];

export default function InicioScreen() {
  const router = useRouter();
  const { titulos, estatisticas, config, carregando } = useApp();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8,   useNativeDriver: true }),
    ]).start();
  }, []);

  const recentes = titulos.slice(0, 10);
  const assistindo = titulos.filter((t) => t.status_usuario === 'assistindo').slice(0, 5);
  const querAssistir = titulos.filter((t) => t.status_usuario === 'quero_assistir').length;

  const stats = [
    { label: 'Assistidos',   valor: estatisticas.totalAssistidos,    cor: CORES.corAssistido,     icon: 'checkmark-circle' },
    { label: 'Assistindo',   valor: estatisticas.totalAssistindo,    cor: CORES.corAssistindo,    icon: 'play-circle' },
    { label: 'Quero Ver',    valor: estatisticas.totalQueroAssistir, cor: CORES.corQueroAssistir, icon: 'bookmark' },
    { label: 'Abandonados',  valor: estatisticas.totalAbandonados,   cor: CORES.corAbandonado,    icon: 'close-circle' },
  ];

  return (
    <View style={estilos.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ─── HEADER ─────────────────────────────── */}
        <LinearGradient colors={GRADIENTES.headerAzul as any} style={estilos.header}>
          {/* Grade HUD */}
          {[...Array(8)].map((_, i) => (
            <View key={`h${i}`} style={[estilos.gradeH, { top: i * 24 }]} />
          ))}
          {/* Cantos HUD */}
          {CANTOS_HUD.map((c, i) => (
            <View key={i} style={[estilos.canto, c, { borderColor: CORES.douradoPrimario }]} />
          ))}

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <View style={estilos.headerTop}>
              <View>
                <Text style={estilos.saudacao}>Olá, {config.nomeUsuario} 👋</Text>
                <Text style={estilos.subtitulo}>Sem Spoilers · Cinema Pessoal</Text>
              </View>
              <TouchableOpacity
                style={estilos.btnImportar}
                onPress={() => router.push('/importar')}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={CORES.douradoPrimario} />
              </TouchableOpacity>
            </View>

            {/* Total geral */}
            <View style={estilos.totalCard}>
              <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.totalGrad}>
                {CANTOS_HUD.map((c, i) => (
                  <View key={i} style={[estilos.canto, c, { borderColor: CORES.corHUD }]} />
                ))}
                <Text style={estilos.totalNum}>{titulos.length}</Text>
                <Text style={estilos.totalLabel}>TÍTULOS NA SUA COLEÇÃO</Text>
                <View style={estilos.totalSub}>
                  <Text style={estilos.totalSubTxt}>🎬 {estatisticas.totalFilmes} filmes</Text>
                  <Text style={estilos.totalSubTxt}>📺 {estatisticas.totalSeries} séries</Text>
                  <Text style={estilos.totalSubTxt}>✨ {estatisticas.totalAnimacoes} animações</Text>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* ─── CARDS DE STATS ─────────────────────── */}
        <Animated.View style={[estilos.statsRow, { opacity: fadeAnim }]}>
          {stats.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={[estilos.statCard, { borderTopColor: s.cor }]}
              onPress={() => router.push({ pathname: '/(tabs)/listas', params: { status: s.label === 'Assistidos' ? 'assistido' : s.label === 'Assistindo' ? 'assistindo' : s.label === 'Quero Ver' ? 'quero_assistir' : 'abandonado' } })}
              activeOpacity={0.7}
            >
              <Ionicons name={s.icon as any} size={20} color={s.cor} />
              <Text style={[estilos.statNum, { color: s.cor }]}>{s.valor}</Text>
              <Text style={estilos.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* ─── ASSISTINDO AGORA ─────────────────── */}
        {assistindo.length > 0 && (
          <View style={estilos.secao}>
            <View style={estilos.secaoHeader}>
              <View style={[estilos.barraLateral, { backgroundColor: CORES.corAssistindo }]} />
              <Text style={estilos.secaoTitulo}>Assistindo Agora</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scroll}>
              {assistindo.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={estilos.posterCard}
                  onPress={() => router.push(`/titulo/${t.id}`)}
                  activeOpacity={0.8}
                >
                  {t.poster_url ? (
                    <Image source={{ uri: t.poster_url }} style={estilos.posterImg} />
                  ) : (
                    <View style={[estilos.posterImg, estilos.posterSemImg]}>
                      <Ionicons name="film-outline" size={32} color={CORES.azulClaro} />
                    </View>
                  )}
                  <LinearGradient colors={GRADIENTES.card as any} style={estilos.posterGrad}>
                    <Text style={estilos.posterTitulo} numberOfLines={2}>{t.titulo}</Text>
                    {t.temporadas && (
                      <Text style={estilos.posterSub}>{t.temporadas} temp.</Text>
                    )}
                  </LinearGradient>
                  {/* Badge status série */}
                  {t.status_serie === 'Canceled' && (
                    <View style={estilos.badgeCancelada}>
                      <Text style={estilos.badgeTexto}>⚠ Cancelada</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── ADICIONADOS RECENTEMENTE ─────────── */}
        {recentes.length > 0 && (
          <View style={estilos.secao}>
            <View style={estilos.secaoHeader}>
              <View style={[estilos.barraLateral, { backgroundColor: CORES.douradoPrimario }]} />
              <Text style={estilos.secaoTitulo}>Adicionados Recentemente</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/listas')} style={{ marginLeft: 'auto' }}>
                <Text style={estilos.verTodos}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scroll}>
              {recentes.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={estilos.posterCard}
                  onPress={() => router.push(`/titulo/${t.id}`)}
                  activeOpacity={0.8}
                >
                  {t.poster_url ? (
                    <Image source={{ uri: t.poster_url }} style={estilos.posterImg} />
                  ) : (
                    <View style={[estilos.posterImg, estilos.posterSemImg]}>
                      <FontAwesome5 name="film" size={28} color={CORES.azulClaro} />
                    </View>
                  )}
                  <LinearGradient colors={GRADIENTES.card as any} style={estilos.posterGrad}>
                    <View style={[estilos.dotStatus, { backgroundColor: COR_STATUS[t.status_usuario] }]} />
                    <Text style={estilos.posterTitulo} numberOfLines={2}>{t.titulo}</Text>
                    <Text style={estilos.posterSub}>{t.ano_lancamento ?? '—'}</Text>
                  </LinearGradient>
                  {t.tem_plot_twist && (
                    <View style={estilos.badgePlotTwist}>
                      <Text style={estilos.badgeTexto}>🌀 Plot Twist</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── AÇÕES RÁPIDAS ────────────────────── */}
        <View style={estilos.secao}>
          <View style={estilos.secaoHeader}>
            <View style={[estilos.barraLateral, { backgroundColor: CORES.azulClaro }]} />
            <Text style={estilos.secaoTitulo}>Ações Rápidas</Text>
          </View>
          <View style={estilos.acoesGrid}>
            <AcaoBtn icon="search" label="Buscar Título" cor={CORES.azulPrimario} onPress={() => router.push('/buscar-tmdb')} />
            <AcaoBtn icon="cloud-upload-outline" label="Importar Lista" cor={CORES.douradoPrimario} onPress={() => router.push('/importar')} />
            <AcaoBtn icon="sparkles" label="Assistente IA" cor={CORES.corAssistindo} onPress={() => router.push('/(tabs)/assistente')} />
            <AcaoBtn icon="compass-outline" label="Descobrir" cor={CORES.azulClaro} onPress={() => router.push('/(tabs)/descobrir')} />
          </View>
        </View>

        {/* ─── AVISO SEM TÍTULOS ────────────────── */}
        {!carregando && titulos.length === 0 && (
          <View style={estilos.vazio}>
            <Ionicons name="film-outline" size={64} color={CORES.textoFraco} />
            <Text style={estilos.vazioTitulo}>Sua coleção está vazia</Text>
            <Text style={estilos.vazioSub}>Importe uma lista ou busque um título para começar</Text>
            <TouchableOpacity style={estilos.btnComec} onPress={() => router.push('/buscar-tmdb')}>
              <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnComecGrad}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={estilos.btnComecTxt}>Adicionar Primeiro Título</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

function AcaoBtn({ icon, label, cor, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;
  function pressIn()  { Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start(); }
  return (
    <Animated.View style={{ transform: [{ scale }], width: '47%' }}>
      <TouchableOpacity
        style={[estilos.acaoCard, { borderColor: cor + '40' }]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        <View style={[estilos.acaoIcone, { backgroundColor: cor + '22' }]}>
          <Ionicons name={icon} size={22} color={cor} />
        </View>
        <Text style={estilos.acaoLabel}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  container:    { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:       { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 24, overflow: 'hidden' },
  gradeH:       { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#fff', opacity: 0.04 },
  canto:        { position: 'absolute', width: 14, height: 14 },
  headerTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  saudacao:     { fontSize: 22, fontWeight: '700', color: CORES.textoPrimario },
  subtitulo:    { fontSize: 12, color: CORES.textoSecundario, marginTop: 2, letterSpacing: 1 },
  btnImportar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: CORES.douradoFundo, borderWidth: 1, borderColor: CORES.douradoPrimario + '60', alignItems: 'center', justifyContent: 'center' },
  totalCard:    { borderRadius: 12, overflow: 'hidden' },
  totalGrad:    { padding: 20, alignItems: 'center', borderRadius: 12 },
  totalNum:     { fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 56 },
  totalLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginTop: 2 },
  totalSub:     { flexDirection: 'row', gap: 16, marginTop: 10 },
  totalSubTxt:  { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  statsRow:     { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 16 },
  statCard:     { flex: 1, backgroundColor: CORES.fundoCard, borderRadius: 10, padding: 12, alignItems: 'center', borderTopWidth: 3, borderColor: CORES.borda },
  statNum:      { fontSize: 22, fontWeight: '800', marginTop: 6 },
  statLabel:    { fontSize: 9, color: CORES.textoSecundario, marginTop: 2, textAlign: 'center' },
  secao:        { marginTop: 28, paddingHorizontal: 16 },
  secaoHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  barraLateral: { width: 3, height: 18, borderRadius: 2 },
  secaoTitulo:  { fontSize: 16, fontWeight: '700', color: CORES.textoPrimario },
  verTodos:     { fontSize: 12, color: CORES.azulClaro },
  scroll:       { marginLeft: -4 },
  posterCard:   { width: CARD_W, marginRight: 12, borderRadius: 10, overflow: 'hidden', backgroundColor: CORES.fundoCard },
  posterImg:    { width: CARD_W, height: CARD_W * 1.48, resizeMode: 'cover' },
  posterSemImg: { alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.fundoCardElevado },
  posterGrad:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  posterTitulo: { fontSize: 12, fontWeight: '700', color: '#fff', textShadowColor: '#000', textShadowRadius: 4 },
  posterSub:    { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  dotStatus:    { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  badgeCancelada: { position: 'absolute', top: 8, left: 6, backgroundColor: CORES.corCancelada, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgePlotTwist: { position: 'absolute', top: 8, left: 6, backgroundColor: CORES.azulPrimario, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  badgeTexto:   { fontSize: 9, color: '#fff', fontWeight: '700' },
  acoesGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  acaoCard:     { backgroundColor: CORES.fundoCard, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  acaoIcone:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  acaoLabel:    { fontSize: 13, fontWeight: '600', color: CORES.textoPrimario, flex: 1 },
  vazio:        { alignItems: 'center', padding: 40, gap: 12 },
  vazioTitulo:  { fontSize: 18, fontWeight: '700', color: CORES.textoPrimario },
  vazioSub:     { fontSize: 14, color: CORES.textoSecundario, textAlign: 'center' },
  btnComec:     { marginTop: 8, borderRadius: 24, overflow: 'hidden' },
  btnComecGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  btnComecTxt:  { fontSize: 14, fontWeight: '700', color: '#fff' },
});
