// app/(tabs)/_layout.tsx — Navegação por abas estilo HBO dark

import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { CORES } from '@/constants/cores';

function TabIcon({ name, focused, lib = 'ionicons' }: { name: string; focused: boolean; lib?: string }) {
  const cor = focused ? CORES.douradoPrimario : CORES.textoFraco;
  const tamanho = 22;

  if (lib === 'fa5') {
    return <FontAwesome5 name={name} size={tamanho - 2} color={cor} solid={focused} />;
  }
  return <Ionicons name={name as any} size={tamanho} color={cor} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   CORES.douradoPrimario,
        tabBarInactiveTintColor: CORES.textoFraco,
        tabBarStyle: {
          backgroundColor: CORES.fundoCard,
          borderTopColor:  CORES.borda,
          borderTopWidth:  1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="listas"
        options={{
          title: 'Listas',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'list' : 'list-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'IA',
          tabBarIcon: ({ focused }) => (
            <View style={[estilos.iaBtn, focused && estilos.iaBtnAtivo]}>
              <Ionicons name="sparkles" size={22} color={focused ? CORES.textoInvertido : CORES.douradoPrimario} />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="descobrir"
        options={{
          title: 'Descobrir',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="configuracoes"
        options={{
          title: 'Config',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  iaBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CORES.douradoFundo,
    borderWidth: 1.5,
    borderColor: CORES.douradoPrimario,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iaBtnAtivo: {
    backgroundColor: CORES.douradoPrimario,
    borderColor: CORES.douradoClaro,
  },
});
