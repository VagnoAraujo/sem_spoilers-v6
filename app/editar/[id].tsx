// app/editar/[id].tsx — Edição manual de um título

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import { StatusUsuario, TipoTitulo } from '@/types';

const STATUS_LISTA: { valor: StatusUsuario; label: string }[] = [
  { valor: 'assistido',      label: '✅ Assistido' },
  { valor: 'assistindo',     label: '▶  Assistindo' },
  { valor: 'quero_assistir', label: '🔖 Quero Assistir' },
  { valor: 'abandonado',     label: '🚫 Abandonado' },
];

const TIPOS_LISTA: { valor: TipoTitulo; label: string }[] = [
  { valor: 'filme',        label: '🎬 Filme' },
  { valor: 'serie',        label: '📺 Série' },
  { valor: 'animacao',     label: '✨ Animação' },
  { valor: 'documentario', label: '📽 Documentário' },
  { valor: 'minisserie',   label: '📋 Minissérie' },
  { valor: 'especial',     label: '⭐ Especial' },
];

export default function EditarScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const { titulos, atualizarTitulo } = useApp();
  const titulo   = titulos.find((t) => t.id === id);

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

  const [nomeTitulo,    setNomeTitulo]    = useState(titulo.titulo);
  const [status,        setStatus]        = useState<StatusUsuario>(titulo.status_usuario);
  const [tipo,          setTipo]          = useState<TipoTitulo>(titulo.tipo);
  const [ano,           setAno]           = useState(titulo.ano_lancamento?.toString() ?? '');
  const [nota,          setNota]          = useState(titulo.nota_pessoal?.toString() ?? '');
  const [diretores,     setDiretores]     = useState(titulo.diretores.join(', '));
  const [generos,       setGeneros]       = useState(titulo.generos.join(', '));
  const [tags,          setTags]          = useState(titulo.tags.join(', '));
  const [comentario,    setComentario]    = useState(titulo.comentario_pessoal ?? '');
  const [temPlotTwist,  setTemPlotTwist]  = useState(titulo.tem_plot_twist);
  const [temContinuacao,setTemContinuacao]= useState(titulo.tem_continuacao);
  const [contNome,      setContNome]      = useState(titulo.continuacao_nome ?? '');
  const [tempAtual,     setTempAtual]     = useState(titulo.temporada_atual?.toString() ?? '');
  const [epAtual,       setEpAtual]       = useState(titulo.episodio_atual?.toString() ?? '');
  const [notaEmocional, setNotaEmocional] = useState(titulo.nota_emocional ?? null);
  const [salvando,      setSalvando]      = useState(false);

  const ehSerie = ['serie','animacao','minisserie'].includes(tipo);

  async function salvar() {
    if (!nomeTitulo.trim()) {
      Alert.alert('Erro', 'O título não pode ser vazio.');
      return;
    }
    setSalvando(true);
    await atualizarTitulo(id, {
      titulo:            nomeTitulo.trim(),
      status_usuario:    status,
      tipo,
      ano_lancamento:    ano ? parseInt(ano, 10) : undefined,
      nota_pessoal:      nota ? Math.min(10, Math.max(1, parseInt(nota, 10))) : undefined,
      diretores:         diretores.split(',').map((d) => d.trim()).filter(Boolean),
      generos:           generos.split(',').map((g) => g.trim()).filter(Boolean),
      tags:              tags.split(',').map((t) => t.trim()).filter(Boolean),
      comentario_pessoal:comentario.trim() || undefined,
      tem_plot_twist:    temPlotTwist,
      tem_continuacao:   temContinuacao,
      continuacao_nome:  temContinuacao ? contNome.trim() : undefined,
      temporada_atual:   tempAtual ? parseInt(tempAtual, 10) : undefined,
      episodio_atual:    epAtual   ? parseInt(epAtual,   10) : undefined,
      nota_emocional:    notaEmocional ?? undefined,
      data_review:       notaEmocional ? new Date().toISOString() : titulo.data_review,
    });
    setSalvando(false);
    router.back();
  }

  return (
    <View style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.btnFechar}>
          <Ionicons name="close" size={22} color={CORES.textoPrimario} />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo}>Editar Título</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* Nome */}
        <Campo label="Título" required>
          <TextInput
            style={estilos.input}
            value={nomeTitulo}
            onChangeText={setNomeTitulo}
            placeholder="Nome do título"
            placeholderTextColor={CORES.textoFraco}
          />
        </Campo>

        {/* Status */}
        <Campo label="Status">
          <View style={estilos.chipGrupo}>
            {STATUS_LISTA.map((s) => (
              <TouchableOpacity
                key={s.valor}
                style={[estilos.chip, status === s.valor && estilos.chipAtivo]}
                onPress={() => setStatus(s.valor)}
              >
                <Text style={[estilos.chipTxt, status === s.valor && estilos.chipTxtAtivo]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Campo>

        {/* Tipo */}
        <Campo label="Tipo">
          <View style={estilos.chipGrupo}>
            {TIPOS_LISTA.map((t) => (
              <TouchableOpacity
                key={t.valor}
                style={[estilos.chip, tipo === t.valor && estilos.chipAtivo]}
                onPress={() => setTipo(t.valor)}
              >
                <Text style={[estilos.chipTxt, tipo === t.valor && estilos.chipTxtAtivo]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Campo>

        {/* Ano e Nota (linha) */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Campo label="Ano de lançamento">
              <TextInput
                style={estilos.input}
                value={ano}
                onChangeText={setAno}
                placeholder="2024"
                placeholderTextColor={CORES.textoFraco}
                keyboardType="numeric"
                maxLength={4}
              />
            </Campo>
          </View>
          <View style={{ flex: 1 }}>
            <Campo label="Minha nota (1–10)">
              <TextInput
                style={estilos.input}
                value={nota}
                onChangeText={setNota}
                placeholder="8"
                placeholderTextColor={CORES.textoFraco}
                keyboardType="numeric"
                maxLength={2}
              />
            </Campo>
          </View>
        </View>

        {/* Diretor(es) */}
        <Campo label="Diretor(es)" dica="Separe por vírgula">
          <TextInput
            style={estilos.input}
            value={diretores}
            onChangeText={setDiretores}
            placeholder="Christopher Nolan, Quentin Tarantino"
            placeholderTextColor={CORES.textoFraco}
          />
        </Campo>

        {/* Gêneros */}
        <Campo label="Gêneros" dica="Separe por vírgula">
          <TextInput
            style={estilos.input}
            value={generos}
            onChangeText={setGeneros}
            placeholder="Suspense, Drama, Ficção Científica"
            placeholderTextColor={CORES.textoFraco}
          />
        </Campo>

        {/* Tags */}
        <Campo label="Tags pessoais" dica="Ex: favorito, maratonar, recomendação">
          <TextInput
            style={estilos.input}
            value={tags}
            onChangeText={setTags}
            placeholder="favorito, para rever, cult"
            placeholderTextColor={CORES.textoFraco}
          />
        </Campo>

        {/* Progresso — só para séries em andamento */}
        {ehSerie && status === 'assistindo' && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Campo label="Temporada atual">
                <TextInput
                  style={estilos.input} value={tempAtual} onChangeText={setTempAtual}
                  placeholder="1" placeholderTextColor={CORES.textoFraco}
                  keyboardType="numeric" maxLength={2}
                />
              </Campo>
            </View>
            <View style={{ flex: 1 }}>
              <Campo label="Episódio atual">
                <TextInput
                  style={estilos.input} value={epAtual} onChangeText={setEpAtual}
                  placeholder="5" placeholderTextColor={CORES.textoFraco}
                  keyboardType="numeric" maxLength={3}
                />
              </Campo>
            </View>
          </View>
        )}

        {/* Review emocional */}
        <Campo label="Como você se sentiu?">
          <View style={estilos.chipGrupo}>
            {([
              { v: 'amei', l: '😍 Amei' },
              { v: 'gostei', l: '😊 Gostei' },
              { v: 'ok', l: '😐 Ok' },
              { v: 'nao_gostei', l: '😕 Não gostei' },
              { v: 'odiei', l: '😤 Odiei' },
            ] as const).map((r) => (
              <TouchableOpacity
                key={r.v}
                style={[estilos.chip, notaEmocional === r.v && estilos.chipAtivo]}
                onPress={() => setNotaEmocional(notaEmocional === r.v ? null : r.v)}
              >
                <Text style={[estilos.chipTxt, notaEmocional === r.v && estilos.chipTxtAtivo]}>{r.l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Campo>

        {/* Comentário */}
        <Campo label="Comentário pessoal">
          <TextInput
            style={[estilos.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={comentario}
            onChangeText={setComentario}
            placeholder="Suas anotações sobre este título..."
            placeholderTextColor={CORES.textoFraco}
            multiline
          />
        </Campo>

        {/* Toggles */}
        <Toggle label="🌀 Tem Plot Twist" valor={temPlotTwist} onChange={setTemPlotTwist} />
        <Toggle label="➕ Tem Continuação / Sequência" valor={temContinuacao} onChange={setTemContinuacao} />

        {temContinuacao && (
          <Campo label="Nome da franquia / continuação">
            <TextInput
              style={estilos.input}
              value={contNome}
              onChangeText={setContNome}
              placeholder="Ex: Universo Marvel, Saga John Wick..."
              placeholderTextColor={CORES.textoFraco}
            />
          </Campo>
        )}

        {/* Botão salvar */}
        <TouchableOpacity style={estilos.btnSalvar} onPress={salvar} disabled={salvando}>
          <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnSalvarGrad}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={estilos.btnSalvarTxt}>{salvando ? 'Salvando...' : 'Salvar Alterações'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Subcomponentes ──────────────────────────────────

function Campo({ label, dica, required, children }: any) {
  return (
    <View style={estilos.campo}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={estilos.campoLabel}>{label}</Text>
        {required && <Text style={{ color: CORES.corAbandonado, fontSize: 12 }}>*</Text>}
        {dica && <Text style={{ fontSize: 10, color: CORES.textoFraco }}>{dica}</Text>}
      </View>
      {children}
    </View>
  );
}

function Toggle({ label, valor, onChange }: { label: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={estilos.toggleRow} onPress={() => onChange(!valor)}>
      <Text style={estilos.toggleLabel}>{label}</Text>
      <View style={[estilos.toggle, valor && estilos.toggleAtivo]}>
        <View style={[estilos.toggleDot, valor && estilos.toggleDotAtivo]} />
      </View>
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container:     { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:        { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  btnFechar:     { width: 40, height: 40, borderRadius: 20, backgroundColor: CORES.fundoCard, alignItems: 'center', justifyContent: 'center' },
  headerTitulo:  { fontSize: 18, fontWeight: '800', color: CORES.textoPrimario },
  campo:         { marginBottom: 16 },
  campoLabel:    { fontSize: 11, fontWeight: '700', color: CORES.textoSecundario, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  input:         { backgroundColor: CORES.fundoCard, borderRadius: 10, borderWidth: 1, borderColor: CORES.borda, color: CORES.textoPrimario, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  chipGrupo:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:          { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: CORES.fundoCard, borderWidth: 1, borderColor: CORES.borda },
  chipAtivo:     { backgroundColor: CORES.azulFundo, borderColor: CORES.azulClaro },
  chipTxt:       { fontSize: 12, color: CORES.textoSecundario },
  chipTxtAtivo:  { color: CORES.azulClaro, fontWeight: '700' },
  toggleRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: CORES.fundoCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: CORES.borda, marginBottom: 12 },
  toggleLabel:   { fontSize: 14, color: CORES.textoPrimario },
  toggle:        { width: 46, height: 26, borderRadius: 13, backgroundColor: CORES.borda, padding: 3 },
  toggleAtivo:   { backgroundColor: CORES.azulPrimario },
  toggleDot:     { width: 20, height: 20, borderRadius: 10, backgroundColor: CORES.textoSecundario },
  toggleDotAtivo:{ backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  btnSalvar:     { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
  btnSalvarGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  btnSalvarTxt:  { fontSize: 16, fontWeight: '700', color: '#fff' },
});
