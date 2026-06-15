// app/(tabs)/configuracoes.tsx — Configurações do app

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import { initSupabase } from '@/lib/supabase';
import { exportarDados } from '@/lib/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export default function ConfiguracoesScreen() {
  const { config, salvarConfig, titulos, estatisticas } = useApp();
  const [nome,         setNome]         = useState(config.nomeUsuario);
  const [tmdbKey,      setTmdbKey]      = useState(config.tmdbApiKey);
  const [groqKey,      setGroqKey]      = useState(config.groqApiKey);
  const [geminiKey,    setGeminiKey]    = useState(config.geminiApiKey ?? '');
  const [supaUrl,      setSupaUrl]      = useState(config.supabaseUrl);
  const [supaKey,      setSupaKey]      = useState(config.supabaseAnonKey);
  const [usarSupa,     setUsarSupa]     = useState(config.usarSupabase);
  const [mostrarTmdb,  setMostrarTmdb]  = useState(false);
  const [mostrarGroq,  setMostrarGroq]  = useState(false);
  const [mostrarGemini,setMostrarGemini]= useState(false);
  const [mostrarSupa,  setMostrarSupa]  = useState(false);
  const [salvando,     setSalvando]     = useState(false);
  const [testando,     setTestando]     = useState(false);

  async function salvar() {
    setSalvando(true);
    await salvarConfig({
      nomeUsuario: nome,
      tmdbApiKey:  tmdbKey,
      groqApiKey:  groqKey,
      geminiApiKey: geminiKey,
      supabaseUrl: supaUrl,
      supabaseAnonKey: supaKey,
      usarSupabase: usarSupa,
    });
    setSalvando(false);
    Alert.alert('✅ Salvo', 'Configurações salvas com sucesso!');
  }

  async function testarSupabase() {
    if (!supaUrl || !supaKey) {
      Alert.alert('❌ Erro', 'Preencha a URL e a chave do Supabase.');
      return;
    }
    setTestando(true);
    const ok = await initSupabase(supaUrl, supaKey);
    setTestando(false);
    Alert.alert(ok ? '✅ Conectado' : '❌ Falhou', ok ? 'Supabase conectado com sucesso!' : 'Verifique a URL e a chave.');
  }

  async function exportarBackup() {
    try {
      const dados = await exportarDados();
      const path  = `${FileSystem.cacheDirectory}sem-spoilers-backup.json`;
      await FileSystem.writeAsStringAsync(path, dados, { encoding: 'utf8' });
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Salvar backup' });
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar.');
    }
  }

  async function exportarListaTxt(status: 'quero_assistir' | 'assistido' | 'todos') {
    try {
      const STATUS_LABEL: Record<string, string> = {
        quero_assistir: '📋 QUERO ASSISTIR',
        assistido:      '✅ JÁ ASSISTI',
        todos:          '🎬 MINHA COLEÇÃO',
      };
      const filtrados = status === 'todos'
        ? titulos
        : titulos.filter(t => t.status_usuario === status);

      if (filtrados.length === 0) {
        Alert.alert('Lista vazia', 'Não há títulos nessa categoria.'); return;
      }

      const EMOJI_TIPO: Record<string, string> = {
        filme: '🎬', serie: '📺', animacao: '🎨', minisserie: '📖',
        documentario: '🎙️', anime: '⛩️', especial: '⭐', curta: '⚡',
      };

      const linhas = filtrados.map((t, i) => {
        const emoji = EMOJI_TIPO[t.tipo] ?? '📽️';
        const nota  = t.nota_pessoal ? ` · ⭐${t.nota_pessoal}/10` : '';
        const prog  = t.temporada_atual && t.episodio_atual
          ? ` · T${t.temporada_atual}E${t.episodio_atual}` : '';
        return `${i + 1}. ${emoji} ${t.titulo} (${t.ano ?? '?'})${nota}${prog}`;
      });

      const cabecalho = [
        `${STATUS_LABEL[status]}`,
        `${config.nomeUsuario ? `de ${config.nomeUsuario} · ` : ''}${filtrados.length} título${filtrados.length !== 1 ? 's' : ''}`,
        `Exportado em ${new Date().toLocaleDateString('pt-BR')} via Sem Spoilers`,
        '─'.repeat(36),
        '',
      ];

      const conteudo = [...cabecalho, ...linhas].join('\n');
      const path = `${FileSystem.cacheDirectory}sem-spoilers-lista.txt`;
      await FileSystem.writeAsStringAsync(path, conteudo, { encoding: 'utf8' });
      await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Compartilhar lista' });
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar a lista.');
    }
  }

  async function compartilharWhatsApp() {
    const quero     = titulos.filter(t => t.status_usuario === 'quero_assistir').length;
    const assistidos = titulos.filter(t => t.status_usuario === 'assistido').length;
    const favoritos = titulos.filter(t => t.nota_pessoal && t.nota_pessoal >= 9)
      .slice(0, 3).map(t => t.titulo).join(', ');

    const msg = encodeURIComponent(
      `🎬 *Minha coleção no Sem Spoilers*\n\n` +
      `✅ Já assisti: ${assistidos} títulos\n` +
      `📋 Quero ver: ${quero} títulos\n` +
      (favoritos ? `⭐ Favoritos: ${favoritos}\n` : '') +
      `\nFeito com o app Sem Spoilers 🤫`
    );
    Linking.openURL(`whatsapp://send?text=${msg}`);
  }

  return (
    <View style={estilos.container}>
      {/* Header */}
      <LinearGradient colors={GRADIENTES.headerAzul as any} style={estilos.header}>
        <Text style={estilos.headerTitulo}>Configurações</Text>
        <Text style={estilos.headerSub}>Sem Spoilers · v1.0.0</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

        {/* ─── PERFIL ───────────────────────────── */}
        <Secao titulo="Perfil" icon="person-circle-outline">
          <Input
            label="Seu nome"
            value={nome}
            onChangeText={setNome}
            placeholder="Como você quer ser chamado?"
            icon="person-outline"
          />
        </Secao>

        {/* ─── TMDB ─────────────────────────────── */}
        <Secao titulo="TMDB API" icon="film-outline" badge="GRÁTIS">
          <Text style={estilos.dica}>
            Necessário para buscar informações de filmes/séries.{'\n'}
            Crie uma conta gratuita em themoviedb.org
          </Text>
          <TouchableOpacity
            style={estilos.linkBtn}
            onPress={() => Linking.openURL('https://www.themoviedb.org/settings/api')}
          >
            <Ionicons name="open-outline" size={14} color={CORES.azulClaro} />
            <Text style={estilos.linkTxt}>Gerar chave TMDB gratuita</Text>
          </TouchableOpacity>
          <Input
            label="Chave da API TMDB"
            value={tmdbKey}
            onChangeText={setTmdbKey}
            placeholder="eyJhbGciOiJIUzI1NiJ9..."
            secreta={!mostrarTmdb}
            onToggleSecreta={() => setMostrarTmdb(!mostrarTmdb)}
            icon="key-outline"
          />
          {config.tmdbApiKey && <StatusOk texto="TMDB configurado" />}
        </Secao>

        {/* ─── GROQ ─────────────────────────────── */}
        <Secao titulo="Groq AI (Chat)" icon="sparkles-outline" badge="GRÁTIS">
          <Text style={estilos.dica}>
            Usado pelo Assistente IA (chat). Rápido e gratuito.{'\n'}
            Crie em: console.groq.com
          </Text>
          <TouchableOpacity
            style={estilos.linkBtn}
            onPress={() => Linking.openURL('https://console.groq.com/keys')}
          >
            <Ionicons name="open-outline" size={14} color={CORES.azulClaro} />
            <Text style={estilos.linkTxt}>Gerar chave Groq gratuita</Text>
          </TouchableOpacity>
          <Input
            label="Chave da API Groq"
            value={groqKey}
            onChangeText={setGroqKey}
            placeholder="gsk_..."
            secreta={!mostrarGroq}
            onToggleSecreta={() => setMostrarGroq(!mostrarGroq)}
            icon="key-outline"
          />
          {config.groqApiKey && <StatusOk texto="Groq configurado" />}
        </Secao>

        {/* ─── GEMINI ─────────────────────────────── */}
        <Secao titulo="Gemini Flash (OCR de Prints)" icon="image-outline" badge="GRÁTIS">
          <Text style={estilos.dica}>
            Usado para ler prints de tela e extrair títulos de imagens.{'\n'}
            Superior ao Groq Vision para OCR. Grátis no Google AI Studio.
          </Text>
          <TouchableOpacity
            style={estilos.linkBtn}
            onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
          >
            <Ionicons name="open-outline" size={14} color={CORES.azulClaro} />
            <Text style={estilos.linkTxt}>Gerar chave Gemini gratuita</Text>
          </TouchableOpacity>
          <Input
            label="Chave da API Gemini"
            value={geminiKey}
            onChangeText={setGeminiKey}
            placeholder="AIza..."
            secreta={!mostrarGemini}
            onToggleSecreta={() => setMostrarGemini(!mostrarGemini)}
            icon="key-outline"
          />
          {config.geminiApiKey && <StatusOk texto="Gemini configurado (OCR ativo)" />}
          {!config.geminiApiKey && config.groqApiKey && (
            <Text style={{ fontSize: 11, color: CORES.corQueroAssistir, marginTop: 4 }}>
              ⚠ Usando Groq Vision como fallback (qualidade menor)
            </Text>
          )}
        </Secao>

        {/* ─── SUPABASE ─────────────────────────── */}
        <Secao titulo="Supabase (opcional)" icon="cloud-outline" badge="OPCIONAL">
          <Text style={estilos.dica}>
            Salva sua coleção na nuvem. Sem Supabase, os dados ficam só neste celular.
          </Text>
          <TouchableOpacity
            style={estilos.linkBtn}
            onPress={() => Linking.openURL('https://supabase.com/dashboard')}
          >
            <Ionicons name="open-outline" size={14} color={CORES.azulClaro} />
            <Text style={estilos.linkTxt}>Abrir painel Supabase</Text>
          </TouchableOpacity>
          <Input label="URL do Projeto" value={supaUrl} onChangeText={setSupaUrl} placeholder="https://xxx.supabase.co" icon="globe-outline" />
          <Input label="Anon Key" value={supaKey} onChangeText={setSupaKey} placeholder="eyJhbGc..." secreta={!mostrarSupa} onToggleSecreta={() => setMostrarSupa(!mostrarSupa)} icon="key-outline" />
          <View style={estilos.toggleRow}>
            <Text style={estilos.toggleLabel}>Ativar sincronização na nuvem</Text>
            <TouchableOpacity
              style={[estilos.toggle, usarSupa && estilos.toggleAtivo]}
              onPress={() => setUsarSupa(!usarSupa)}
            >
              <View style={[estilos.toggleDot, usarSupa && estilos.toggleDotAtivo]} />
            </TouchableOpacity>
          </View>
          {(supaUrl && supaKey) && (
            <TouchableOpacity style={estilos.btnTeste} onPress={testarSupabase} disabled={testando}>
              <Text style={{ color: CORES.azulClaro, fontSize: 13 }}>
                {testando ? 'Testando...' : '🔌 Testar conexão Supabase'}
              </Text>
            </TouchableOpacity>
          )}
        </Secao>

        {/* ─── DADOS ────────────────────────────── */}
        <Secao titulo="Dados & Exportação" icon="server-outline">
          <View style={estilos.statsGrid}>
            <StatItem label="Títulos"     valor={titulos.length} />
            <StatItem label="Assistidos"  valor={estatisticas.totalAssistidos} />
            <StatItem label="Assistindo"  valor={estatisticas.totalAssistindo} />
            <StatItem label="Quero Ver"   valor={estatisticas.totalQueroAssistir} />
          </View>

          <Text style={estilos.exportLabel}>📤 Compartilhar lista</Text>

          <TouchableOpacity style={estilos.btnExportar}
            onPress={() => exportarListaTxt('quero_assistir')}>
            <Ionicons name="bookmark-outline" size={18} color={CORES.azulClaro} />
            <View style={{ flex: 1 }}>
              <Text style={[estilos.btnExportarTxt, { color: CORES.azulClaro }]}>Lista "Quero Assistir"</Text>
              <Text style={estilos.btnExportarSub}>Compartilha como .txt</Text>
            </View>
            <Ionicons name="share-outline" size={16} color={CORES.textoFraco} />
          </TouchableOpacity>

          <TouchableOpacity style={estilos.btnExportar}
            onPress={() => exportarListaTxt('assistido')}>
            <Ionicons name="checkmark-circle-outline" size={18} color={CORES.corAssistido} />
            <View style={{ flex: 1 }}>
              <Text style={[estilos.btnExportarTxt, { color: CORES.corAssistido }]}>Lista "Já Assisti"</Text>
              <Text style={estilos.btnExportarSub}>Compartilha como .txt</Text>
            </View>
            <Ionicons name="share-outline" size={16} color={CORES.textoFraco} />
          </TouchableOpacity>

          <TouchableOpacity style={estilos.btnExportar}
            onPress={() => exportarListaTxt('todos')}>
            <Ionicons name="list-outline" size={18} color={CORES.textoPrimario} />
            <View style={{ flex: 1 }}>
              <Text style={estilos.btnExportarTxt}>Coleção completa</Text>
              <Text style={estilos.btnExportarSub}>Todos os títulos em .txt</Text>
            </View>
            <Ionicons name="share-outline" size={16} color={CORES.textoFraco} />
          </TouchableOpacity>

          <TouchableOpacity style={[estilos.btnExportar, { borderColor: '#25D36622' }]}
            onPress={compartilharWhatsApp}>
            <Text style={{ fontSize: 18 }}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={[estilos.btnExportarTxt, { color: '#25D366' }]}>Resumo para WhatsApp</Text>
              <Text style={estilos.btnExportarSub}>Estatísticas em formato mensagem</Text>
            </View>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
          </TouchableOpacity>

          <Text style={[estilos.exportLabel, { marginTop: 8 }]}>💾 Backup</Text>
          <TouchableOpacity style={estilos.btnExportar} onPress={exportarBackup}>
            <Ionicons name="download-outline" size={18} color={CORES.douradoPrimario} />
            <View style={{ flex: 1 }}>
              <Text style={estilos.btnExportarTxt}>Exportar backup completo</Text>
              <Text style={estilos.btnExportarSub}>Arquivo JSON com todos os dados</Text>
            </View>
          </TouchableOpacity>
        </Secao>

        {/* ─── BOTÃO SALVAR ─────────────────────── */}
        <TouchableOpacity style={estilos.btnSalvar} onPress={salvar} disabled={salvando}>
          <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnSalvarGrad}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={estilos.btnSalvarTxt}>{salvando ? 'Salvando...' : 'Salvar Configurações'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Rodapé */}
        <Text style={estilos.rodape}>
          Sem Spoilers v1.0.0 · AIra9 · Vagno Araújo 💙🖤💛
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Componentes auxiliares ──────────────────────────

