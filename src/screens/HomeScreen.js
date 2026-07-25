/**
 * PAINEL DO PROJETO - ponto de entrada, alterna Modo Construcao / Modo Laudo.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import KpiCard from '../components/KpiCard';
import VButton from '../components/VButton';
import { colors, type, metrics } from '../theme';
import { useProject } from '../store/ProjectContext';
import { countAll, countByType, depth } from '../core/treeEngine';
import { typeInfo } from '../core/schema';
import { importJson } from '../export/jsonExport';

export default function HomeScreen({ navigation }) {
  const P = useProject();
  const s = P.validation.summary;
  const counts = countByType(P.tree);
  const empty = !P.tree.length;

  const doImport = async () => {
    try {
      const data = await importJson();
      if (data) { P.importProject(data); Alert.alert('Importacao', 'Projeto carregado com sucesso.'); }
    } catch (e) { Alert.alert('Erro na importacao', e.message); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="CIRCUIT MAPPER"
        subtitle="Mapeamento e Cadastro de Circuitos Eletricos"
      />
      <ScrollView contentContainerStyle={{ padding: metrics.pad, paddingBottom: 40 }}>
        {empty ? (
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>NOVO LEVANTAMENTO</Text>
            <Text style={styles.heroTxt}>
              Cadastre a hierarquia completa da instalacao — do suprimento primario ate a carga terminal —
              e gere o laudo tecnico com quadro de cargas automatico.
            </Text>
            <VButton label="Iniciar cadastro" icon="+" size="lg"
              onPress={() => navigation.navigate('Construcao')} style={{ marginTop: 18 }} />
            <VButton label="Carregar dados de demonstracao" variant="ghost" icon="DEMO"
              onPress={P.loadDemo} style={{ marginTop: 10 }} />
            <VButton label="Importar projeto (.json)" variant="dark" icon="IMP"
              onPress={doImport} style={{ marginTop: 10 }} />
          </View>
        ) : (
          <>
            <Text style={styles.projTitle} numberOfLines={2}>
              {P.header.site || 'Projeto sem identificacao'}
            </Text>
            <Text style={styles.projSub}>
              {[P.header.reportNumber, P.header.location, P.header.equipmentTag].filter(Boolean).join('  ·  ') || '—'}
            </Text>

            <View style={styles.kpis}>
              <KpiCard value={countAll(P.tree)} label="Itens cadastrados" />
              <KpiCard value={depth(P.tree)} label="Niveis" />
              <KpiCard value={s.circuits} label="Circuitos" />
            </View>
            <View style={styles.kpis}>
              <KpiCard value={s.panels} label="Quadros" />
              <KpiCard value={`${s.totalKva}`} label="kVA instalados" />
              <KpiCard value={`${s.conformityIndex}%`} label="Conformidade"
                accent={s.errors ? colors.danger : s.warnings ? colors.warn : colors.ok} />
            </View>
            <View style={styles.kpis}>
              <KpiCard value={s.errors} label="Nao conformidades" accent={colors.danger} />
              <KpiCard value={s.warnings} label="Ressalvas" accent={colors.warn} />
              <KpiCard value={s.conform} label="Itens conformes" accent={colors.ok} />
            </View>

            <View style={[styles.verdict, {
              borderColor: s.errors ? colors.danger : s.warnings ? colors.warn : colors.ok,
            }]}>
              <Text style={[styles.verdictTxt, {
                color: s.errors ? colors.danger : s.warnings ? colors.warn : colors.ok,
              }]}>{s.verdict}</Text>
            </View>

            <Text style={styles.section}>Inventario por categoria</Text>
            {Object.entries(counts).map(([k, v]) => (
              <View key={k} style={styles.invRow}>
                <View style={[styles.invTag, { borderColor: typeInfo(k).color }]}>
                  <Text style={[styles.invTagTxt, { color: typeInfo(k).color }]}>{typeInfo(k).short}</Text>
                </View>
                <Text style={styles.invLabel}>{typeInfo(k).label}</Text>
                <Text style={styles.invValue}>{v}</Text>
              </View>
            ))}

            <Text style={styles.section}>Acoes</Text>
            <VButton label="Modo Construcao" icon="ARV" size="lg"
              onPress={() => navigation.navigate('Construcao')} />
            <VButton label="Modo Laudo / Relatorios" icon="DOC" variant="ghost" size="lg"
              onPress={() => navigation.navigate('Laudo')} style={{ marginTop: 10 }} />
            <VButton label="Importar projeto (.json)" variant="dark" icon="IMP"
              onPress={doImport} style={{ marginTop: 10 }} />
            <VButton label="Limpar projeto" variant="danger" icon="DEL" style={{ marginTop: 10 }}
              onPress={() => Alert.alert('Limpar projeto', 'Todos os dados locais serao apagados. Confirmar?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpar', style: 'destructive', onPress: P.reset },
              ])} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.surface, borderRadius: metrics.radiusLg, padding: metrics.padLg, borderLeftWidth: metrics.accentW, borderLeftColor: colors.primary },
  heroTitle: { ...type.h1, color: colors.primary },
  heroTxt: { ...type.body, color: colors.textMuted, marginTop: 8, lineHeight: 24 },
  projTitle: { ...type.h1, color: colors.text },
  projSub: { ...type.caption, color: colors.primary, marginTop: 4, marginBottom: 16 },
  kpis: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  verdict: { borderWidth: 2, borderRadius: metrics.radius, padding: 14, marginTop: 8, marginBottom: 6 },
  verdictTxt: { ...type.bodyBold, textAlign: 'center', letterSpacing: 0.5 },
  section: {
    ...type.label, color: colors.primary, marginTop: 24, marginBottom: 10, fontSize: 13,
    borderTopWidth: metrics.borderW, borderColor: colors.border, paddingTop: 14,
  },
  invRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6,
  },
  invTag: { minWidth: 48, alignItems: 'center', borderWidth: 1.3, borderRadius: 4, paddingVertical: 2 },
  invTagTxt: { ...type.label, fontSize: 9.5 },
  invLabel: { ...type.body, color: colors.text, flex: 1 },
  invValue: { ...type.h3, color: colors.primary },
});
