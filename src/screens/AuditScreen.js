/**
 * DOSSIE DE CONFORMIDADE - lista navegavel de apontamentos NBR 5410.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import KpiCard from '../components/KpiCard';
import { colors, type, metrics } from '../theme';
import { useProject } from '../store/ProjectContext';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'error', label: 'Nao conformidades' },
  { key: 'warn', label: 'Ressalvas' },
];

export default function AuditScreen() {
  const P = useProject();
  const s = P.validation.summary;
  const [f, setF] = useState('all');

  const data = useMemo(() => {
    const list = P.validation.findings;
    const sorted = [...list].sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1));
    return f === 'all' ? sorted : sorted.filter((x) => x.level === f);
  }, [P.validation.findings, f]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="CONFORMIDADE" subtitle="Checklist automatico ABNT NBR 5410" />
      <View style={styles.kpis}>
        <KpiCard value={s.errors} label="Nao conf." accent={colors.danger} />
        <KpiCard value={s.warnings} label="Ressalvas" accent={colors.warn} />
        <KpiCard value={s.conform} label="Conformes" accent={colors.ok} />
        <KpiCard value={`${s.conformityIndex}%`} label="Indice" />
      </View>
      <View style={styles.filters}>
        {FILTERS.map((x) => (
          <Pressable key={x.key} onPress={() => setF(x.key)}
            style={[styles.filter, f === x.key && styles.filterOn]} hitSlop={metrics.hitSlop}>
            <Text style={[styles.filterTxt, f === x.key && styles.filterTxtOn]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: metrics.pad, paddingBottom: 60, gap: 10 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: item.level === 'error' ? colors.danger : colors.warn }]}>
            <View style={styles.cardTop}>
              <View style={[styles.code, { borderColor: item.level === 'error' ? colors.danger : colors.warn }]}>
                <Text style={[styles.codeTxt, { color: item.level === 'error' ? colors.danger : colors.warn }]}>
                  {item.code}
                </Text>
              </View>
              <Text style={styles.node} numberOfLines={1}>{item.nodeLabel}</Text>
            </View>
            <Text style={styles.path} numberOfLines={2}>{item.path}</Text>
            <Text style={styles.msg}>{item.message}</Text>
            <Text style={styles.action}>▸ {item.action}</Text>
            <Text style={styles.ref}>{item.ref}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>
              {P.tree.length ? 'Nenhum apontamento nesta categoria.' : 'Cadastre circuitos para gerar a verificacao.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  kpis: { flexDirection: 'row', gap: 8, padding: metrics.pad },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: metrics.pad, paddingBottom: 10 },
  filter: {
    flex: 1, minHeight: 48, borderRadius: metrics.radius, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderWidth: metrics.borderW, borderColor: colors.border,
  },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTxt: { ...type.label, color: colors.textMuted, fontSize: 10.5 },
  filterTxtOn: { color: colors.onPrimary },
  card: { backgroundColor: colors.surface, borderRadius: metrics.radius, padding: 14, borderLeftWidth: metrics.accentW },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { borderWidth: 1.4, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  codeTxt: { ...type.label, fontSize: 10 },
  node: { ...type.bodyBold, color: colors.text, flex: 1 },
  path: { ...type.caption, color: colors.textDim, fontSize: 11, marginTop: 6 },
  msg: { ...type.caption, color: colors.text, marginTop: 8, lineHeight: 19 },
  action: { ...type.caption, color: colors.primary, marginTop: 6, lineHeight: 18 },
  ref: { ...type.caption, color: colors.textDim, fontSize: 10.5, marginTop: 6, fontStyle: 'italic' },
  empty: { padding: 40, alignItems: 'center' },
  emptyTxt: { ...type.caption, color: colors.textDim, textAlign: 'center' },
});
