import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { CORES } from '@/constants/cores';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Ops!', headerShown: false }} />
      <View style={s.container}>
        <Text style={s.titulo}>404</Text>
        <Text style={s.sub}>Tela não encontrada</Text>
        <Link href="/" style={s.link}>
          Voltar ao início
        </Link>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CORES.fundoPrincipal, gap: 12 },
  titulo:    { fontSize: 64, fontWeight: '900', color: CORES.azulClaro },
  sub:       { fontSize: 16, color: CORES.textoSecundario },
  link:      { fontSize: 14, color: CORES.douradoPrimario, marginTop: 8 },
});