function Secao({ titulo, icon, badge, children }: any) {
  return (
    <View style={estilos.secao}>
      <View style={estilos.secaoHeader}>
        <Ionicons name={icon} size={16} color={CORES.douradoPrimario} />
        <Text style={estilos.secaoTitulo}>{titulo}</Text>
        {badge && <View style={estilos.badge}><Text style={estilos.badgeTxt}>{badge}</Text></View>}
      </View>
      {children}
    </View>
  );
}

function Input({ label, value, onChangeText, placeholder, secreta, onToggleSecreta, icon }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={estilos.inputLabel}>{label}</Text>
      <View style={estilos.inputRow}>
        <Ionicons name={icon} size={16} color={CORES.textoSecundario} style={{ marginLeft: 12 }} />
        <TextInput
          style={estilos.inputField}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={CORES.textoFraco}
          secureTextEntry={secreta}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {onToggleSecreta && (
          <TouchableOpacity onPress={onToggleSecreta} style={{ padding: 8 }}>
            <Ionicons name={secreta ? 'eye-outline' : 'eye-off-outline'} size={18} color={CORES.textoSecundario} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function StatusOk({ texto }: { texto: string }) {
  return (
    <View style={estilos.statusOk}>
      <Ionicons name="checkmark-circle" size={14} color={CORES.corAssistido} />
      <Text style={{ fontSize: 12, color: CORES.corAssistido }}>{texto}</Text>
    </View>
  );
}

function StatItem({ label, valor }: { label: string; valor: number }) {
  return (
    <View style={estilos.statItem}>
      <Text style={estilos.statValor}>{valor}</Text>
      <Text style={estilos.statLabel}>{label}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container:    { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:       { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerTitulo: { fontSize: 26, fontWeight: '800', color: CORES.textoPrimario },
  headerSub:    { fontSize: 12, color: CORES.textoSecundario },
  secao:        { marginBottom: 24, backgroundColor: CORES.fundoCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: CORES.borda },
  secaoHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  secaoTitulo:  { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario, flex: 1 },
  badge:        { backgroundColor: CORES.corAssistido + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt:     { fontSize: 10, color: CORES.corAssistido, fontWeight: '700' },
  dica:         { fontSize: 12, color: CORES.textoSecundario, lineHeight: 18, marginBottom: 10 },
  linkBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  linkTxt:      { fontSize: 12, color: CORES.azulClaro },
  inputLabel:   { fontSize: 11, color: CORES.textoSecundario, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: CORES.fundoCardElevado, borderRadius: 10, borderWidth: 1, borderColor: CORES.borda },
  inputField:   { flex: 1, color: CORES.textoPrimario, paddingVertical: 12, paddingHorizontal: 8, fontSize: 13 },
  statusOk:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  toggleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 8 },
  toggleLabel:  { fontSize: 13, color: CORES.textoPrimario },
  toggle:       { width: 46, height: 26, borderRadius: 13, backgroundColor: CORES.borda, padding: 3 },
  toggleAtivo:  { backgroundColor: CORES.azulPrimario },
  toggleDot:    { width: 20, height: 20, borderRadius: 10, backgroundColor: CORES.textoSecundario },
  toggleDotAtivo: { backgroundColor: '#fff', transform: [{ translateX: 20 }] },
  btnTeste:     { padding: 10, alignItems: 'center', borderWidth: 1, borderColor: CORES.azulPrimario, borderRadius: 8, marginTop: 4 },
  statsGrid:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statItem:     { alignItems: 'center' },
  statValor:    { fontSize: 22, fontWeight: '800', color: CORES.douradoPrimario },
  statLabel:    { fontSize: 10, color: CORES.textoSecundario, marginTop: 2 },
  btnExportar:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: CORES.borda, marginBottom: 8 },
  btnExportarTxt: { fontSize: 13, color: CORES.textoPrimario, fontWeight: '600' },
  btnExportarSub: { fontSize: 11, color: CORES.textoFraco, marginTop: 1 },
  exportLabel:    { fontSize: 11, color: CORES.textoFraco, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4, marginBottom: 6 },
  btnSalvar:    { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  btnSalvarGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  btnSalvarTxt: { fontSize: 16, fontWeight: '700', color: '#fff' },
  rodape:       { textAlign: 'center', fontSize: 11, color: CORES.textoFraco, marginBottom: 20 },
});
