// app/importar.tsx — Importação inteligente de listas

import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, FlatList, ActivityIndicator, Image, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { CORES, GRADIENTES } from '@/constants/cores';
import { useApp } from '@/lib/app-context';
import {
  selecionarArquivo,
  extrairItensDoArquivo,
  checarDuplicata,
  importarViaPrintInteligente,
  ImportacaoExtraida,
} from '@/lib/importacao';
import { buscarPorNome, detalharFilme, detalharSerie, converterFilme, converterSerie } from '@/lib/tmdb';
import { TituloImportado } from '@/types';

type EtapaImport = 'inicio' | 'processando' | 'revisao' | 'concluido';

export default function ImportarScreen() {
  const router = useRouter();
  const { config, importarLote, titulos } = useApp();
  const [etapa,     setEtapa]     = useState<EtapaImport>('inicio');
  const [itens,     setItens]     = useState<TituloImportado[]>([]);
  const [progresso, setProgresso] = useState(0);
  const [totalProg, setTotalProg] = useState(0);
  const [resultado, setResultado] = useState({ adicionados: 0, duplicatas: 0 });
  const cancelado = useRef(false);

  async function processarItens(entrada: ImportacaoExtraida[]) {
    if (!entrada.length) {
      Alert.alert(
        'Vazio',
        'Nenhum título válido foi encontrado. Use TXT/CSV/XLSX com uma linha por título ou colunas Título, Diretor e Ano.'
      );
      setEtapa('inicio');
      return;
    }

    cancelado.current = false;
    const novosItens: TituloImportado[] = entrada.map((item) => ({
      tituloOriginal: item.titulo,
      duplicata: checarDuplicata(item.titulo, titulos),
      status: 'buscando',
      selecionado: true,
      anoExtraido: item.ano,
      diretoresExtraidos: item.diretores,
    }));

    setItens(novosItens);
    setEtapa('processando');
    setTotalProg(entrada.length);
    setProgresso(0);

    const temTMDB = !!config.tmdbApiKey;
    const atualizado = [...novosItens];

    for (let i = 0; i < entrada.length; i++) {
      if (cancelado.current) break;
      setProgresso(i + 1);

      const nome = entrada[i].titulo;
      const dup = checarDuplicata(nome, titulos);
      if (dup) {
        atualizado[i] = { ...atualizado[i], status: 'duplicata', duplicata: dup, selecionado: false };
        setItens([...atualizado]);
        continue;
      }

      if (temTMDB) {
        const tmdbResult = await buscarPorNome(nome);
        atualizado[i] = tmdbResult
          ? { ...atualizado[i], status: 'encontrado', tmdbResult, selecionado: true }
          : { ...atualizado[i], status: 'nao_encontrado', selecionado: true };
      } else {
        atualizado[i] = { ...atualizado[i], status: 'nao_encontrado', selecionado: true };
      }

      setItens([...atualizado]);
      await new Promise((r) => setTimeout(r, 180));
    }

    setEtapa('revisao');
  }

  async function importarArquivo() {
    try {
      const result = await selecionarArquivo();
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setEtapa('processando');
      setProgresso(0);
      setTotalProg(0);
      const itensExtraidos = await extrairItensDoArquivo(asset.uri, asset.mimeType, asset.name);
      await processarItens(itensExtraidos);
    } catch (e) {
      Alert.alert(
        'Formato não suportado',
        e instanceof Error ? e.message : 'Use arquivos TXT, CSV ou XLSX. PDF/DOC/DOCX não são confiáveis no Expo Go.'
      );
      setEtapa('inicio');
    }
  }

  async function importarPrint() {
    const temOCR = !!(config.geminiApiKey || config.groqApiKey);
    if (!temOCR) {
      Alert.alert('Chave de IA necessária', 'Configure Gemini ou Groq nas Configurações para usar OCR de imagens.');
      return;
    }
    const nomes = await importarViaPrintInteligente(config.groqApiKey, config.geminiApiKey ?? '');
    if (!nomes.length) {
      Alert.alert('Nada encontrado', 'Não foi possível extrair títulos da imagem. Se o Gemini acusar cota 429, tente Groq ou importe por TXT/CSV/XLSX.');
      return;
    }
    await processarItens(nomes.map((titulo) => ({ titulo, diretores: [] })));
  }

  async function confirmarImportacao() {
    const temTMDB = !!config.tmdbApiKey;
    const selecionados = itens.filter((i) => i.selecionado && i.status !== 'duplicata');

    const dadosParaImportar: any[] = await Promise.all(
      selecionados.map(async (item) => {
        if (item.tmdbResult && temTMDB) {
          try {
            if (item.tmdbResult.media_type === 'movie') {
              const d = await detalharFilme(item.tmdbResult.id);
              if (d) {
                const convertido = converterFilme(d);
                return {
                  ...convertido,
                  ano_lancamento: convertido.ano_lancamento ?? item.anoExtraido,
                  diretores: convertido.diretores?.length ? convertido.diretores : item.diretoresExtraidos ?? [],
                  status_usuario: 'quero_assistir',
                  origem_importacao: 'arquivo',
                };
              }
            } else {
              const d = await detalharSerie(item.tmdbResult.id);
              if (d) {
                const convertido = converterSerie(d);
                return {
                  ...convertido,
                  ano_lancamento: convertido.ano_lancamento ?? item.anoExtraido,
                  diretores: convertido.diretores?.length ? convertido.diretores : item.diretoresExtraidos ?? [],
                  status_usuario: 'quero_assistir',
                  origem_importacao: 'arquivo',
                };
              }
            }
          } catch { /* fallback abaixo */ }
        }

        return {
          titulo: item.tituloOriginal,
          tipo: 'filme',
          ano_lancamento: item.anoExtraido,
          generos: [],
          diretores: item.diretoresExtraidos ?? [],
          elenco: [],
          tags: [],
          tem_plot_twist: false,
          tem_continuacao: false,
          status_usuario: 'quero_assistir',
          origem_importacao: 'arquivo',
        };
      })
    );

    const { adicionados, duplicatas: dups } = await importarLote(dadosParaImportar);
    setResultado({ adicionados, duplicatas: dups + itens.filter((i) => i.status === 'duplicata').length });
    setEtapa('concluido');
  }

  function toggleSelecao(idx: number) {
    const copia = [...itens];
    copia[idx].selecionado = !copia[idx].selecionado;
    setItens(copia);
  }

  const selecionadosCount = itens.filter((i) => i.selecionado && i.status !== 'duplicata').length;
  const duplicatasCount = itens.filter((i) => i.status === 'duplicata').length;

  return (
    <View style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.btnFechar}>
          <Ionicons name="close" size={22} color={CORES.textoPrimario} />
        </TouchableOpacity>
        <Text style={estilos.headerTitulo}>Importar Lista</Text>
      </View>

      {etapa === 'inicio' && (
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <Text style={estilos.descricao}>
            Importe listas confiáveis em TXT, CSV ou XLSX. Para melhores resultados, use uma linha por título ou colunas chamadas Título, Diretor e Ano.
          </Text>

          <OpcaoCard
            icon="document-text-outline"
            titulo="Texto ou CSV (.txt, .csv)"
            descricao="Uma linha por título. Também aceita colunas: Título; Diretor; Ano"
            cor={CORES.corAssistindo}
            onPress={importarArquivo}
          />
          <OpcaoCard
            icon="grid-outline"
            titulo="Planilha Excel (.xlsx, .xls)"
            descricao="Recomendado: colunas Título, Diretor e Ano. É o formato mais preciso."
            cor={CORES.corAssistido}
            onPress={importarArquivo}
          />
          <OpcaoCard
            icon="image-outline"
            titulo="Print de tela (OCR via Gemini/Groq)"
            descricao="Experimental. Se a IA bater cota, prefira TXT/CSV/XLSX."
            cor={CORES.douradoPrimario}
            badge="IA"
            onPress={importarPrint}
            requerGroq
            temGroq={!!(config.geminiApiKey || config.groqApiKey)}
          />

          <View style={estilos.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={CORES.azulClaro} />
            <Text style={estilos.infoTxt}>
              PDF, DOC e DOCX foram removidos da importação local porque no Expo Go eles podem virar texto binário e gerar títulos falsos. Converta para XLSX, CSV ou TXT.
            </Text>
          </View>
        </ScrollView>
      )}

      {etapa === 'processando' && (
        <View style={estilos.processandoContainer}>
          <ActivityIndicator size="large" color={CORES.azulClaro} />
          <Text style={estilos.processandoTxt}>
            {totalProg > 0 ? `Buscando ${progresso}/${totalProg} títulos no TMDB...` : 'Lendo arquivo...'}
          </Text>
          <View style={estilos.barraContainer}>
            <View style={[estilos.barraProgresso, { width: `${totalProg > 0 ? (progresso / totalProg) * 100 : 0}%` }]} />
          </View>
          <TouchableOpacity
            style={estilos.btnCancelar}
            onPress={() => { cancelado.current = true; setEtapa('inicio'); }}
          >
            <Text style={{ color: CORES.corAbandonado }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      {etapa === 'revisao' && (
        <View style={{ flex: 1 }}>
          <View style={estilos.resumoBar}>
            <Text style={estilos.resumoTxt}>
              {selecionadosCount} para adicionar · {duplicatasCount} duplicatas ignoradas
            </Text>
            <TouchableOpacity onPress={() => {
              const copia = itens.map((i) => ({ ...i, selecionado: i.status !== 'duplicata' }));
              setItens(copia);
            }}>
              <Text style={{ color: CORES.azulClaro, fontSize: 12 }}>Selecionar todos</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={itens}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            renderItem={({ item, index }) => {
              const esDuplicata = item.status === 'duplicata';
              const subtitulo = [
                item.anoExtraido ? String(item.anoExtraido) : '',
                item.diretoresExtraidos?.length ? item.diretoresExtraidos.join(', ') : '',
              ].filter(Boolean).join(' • ');

              return (
                <TouchableOpacity
                  style={[
                    estilos.itemCard,
                    esDuplicata && estilos.itemDuplicata,
                    item.selecionado && !esDuplicata && estilos.itemSelecionado,
                  ]}
                  onPress={() => !esDuplicata && toggleSelecao(index)}
                  activeOpacity={esDuplicata ? 1 : 0.8}
                >
                  <View style={[estilos.checkbox, item.selecionado && !esDuplicata && estilos.checkboxAtivo]}>
                    {(item.selecionado && !esDuplicata) && <Ionicons name="checkmark" size={14} color="#fff" />}
                    {esDuplicata && <Ionicons name="copy-outline" size={14} color={CORES.textoFraco} />}
                  </View>
                  {item.tmdbResult?.poster_path ? (
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w92${item.tmdbResult.poster_path}` }}
                      style={estilos.itemPoster}
                    />
                  ) : (
                    <View style={[estilos.itemPoster, estilos.itemPosterVazio]}>
                      <Ionicons name="film-outline" size={16} color={CORES.textoFraco} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.itemTitulo} numberOfLines={1}>
                      {item.tmdbResult?.title ?? item.tmdbResult?.name ?? item.tituloOriginal}
                    </Text>
                    <Text style={estilos.itemOriginal} numberOfLines={1}>
                      {subtitulo || (item.tituloOriginal !== (item.tmdbResult?.title ?? item.tmdbResult?.name) ? item.tituloOriginal : '')}
                    </Text>
                    <View style={estilos.itemBadges}>
                      {esDuplicata ? (
                        <View style={[estilos.badge, { backgroundColor: CORES.textoFraco + '22' }]}>
                          <Text style={[estilos.badgeTxt, { color: CORES.textoFraco }]}>Já existe</Text>
                        </View>
                      ) : item.status === 'encontrado' ? (
                        <View style={[estilos.badge, { backgroundColor: CORES.corAssistido + '22' }]}>
                          <Text style={[estilos.badgeTxt, { color: CORES.corAssistido }]}>✓ TMDB</Text>
                        </View>
                      ) : (
                        <View style={[estilos.badge, { backgroundColor: CORES.corQueroAssistir + '22' }]}>
                          <Text style={[estilos.badgeTxt, { color: CORES.corQueroAssistir }]}>Manual</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          <View style={estilos.rodapeRevisao}>
            <TouchableOpacity style={estilos.btnVoltar2} onPress={() => setEtapa('inicio')}>
              <Text style={{ color: CORES.textoSecundario }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[estilos.btnConfirmar, selecionadosCount === 0 && { opacity: 0.4 }]}
              onPress={confirmarImportacao}
              disabled={selecionadosCount === 0}
            >
              <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnConfirmarGrad}>
                <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                <Text style={estilos.btnConfirmarTxt}>Importar {selecionadosCount} títulos</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {etapa === 'concluido' && (
        <View style={estilos.concluidoContainer}>
          <View style={estilos.concluidoIcone}>
            <Ionicons name="checkmark-circle" size={64} color={CORES.corAssistido} />
          </View>
          <Text style={estilos.concluidoTitulo}>Importação concluída!</Text>
          <View style={estilos.concluidoStats}>
            <View style={estilos.statBloco}>
              <Text style={[estilos.statNum, { color: CORES.corAssistido }]}>{resultado.adicionados}</Text>
              <Text style={estilos.statLabel}>Adicionados</Text>
            </View>
            <View style={estilos.statBloco}>
              <Text style={[estilos.statNum, { color: CORES.textoSecundario }]}>{resultado.duplicatas}</Text>
              <Text style={estilos.statLabel}>Ignorados (já existiam)</Text>
            </View>
          </View>
          <TouchableOpacity style={estilos.btnVoltar2} onPress={() => router.back()}>
            <LinearGradient colors={GRADIENTES.botaoAzul as any} style={estilos.btnConfirmarGrad}>
              <Text style={estilos.btnConfirmarTxt}>Ver minha coleção</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function OpcaoCard({ icon, titulo, descricao, cor, onPress, badge, requerGroq, temGroq }: any) {
  const desativado = requerGroq && !temGroq;
  return (
    <TouchableOpacity
      style={[estilos.opcaoCard, desativado && { opacity: 0.5 }]}
      onPress={desativado ? () => Alert.alert('Configure IA', 'Acesse as Configurações e adicione uma chave Gemini ou Groq.') : onPress}
      activeOpacity={0.8}
    >
      <View style={[estilos.opcaoIcone, { backgroundColor: cor + '22' }]}> 
        <Ionicons name={icon} size={24} color={cor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={estilos.opcaoTitulo}>{titulo}</Text>
          {badge && <View style={[estilos.badge, { backgroundColor: CORES.douradoFundo }]}><Text style={[estilos.badgeTxt, { color: CORES.douradoClaro }]}>{badge}</Text></View>}
        </View>
        <Text style={estilos.opcaoDesc}>{descricao}</Text>
        {requerGroq && !temGroq && <Text style={{ fontSize: 10, color: CORES.corQueroAssistir, marginTop: 4 }}>⚠ Requer chave de IA</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={CORES.textoFraco} />
    </TouchableOpacity>
  );
}

const estilos = StyleSheet.create({
  container:      { flex: 1, backgroundColor: CORES.fundoPrincipal },
  header:         { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  btnFechar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: CORES.fundoCard, alignItems: 'center', justifyContent: 'center' },
  headerTitulo:   { fontSize: 18, fontWeight: '800', color: CORES.textoPrimario },
  descricao:      { fontSize: 13, color: CORES.textoSecundario, lineHeight: 20 },
  opcaoCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CORES.fundoCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: CORES.borda },
  opcaoIcone:     { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  opcaoTitulo:    { fontSize: 14, fontWeight: '700', color: CORES.textoPrimario },
  opcaoDesc:      { fontSize: 12, color: CORES.textoSecundario, marginTop: 2, lineHeight: 16 },
  infoBox:        { flexDirection: 'row', gap: 8, padding: 14, backgroundColor: CORES.azulFundoSutil, borderRadius: 10, borderWidth: 1, borderColor: CORES.azulPrimario + '40' },
  infoTxt:        { flex: 1, fontSize: 12, color: CORES.textoSecundario, lineHeight: 18 },
  processandoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 },
  processandoTxt: { fontSize: 14, color: CORES.textoPrimario, textAlign: 'center' },
  barraContainer: { width: '100%', height: 6, backgroundColor: CORES.borda, borderRadius: 3, overflow: 'hidden' },
  barraProgresso: { height: '100%', backgroundColor: CORES.azulClaro, borderRadius: 3 },
  btnCancelar:    { padding: 12 },
  resumoBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: CORES.fundoCard, borderBottomWidth: 1, borderBottomColor: CORES.borda },
  resumoTxt:      { fontSize: 12, color: CORES.textoSecundario },
  itemCard:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CORES.fundoCard, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: CORES.borda },
  itemDuplicata:  { opacity: 0.5 },
  itemSelecionado:{ borderColor: CORES.azulClaro + '55', backgroundColor: CORES.azulFundoSutil },
  checkbox:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: CORES.borda, alignItems: 'center', justifyContent: 'center' },
  checkboxAtivo:  { backgroundColor: CORES.azulPrimario, borderColor: CORES.azulPrimario },
  itemPoster:     { width: 36, height: 54, borderRadius: 6, resizeMode: 'cover' },
  itemPosterVazio:{ backgroundColor: CORES.fundoCardElevado, alignItems: 'center', justifyContent: 'center' },
  itemTitulo:     { fontSize: 13, fontWeight: '700', color: CORES.textoPrimario },
  itemOriginal:   { fontSize: 10, color: CORES.textoFraco },
  itemBadges:     { flexDirection: 'row', gap: 6, marginTop: 4 },
  badge:          { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt:       { fontSize: 10, fontWeight: '700' },
  rodapeRevisao:  { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, padding: 16, backgroundColor: CORES.fundoCard, borderTopWidth: 1, borderTopColor: CORES.borda },
  btnVoltar2:     { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: CORES.borda, alignItems: 'center', justifyContent: 'center' },
  btnConfirmar:   { flex: 2, borderRadius: 12, overflow: 'hidden' },
  btnConfirmarGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
  btnConfirmarTxt:{ fontSize: 14, fontWeight: '700', color: '#fff' },
  concluidoContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32 },
  concluidoIcone: { width: 100, height: 100, borderRadius: 50, backgroundColor: CORES.corAssistido + '22', alignItems: 'center', justifyContent: 'center' },
  concluidoTitulo:{ fontSize: 22, fontWeight: '800', color: CORES.textoPrimario },
  concluidoStats: { flexDirection: 'row', gap: 32 },
  statBloco:      { alignItems: 'center' },
  statNum:        { fontSize: 36, fontWeight: '900' },
  statLabel:      { fontSize: 12, color: CORES.textoSecundario, textAlign: 'center' },
});
