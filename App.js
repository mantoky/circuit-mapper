/**
 * CIRCUIT MAPPER
 * Mapeamento e Cadastro de Circuitos Eletricos - laudo tecnico NBR 5410
 * ------------------------------------------------------------------
 * Autor: Robson do Carmo - Engenharia Eletrica
 * Stack: React Native + Expo (Android APK / iOS)
 */
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProjectProvider, useProject } from './src/store/ProjectContext';
import Navigation from './src/navigation';
import { colors, type } from './src/theme';

function Gate() {
  const { ready } = useProject();
  if (!ready) {
    return (
      <View style={styles.splash}>
        <View style={styles.stripe} />
        <Text style={styles.brand}>CIRCUIT MAPPER</Text>
        <Text style={styles.tag}>MAPEAMENTO E CADASTRO DE CIRCUITOS ELETRICOS</Text>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 28 }} />
        <Text style={styles.load}>Carregando levantamento local...</Text>
      </View>
    );
  }
  return <Navigation />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.bgDeep} />
      <ProjectProvider>
        <Gate />
      </ProjectProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  stripe: { width: 90, height: 7, backgroundColor: colors.primary, borderRadius: 4, marginBottom: 26 },
  brand: { ...type.display, color: colors.text, textAlign: 'center' },
  tag: { ...type.label, color: colors.primary, marginTop: 10, textAlign: 'center', fontSize: 11 },
  load: { ...type.caption, color: colors.textDim, marginTop: 16 },
});
