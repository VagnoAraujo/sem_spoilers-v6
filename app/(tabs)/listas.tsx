// app/(tabs)/listas.tsx — Tela Listas: catálogo completo com filtros

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Image, Animated, Modal, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES, COR_STATUS, LABEL_STATUS, LABEL_TIPO, INFO_STATUS_SERIE } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import { Titulo, StatusUsuario, TipoTitulo } from '@/types';

const { width } = Dimensions.get('window');

const TIPOS_FILTRO: { label: string; valor?: TipoTitulo }[] = [
  { label: 'Todos' },
  { label: 'Filmes',        valor: 'filme' },
  { label: 'Séries',        valor: 'serie' },
  { label: 'Animações',     valor: 'animacao' },
  { label: 'Documentários', valor: 'documentario' },
];

const STATUS_FILTRO: { label: string; valor?: StatusUsuario; cor: string }[] = [
  { label: 'Todos',         cor: CORES.textoSecundario },
  { label: 'Assistidos',    valor: 'assistido',      cor: CORES.corAssistido },
  { label: 'Assistindo',    valor: 'assistindo',     cor: CORES.corAssistindo },
  { label: 'Quero Ver',     valor: 'quero_assistir', cor: CORES.corQueroAssistir },
  { label: 'Abandonados',   valor: 'abandonado',     cor: CORES.corAbandonado },
];

const ORDENACAO = [
  { label: 'Recente',  valor: 'recente' },
  { label: 'A–Z',      valor: 'titulo' },
  { label: 'Nota',     valor: 'nota' },
  { label: 'Ano',      valor: 'ano' },
];

export default function ListasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const { titulosFiltrados, filtros, setFiltros, todosGeneros, todosDiretores, titulos } = useApp();

  const [modalFiltros, setModalFiltros] = useState(false);
  const [modoGrade, setModoGrade]       = useState(false);

  // Aplica status vindo da tela Home
  React.useEffect(() => {
    if (params.status) {
      setFiltros({ status: params.status as StatusUsuario });
    }
  }, [params.status]);

  const handleBusca = useCallback((txt: string) => setFiltros({ busca: txt }), []);

  function limparFiltros() {
    setFiltros({ status: undefined, tipo: undefined, genero: undefined, diretor: undefined, soPlotTwist: false, ordenar: 'recente' });
  }

  const filtrosAtivos = !!(filtros.status || filtros.tipo || filtros.genero || filtros.diretor || filtros.soPlotTwist);

  return (
    <View style={estilos.container}>
      {/* ─── HEADER ─────────────────────────────── */}
      <View style={estilos.header}>
        <Text style={estilos.headerTitulo}>Minhas Listas</Text>
        <Text style={estilos.headerSub}>{titulosFiltrados.length} de {titulos.length} títulos</Text>
      </View>

      {/* ─── BARRA DE BUSCA ─────────────────────── */}
      <View style={estilos.buscaRow}>
        <View style={estilos.buscaContainer}>
          <Ionicons name="search-outline" size={18} color={CORES.textoSecundario} style={{ marginLeft: 12 }} />
          <TextInput
            style={estilos.buscaInput}
            placeholder="Buscar por título, gênero, diretor..."
            placeholderTextColor={CORES.textoFraco}
            value={filtros.busca}
            onChangeText={handleBusca}
          />
          {filtros.busca.length > 0 && (
            <TouchableOpacity onPress={() => handleBusca('')} style={{ padding: 8 }}>
              <Ionicons name="close-circle" size={18} color={CORES.textoSecundario} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[estilos.btnFiltro, filtrosAtivos && estilos.btnFiltroAtivo]}
          onPress={() => setModalFiltros(true)}
        >
          <Ionicons name="options-outline" size={20} color={filtrosAtivos ? CORES.douradoPrimario : CORES.textoSecundario} />
          {filtrosAtivos && <View style={estilos.dotFiltro} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={estilos.btnFiltro}
          onPress={() => setModoGrade(!modoGrade)}
        >
          <Ionicons name={modoGrade ? 'list-outline' : 'grid-outline'} size={20} color={CORES.textoSecundario} />
        </TouchableOpacity>
      </View>

      {/* ─── CHIPS TIPO ─────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.chipsScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {TIPOS_FILTRO.map((t) => {
          const ativo = filtros.tipo === t.valor;
          return (
            <TouchableOpacity
              key={t.label}
              style={[estilos.chip, ativo && estilos.chipAtivo]}
              onPress={() => setFiltros({ tipo: ativo ? undefined : t.valor })}
            >
              <Text style={[estilos.chipTxt, ativo && estilos.chipTxtAtivo]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ─── LISTA ──────────────────────────────── */}
      {titulosFiltrados.length === 0 ? (
        <View style={estilos.vazio}>
          <Ionicons name="search-outline" size={48} color={CORES.textoFraco} />
          <Text style={estilos.vazioTxt}>Nenhum título encontrado</Text>
          <TouchableOpacity onPress={limparFiltros}>
            <Text style={{ color: CORES.azulClaro, marginTop: 8 }}>Limpar filtros</Text>
          </TouchableOpacity>
        </View>
      ) : modoGrade ? (
        <FlatList
          key="flatlist-grade"
          data={titulosFiltrados}
          keyExtractor={(i) => i.id}
          numColumns={3}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
          renderItem={({ item }) => <CardGrade titulo={item} onPress={() => router.push(`/titulo/${item.id}`)} />}
        />
      ) : (
        <FlatList
          key="flatlist-lista"
          data={titulosFiltrados}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <CardLista titulo={item} onPress={() => router.push(`/titulo/${item.id}`)} />}
        />
      )}

      {/* ─── FAB ADICIONAR ──────────────────────── */}
      <TouchableOpacity style={estilos.fab} onPress={() => router.push('/buscar-tmdb')}>
        <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.fabGrad}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ─── MODAL FILTROS ──────────────────────── */}
      <ModalFiltros
        visivel={modalFiltros}
        onFechar={() => setModalFiltros(false)}
        filtros={filtros}
        setFiltros={setFiltros}
        generos={todosGeneros}
        diretores={todosDiretores}
        limpar={limparFiltros}
      />
    </View>
  );
}

