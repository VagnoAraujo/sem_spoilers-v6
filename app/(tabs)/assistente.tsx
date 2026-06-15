// app/(tabs)/assistente.tsx — Assistente IA com Groq

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Animated,
  ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import { chatGroq } from '@/lib/groq';
import { MensagemIA } from '@/types';
import * as ImagePicker from 'expo-image-picker';
import { extrairTitulosDaImagem } from '@/lib/groq';

const SUGESTOES_RAPIDAS = [
  '🎬 Me recomende um filme',
  '📺 Série que não foi cancelada?',
  '🌀 Tem plot twist na minha lista?',
  '😱 Melhor suspense que tenho?',
];

const HUMORES = [
  { id: 'acao',      emoji: '💥', label: 'Ação' },
  { id: 'comedia',   emoji: '😂', label: 'Comédia' },
  { id: 'drama',     emoji: '😢', label: 'Drama' },
  { id: 'suspense',  emoji: '😰', label: 'Suspense' },
  { id: 'romance',   emoji: '❤️',  label: 'Romance' },
  { id: 'terror',    emoji: '👻', label: 'Terror' },
  { id: 'animacao',  emoji: '🎨', label: 'Animação' },
  { id: 'curto',     emoji: '⚡', label: 'Curto (<90min)' },
  { id: 'longo',     emoji: '🍿', label: 'Longo (>2h)' },
  { id: 'serie',     emoji: '📺', label: 'Série' },
  { id: 'anime',     emoji: '⛩️',  label: 'Anime' },
  { id: 'surpresa',  emoji: '🎲', label: 'Surpresa!' },
];