// ─── Card Lista (linha) ──────────────────────────────

function CardLista({ titulo, onPress }: { titulo: Titulo; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  function pressIn()  { Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start(); }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true }).start(); }

  const corStatus = COR_STATUS[titulo.status_usuario];
  const infoSerie = titulo.status_serie ? INFO_STATUS_SERIE[titulo.status_serie] : null;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[estilos.cardLista, { borderLeftColor: corStatus, borderLeftWidth: 3 }]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
      >
        {titulo.poster_url ? (
          <Image source={{ uri: titulo.poster_url }} style={estilos.cardPoster} />
        ) : (
          <View style={[estilos.cardPoster, estilos.cardPosterVazio]}>
            <Ionicons name="film-outline" size={24} color={CORES.azulClaro} />
          </View>
        )}
        <View style={estilos.cardInfo}>
          <View style={estilos.cardTopo}>
            <Text style={estilos.cardTitulo} numberOfLines={1}>{titulo.titulo}</Text>
            {titulo.nota_pessoal ? (
              <View style={estilos.notaBadge}>
                <Text style={estilos.notaTxt}>⭐ {titulo.nota_pessoal}</Text>
              </View>
            ) : null}
          </View>
          <View style={estilos.cardMeta}>
            <Text style={estilos.cardAno}>{titulo.ano_lancamento ?? '—'}</Text>
            <Text style={estilos.cardSep}>·</Text>
            <Text style={estilos.cardTipo}>{LABEL_TIPO[titulo.tipo] ?? titulo.tipo}</Text>
            {titulo.duracao_minutos && titulo.tipo === 'filme' && (
              <>
                <Text style={estilos.cardSep}>·</Text>
                <Text style={estilos.cardAno}>{titulo.duracao_minutos}min</Text>
              </>
            )}
          </View>
          <View style={estilos.cardRodape}>
            <View style={[estilos.statusPill, { backgroundColor: corStatus + '22', borderColor: corStatus + '55' }]}>
              <View style={[estilos.statusDot, { backgroundColor: corStatus }]} />
              <Text style={[estilos.statusTxt, { color: corStatus }]}>{LABEL_STATUS[titulo.status_usuario]}</Text>
            </View>
            {infoSerie && (
              <View style={[estilos.statusPill, { backgroundColor: infoSerie.cor + '22', borderColor: infoSerie.cor + '55', marginLeft: 6 }]}>
                <Text style={[estilos.statusTxt, { color: infoSerie.cor }]}>{infoSerie.label}</Text>
              </View>
            )}
            {titulo.tem_plot_twist && (
              <Text style={{ fontSize: 14, marginLeft: 8 }}>🌀</Text>
            )}
          </View>
          {titulo.generos.length > 0 && (
            <Text style={estilos.cardGeneros} numberOfLines={1}>
              {titulo.generos.slice(0, 3).join(' · ')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Card Grade ──────────────────────────────────────

function CardGrade({ titulo, onPress }: { titulo: Titulo; onPress: () => void }) {
  const cardW = (width - 40) / 3;
  const corStatus = COR_STATUS[titulo.status_usuario];
  return (
    <TouchableOpacity
      style={[estilos.cardGrade, { width: cardW, borderTopColor: corStatus }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {titulo.poster_url ? (
        <Image source={{ uri: titulo.poster_url }} style={{ width: '100%', height: cardW * 1.45 }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: cardW * 1.45, alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.fundoCardElevado }}>
          <Ionicons name="film-outline" size={24} color={CORES.azulClaro} />
        </View>
      )}
      <Text style={estilos.cardGradeTxt} numberOfLines={2}>{titulo.titulo}</Text>
    </TouchableOpacity>
  );
}

// ─── Modal Filtros ───────────────────────────────────

function ModalFiltros({ visivel, onFechar, filtros, setFiltros, generos, diretores, limpar }: any) {
  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={estilos.modalOverlay}>
        <View style={estilos.modalContainer}>
          <View style={estilos.modalHeader}>
            <Text style={estilos.modalTitulo}>Filtros & Ordenação</Text>
            <TouchableOpacity onPress={onFechar}>
              <Ionicons name="close" size={24} color={CORES.textoPrimario} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Status */}
            <Secao titulo="Status" icon="radio-button-on">
              {STATUS_FILTRO.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  style={[estilos.filtroOpcao, filtros.status === s.valor && { borderColor: s.cor }]}
                  onPress={() => setFiltros({ status: filtros.status === s.valor ? undefined : s.valor })}
                >
                  <View style={[estilos.filtroCorDot, { backgroundColor: s.cor }]} />
                  <Text style={[estilos.filtroTxt, filtros.status === s.valor && { color: s.cor }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </Secao>

            {/* Ordenação */}
            <Secao titulo="Ordenar por" icon="swap-vertical-outline">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ORDENACAO.map((o) => (
                  <TouchableOpacity
                    key={o.valor}
                    style={[estilos.chip, filtros.ordenar === o.valor && estilos.chipAtivo]}
                    onPress={() => setFiltros({ ordenar: o.valor })}
                  >
                    <Text style={[estilos.chipTxt, filtros.ordenar === o.valor && estilos.chipTxtAtivo]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Secao>

            {/* Plot Twist */}
            <TouchableOpacity
              style={estilos.toggleRow}
              onPress={() => setFiltros({ soPlotTwist: !filtros.soPlotTwist })}
            >
              <Text style={estilos.toggleLabel}>🌀 Só com Plot Twist</Text>
              <View style={[estilos.toggle, filtros.soPlotTwist && estilos.toggleAtivo]}>
                <View style={[estilos.toggleDot, filtros.soPlotTwist && estilos.toggleDotAtivo]} />
              </View>
            </TouchableOpacity>

            {/* Gêneros */}
            {generos.length > 0 && (
              <Secao titulo="Gênero" icon="musical-notes-outline">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {generos.slice(0, 20).map((g: string) => (
                      <TouchableOpacity
                        key={g}
                        style={[estilos.chip, filtros.genero === g && estilos.chipAtivo]}
                        onPress={() => setFiltros({ genero: filtros.genero === g ? undefined : g })}
                      >
                        <Text style={[estilos.chipTxt, filtros.genero === g && estilos.chipTxtAtivo]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </Secao>
            )}
          </ScrollView>

          {/* Botões */}
          <View style={estilos.modalRodape}>
            <TouchableOpacity style={estilos.btnLimpar} onPress={limpar}>
              <Text style={estilos.btnLimparTxt}>Limpar tudo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnAplicar} onPress={onFechar}>
              <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnAplicarGrad}>
                <Text style={estilos.btnAplicarTxt}>Aplicar</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Secao({ titulo, icon, children }: any) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Ionicons name={icon} size={14} color={CORES.douradoPrimario} />
        <Text style={{ fontSize: 11, fontWeight: '700', color: CORES.textoSecundario, letterSpacing: 1, textTransform: 'uppercase' }}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  container:     { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:        { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12 },
  headerTitulo:  { fontSize: 26, fontWeight: '800', color: CORES.textoPrimario },
  headerSub:     { fontSize: 12, color: CORES.textoSecundario, marginTop: 2 },
  buscaRow:      { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  buscaContainer:{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.fundoCard, borderRadius: 10, borderWidth: 1, borderColor: CORES.borda },
  buscaInput:    { flex: 1, color: CORES.textoPrimario, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14 },
  btnFiltro:     { width: 44, height: 44, backgroundColor: CORES.fundoCard, borderRadius: 10, borderWidth: 1, borderColor: CORES.borda, alignItems: 'center', justifyContent: 'center' },
  btnFiltroAtivo:{ borderColor: CORES.douradoPrimario },
  dotFiltro:     { width: 8, height: 8, borderRadius: 4, backgroundColor: CORES.douradoPrimario, position: 'absolute', top: 6, right: 6 },
  chipsScroll:   { height: 50, marginBottom: 6 },
  chip:          { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: CORES.fundoCard, borderWidth: 1, borderColor: CORES.borda, marginRight: 8, justifyContent: 'center' },
  chipAtivo:     { backgroundColor: CORES.azulFundo, borderColor: CORES.azulClaro },
  chipTxt:       { fontSize: 12, color: CORES.textoSecundario, fontWeight: '600' },
  chipTxtAtivo:  { color: CORES.azulClaro },
  vazio:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  vazioTxt:      { fontSize: 16, color: CORES.textoSecundario },
  cardLista:     { flexDirection: 'row', backgroundColor: CORES.fundoCard, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: CORES.borda },
  cardPoster:    { width: 72, height: 108, resizeMode: 'cover' },
  cardPosterVazio: { alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.fundoCardElevado },
  cardInfo:      { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTopo:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitulo:    { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario, flex: 1 },
  notaBadge:     { backgroundColor: CORES.douradoFundoSutil, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 },
  notaTxt:       { fontSize: 11, color: CORES.douradoClaro, fontWeight: '700' },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  cardAno:       { fontSize: 11, color: CORES.textoSecundario },
  cardSep:       { fontSize: 11, color: CORES.textoFraco },
  cardTipo:      { fontSize: 11, color: CORES.azulClaro },
  cardRodape:    { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  statusPill:    { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, gap: 4 },
  statusDot:     { width: 5, height: 5, borderRadius: 3 },
  statusTxt:     { fontSize: 10, fontWeight: '700' },
  cardGeneros:   { fontSize: 10, color: CORES.textoFraco, marginTop: 4 },
  cardGrade:     { borderRadius: 8, overflow: 'hidden', backgroundColor: CORES.fundoCard, borderTopWidth: 2 },
  cardGradeTxt:  { fontSize: 10, color: CORES.textoPrimario, padding: 6, lineHeight: 14 },
  fab:           { position: 'absolute', bottom: 90, right: 20, borderRadius: 32, overflow: 'hidden', elevation: 8 },
  fabGrad:       { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer:{ backgroundColor: CORES.fundoModal, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitulo:   { fontSize: 18, fontWeight: '800', color: CORES.textoPrimario },
  filtroOpcao:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, backgroundColor: CORES.fundoCard, borderWidth: 1, borderColor: CORES.borda, marginBottom: 8 },
  filtroCorDot:  { width: 10, height: 10, borderRadius: 5 },
  filtroTxt:     { fontSize: 14, color: CORES.textoPrimario, flex: 1 },
  toggleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: CORES.fundoCard, borderRadius: 10, borderWidth: 1, borderColor: CORES.borda, marginBottom: 20 },
  toggleLabel:   { fontSize: 14, color: CORES.textoPrimario },
  toggle:        { width: 44, height: 24, borderRadius: 12, backgroundColor: CORES.borda, padding: 2 },
  toggleAtivo:   { backgroundColor: CORES.azulPrimario },
  toggleDot:     { width: 20, height: 20, borderRadius: 10, backgroundColor: CORES.textoSecundario },
  toggleDotAtivo:{ backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  modalRodape:   { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnLimpar:     { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CORES.borda, alignItems: 'center' },
  btnLimparTxt:  { fontSize: 14, color: CORES.textoSecundario },
  btnAplicar:    { flex: 2, borderRadius: 12, overflow: 'hidden' },
  btnAplicarGrad:{ padding: 14, alignItems: 'center' },
  btnAplicarTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