export default function AssistenteScreen() {
  const { config, titulos } = useApp();
  const [mensagens, setMensagens] = useState<MensagemIA[]>([]);
  const [input, setInput]         = useState('');
  const [carregando, setCarregando] = useState(false);
  const [imagemBase64, setImagemBase64] = useState<string | null>(null);
  const [modoSorteio, setModoSorteio] = useState(false);
  const [humoresSel, setHumoresSel]   = useState<string[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef  = useRef<TextInput>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  async function enviarMensagem(texto?: string) {
    const msg = texto ?? input;
    if (!msg.trim() && !imagemBase64) return;
    if (carregando) return;

    const novaMensagem: MensagemIA = {
      role: 'user',
      content: msg,
      timestamp: Date.now(),
      imagemBase64: imagemBase64 ?? undefined,
    };

    const historicoAtualizado = [...mensagens, novaMensagem];
    setMensagens(historicoAtualizado);
    setInput('');
    setImagemBase64(null);
    setCarregando(true);

    // Rola para o fim
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    // Monta mensagens para a API
    const mensagensApi = historicoAtualizado.map((m) => ({
      role: m.role,
      content: m.imagemBase64
        ? [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${m.imagemBase64}` } },
            { type: 'text', text: m.content },
          ]
        : m.content,
    }));

    const resposta = await chatGroq(
      mensagensApi as any,
      `Você é um assistente cinéfilo entusiasmado. O usuário se chama ${config.nomeUsuario}.`,
      titulos
    );

    const respostaMensagem: MensagemIA = {
      role: 'assistant',
      content: resposta,
      timestamp: Date.now(),
    };

    setMensagens([...historicoAtualizado, respostaMensagem]);
    setCarregando(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }

  async function pedirSorteio() {
    if (!temChave || humoresSel.length === 0) return;
    setModoSorteio(false);

    const pendentes = titulos.filter(t => t.status_usuario === 'quero_assistir');
    const labels = humoresSel.includes('surpresa')
      ? 'qualquer gênero ou estilo (modo surpresa!)'
      : HUMORES.filter(h => humoresSel.includes(h.id)).map(h => h.label).join(', ');

    const prompt = `🎲 Modo "O que assistir hoje?" ativado!
Estou com vontade de: ${labels}.
Minha lista "Quero Assistir" tem ${pendentes.length} títulos.
Escolha UM título específico que se encaixe melhor no meu humor agora.
Apresente assim:
🎬 **[Nome do Título]** (ano)
⭐ Por que assistir hoje: [motivo em 2 linhas max, sem spoilers]
🕐 Duração / Temporadas: [info]
🎭 Sensação garantida: [o que vou sentir]`;

    await enviarMensagem(prompt);
    setHumoresSel([]);
  }

  function toggleHumor(id: string) {
    setHumoresSel(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  }

  async function selecionarImagemParaEnviar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setImagemBase64(result.assets[0].base64);
    }
  }

  const temChave = !!config.groqApiKey;

  return (
    <KeyboardAvoidingView
      style={estilos.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 64}
    >
      {/* ─── HEADER ─────────────────────────────── */}
      <LinearGradient colors={GRADIENTES.headerAzul as any} style={estilos.header}>
        <View style={estilos.headerRow}>
          <View style={estilos.avatarIA}>
            <Text style={{ fontSize: 24 }}>🎬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.headerTitulo}>Assistente Sem Spoilers</Text>
            <View style={estilos.statusRow}>
              <View style={[estilos.statusDot, { backgroundColor: temChave ? CORES.corAssistido : CORES.corAbandonado }]} />
              <Text style={estilos.statusTxt}>{temChave ? 'Online · Groq AI' : 'Configure a chave Groq'}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setMensagens([])} style={estilos.btnLimpar}>
            <Ionicons name="trash-outline" size={18} color={CORES.textoSecundario} />
          </TouchableOpacity>
        </View>

        {/* Botão "O que assistir hoje?" */}
        <TouchableOpacity
          style={[estilos.btnSorteio, !temChave && { opacity: 0.4 }]}
          onPress={() => { setModoSorteio(true); setHumoresSel([]); }}
          disabled={!temChave}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 20 }}>🎲</Text>
          <Text style={estilos.btnSorteioTxt}>O que assistir hoje?</Text>
          <Ionicons name="chevron-forward" size={16} color={CORES.douradoPrimario} />
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── PAINEL DE HUMOR ─────────────────────── */}
      {modoSorteio && (
        <View style={estilos.painelHumor}>
          <Text style={estilos.painelTitulo}>Qual o seu humor agora? 🍿</Text>
          <Text style={estilos.painelSub}>Selecione um ou mais</Text>
          <View style={estilos.humorGrid}>
            {HUMORES.map(h => (
              <TouchableOpacity
                key={h.id}
                style={[estilos.humorChip, humoresSel.includes(h.id) && estilos.humorChipAtivo]}
                onPress={() => toggleHumor(h.id)}
              >
                <Text style={{ fontSize: 16 }}>{h.emoji}</Text>
                <Text style={[estilos.humorChipTxt, humoresSel.includes(h.id) && { color: '#fff' }]}>
                  {h.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={[estilos.btnConfirmarSorteio, humoresSel.length === 0 && { opacity: 0.4 }]}
              onPress={pedirSorteio}
              disabled={humoresSel.length === 0 || carregando}
            >
              <Text style={estilos.btnConfirmarTxt}>🎬 Me surpreenda!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={estilos.btnCancelarSorteio} onPress={() => setModoSorteio(false)}>
              <Text style={{ color: CORES.textoSecundario, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── MENSAGENS ──────────────────────────── */}
      <Animated.View style={[{ flex: 1, opacity: fadeAnim }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={estilos.chat}
          showsVerticalScrollIndicator={false}
        >
          {/* Boas-vindas */}
          {mensagens.length === 0 && (
            <View style={estilos.bemVindo}>
              <Text style={estilos.bemVindoTitulo}>Olá, {config.nomeUsuario}! 👋</Text>
              <Text style={estilos.bemVindoSub}>
                Sou seu assistente cinematográfico.{'\n'}
                Tenho acesso a {titulos.length} títulos da sua coleção.{'\n'}
                {!temChave && '⚠️ Configure sua chave Groq nas configurações.'}
              </Text>
              {/* Sugestões rápidas */}
              <View style={estilos.sugestoesGrid}>
                {SUGESTOES_RAPIDAS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={estilos.sugestaoCard}
                    onPress={() => enviarMensagem(s)}
                    disabled={!temChave}
                  >
                    <Text style={estilos.sugestaoTxt}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Mensagens */}
          {mensagens.map((m, i) => (
            <MensagemBolha key={i} mensagem={m} />
          ))}

          {/* Typing indicator */}
          {carregando && <TypingIndicator />}
        </ScrollView>
      </Animated.View>

      {/* ─── PREVIEW DE IMAGEM ──────────────────── */}
      {imagemBase64 && (
        <View style={estilos.imagemPreview}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${imagemBase64}` }}
            style={estilos.imagemPreviewImg}
          />
          <TouchableOpacity
            style={estilos.imagemRemover}
            onPress={() => setImagemBase64(null)}
          >
            <Ionicons name="close-circle" size={20} color={CORES.corAbandonado} />
          </TouchableOpacity>
        </View>
      )}

      {/* ─── INPUT ──────────────────────────────── */}
      <View style={estilos.inputRow}>
        <TouchableOpacity style={estilos.btnAnexo} onPress={selecionarImagemParaEnviar}>
          <Ionicons name="image-outline" size={22} color={imagemBase64 ? CORES.douradoPrimario : CORES.textoSecundario} />
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={estilos.input}
          placeholder="Pergunte qualquer coisa sobre cinema..."
          placeholderTextColor={CORES.textoFraco}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          onSubmitEditing={() => enviarMensagem()}
          returnKeyType="send"
          editable={!carregando && temChave}
        />
        <TouchableOpacity
          style={[estilos.btnEnviar, (input.trim() || imagemBase64) && temChave && estilos.btnEnviarAtivo]}
          onPress={() => enviarMensagem()}
          disabled={carregando || (!input.trim() && !imagemBase64) || !temChave}
        >
          {carregando ? (
            <ActivityIndicator size="small" color={CORES.azulClaro} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={(input.trim() || imagemBase64) && temChave ? '#fff' : CORES.textoFraco}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Bolha de mensagem ───────────────────────────────

function MensagemBolha({ mensagem }: { mensagem: MensagemIA }) {
  const isUser = mensagem.role === 'user';
  return (
    <View style={[estilos.bolhaContainer, isUser && estilos.bolhaContainerUser]}>
      {!isUser && (
        <View style={estilos.avatarSmall}>
          <Text style={{ fontSize: 14 }}>🎬</Text>
        </View>
      )}
      <View style={[estilos.bolha, isUser ? estilos.bolhaUser : estilos.bolhaIA]}>
        {mensagem.imagemBase64 && (
          <Image
            source={{ uri: `data:image/jpeg;base64,${mensagem.imagemBase64}` }}
            style={estilos.imagemNaMensagem}
          />
        )}
        <Text style={[estilos.bolhaTxt, isUser && estilos.bolhaTxtUser]}>
          {mensagem.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Typing indicator ────────────────────────────────

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    function anim(dot: Animated.Value, delay: number) {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      ).start();
    }
    anim(dot1, 0);
    anim(dot2, 150);
    anim(dot3, 300);
  }, []);

  return (
    <View style={estilos.bolhaContainer}>
      <View style={estilos.avatarSmall}>
        <Text style={{ fontSize: 14 }}>🎬</Text>
      </View>
      <View style={[estilos.bolha, estilos.bolhaIA, { flexDirection: 'row', gap: 4, paddingHorizontal: 16 }]}>
        {[dot1, dot2, dot3].map((d, i) => (
          <Animated.View
            key={i}
            style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CORES.textoSecundario, transform: [{ translateY: d }] }}
          />
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  container:    { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:       { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarIA:     { width: 44, height: 44, borderRadius: 22, backgroundColor: CORES.azulFundo, borderWidth: 1.5, borderColor: CORES.azulClaro, alignItems: 'center', justifyContent: 'center' },
  headerTitulo: { fontSize: 16, fontWeight: '800', color: CORES.textoPrimario },
  statusRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot:    { width: 7, height: 7, borderRadius: 4 },
  statusTxt:    { fontSize: 11, color: CORES.textoSecundario },
  btnLimpar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: CORES.fundoCard, alignItems: 'center', justifyContent: 'center' },
  btnSorteio:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,200,50,0.12)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginTop: 10, borderWidth: 1, borderColor: '#FFc83288' },
  btnSorteioTxt:{ flex: 1, color: CORES.douradoPrimario, fontWeight: '700', fontSize: 14 },
  painelHumor:  { backgroundColor: CORES.fundoCard, borderBottomWidth: 1, borderColor: CORES.borda, padding: 16 },
  painelTitulo: { fontSize: 16, fontWeight: '800', color: CORES.textoPrimario, marginBottom: 2 },
  painelSub:    { fontSize: 12, color: CORES.textoFraco, marginBottom: 12 },
  humorGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  humorChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: CORES.fundoCardElevado, borderWidth: 1, borderColor: CORES.borda },
  humorChipAtivo:{ backgroundColor: CORES.azulPrimario, borderColor: CORES.azulClaro },
  humorChipTxt: { fontSize: 12, color: CORES.textoSecundario, fontWeight: '600' },
  btnConfirmarSorteio:{ flex: 1, backgroundColor: CORES.douradoPrimario, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnConfirmarTxt:    { color: '#000', fontWeight: '800', fontSize: 14 },
  btnCancelarSorteio: { paddingHorizontal: 16, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: CORES.fundoCardElevado, borderWidth: 1, borderColor: CORES.borda },
  chat:         { padding: 16, paddingBottom: 20 },
  bemVindo:     { alignItems: 'center', paddingVertical: 20 },
  bemVindoTitulo: { fontSize: 20, fontWeight: '800', color: CORES.textoPrimario, marginBottom: 8 },
  bemVindoSub:  { fontSize: 13, color: CORES.textoSecundario, textAlign: 'center', lineHeight: 20 },
  sugestoesGrid:{ width: '100%', gap: 8, marginTop: 20 },
  sugestaoCard: { backgroundColor: CORES.fundoCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: CORES.borda },
  sugestaoTxt:  { fontSize: 13, color: CORES.textoPrimario },
  bolhaContainer:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  bolhaContainerUser: { flexDirection: 'row-reverse' },
  avatarSmall:  { width: 28, height: 28, borderRadius: 14, backgroundColor: CORES.azulFundo, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: CORES.azulClaro },
  bolha:        { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bolhaIA:      { backgroundColor: CORES.fundoCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: CORES.borda },
  bolhaUser:    { backgroundColor: CORES.azulPrimario, borderBottomRightRadius: 4 },
  bolhaTxt:     { fontSize: 14, color: CORES.textoPrimario, lineHeight: 20 },
  bolhaTxtUser: { color: '#fff' },
  imagemNaMensagem: { width: 200, height: 140, borderRadius: 10, marginBottom: 8, resizeMode: 'cover' },
  imagemPreview:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: CORES.fundoCard, borderTopWidth: 1, borderColor: CORES.borda },
  imagemPreviewImg: { width: 48, height: 48, borderRadius: 8, resizeMode: 'cover' },
  imagemRemover:    { marginLeft: 8 },
  inputRow:     { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8, backgroundColor: CORES.fundoCard, borderTopWidth: 1, borderTopColor: CORES.borda },
  btnAnexo:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  input:        { flex: 1, backgroundColor: CORES.fundoPrincipal, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: CORES.textoPrimario, fontSize: 14, maxHeight: 120, borderWidth: 1, borderColor: CORES.borda },
  btnEnviar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: CORES.fundoCard, alignItems: 'center', justifyContent: 'center' },
  btnEnviarAtivo: { backgroundColor: CORES.azulPrimario },
});
