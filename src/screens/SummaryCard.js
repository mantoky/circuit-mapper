/**
 * RESUMO EXECUTIVO renderizado nativamente - capturado como .png/.jpg
 * para compartilhamento rapido no grupo da operacao.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type } from '../theme';
import { useProject } from '../store/ProjectContext';
import { countAll, depth } from '../core/treeEngine';

export default function SummaryCard() {
  const P = useProject();
  const s = P.validation.summary;
  const h = P.header;
  const accent = s.errors ? colors.danger : s.warnings ? colors.warn : colors.ok;

  return (
    <View style={styles.card}>
      <View style={styles.topBar} />
      <Text style={styles.kicker}>LAUDO TECNICO · MAPEAMENTO DE CIRCUITOS ELETRICOS</Text>
      <Text style={styles.title} numberOfLines={2}>{h.site || 'Instalacao nao identificada'}</Text>
      <Text style={styles.sub}>
        {[h.reportNumber, h.equipmentTag, h.location].filter(Boolean).join('   ·   ')}
      </Text>

      <View style={styles.grid}>
        <Cell v={countAll(P.tree)} k="Itens" />
        <Cell v={depth(P.tree)} k="Niveis" />
        <Cell v={s.panels} k="Quadros" />
        <Cell v={s.circuits} k="Circuitos" />
        <Cell v={s.totalKva} k="kVA" />
      </View>
      <View style={styles.grid}>
        <Cell v={s.errors} k="Nao conformidades" c={colors.danger} />
        <Cell v={s.warnings} k="Ressalvas" c={colors.warn} />
        <Cell v={s.conform} k="Conformes" c={colors.ok} />
        <Cell v={`${s.conformityIndex}%`} k="Indice" c={accent} />
      </View>

      <View style={[styles.verdict, { borderColor: accent }]}>
        <Text style={[styles.verdictTxt, { color: accent }]}>{s.verdict}</Text>
      </View>

      <Text style={styles.footer}>
        {h.technician || '—'}  ·  {h.technicianTitle || ''}  ·  {h.crea || ''}
        {'\n'}Emitido em {h.issueDate || '—'}   |   Circuit Mapper
      </Text>
      <View style={styles.hazard} />
    </View>
  );
}

function Cell({ v, k, c = colors.primary }) {
  return (
    <View style={[styles.cell, { borderLeftColor: c }]}>
      <Text style={[styles.cellV, { color: c }]}>{v}</Text>
      <Text style={styles.cellK}>{k}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bg, padding: 34, width: 1240 },
  topBar: { height: 14, backgroundColor: colors.primary, marginBottom: 26, borderRadius: 3 },
  kicker: { ...type.label, color: colors.primary, fontSize: 18, letterSpacing: 2 },
  title: { ...type.display, color: colors.text, fontSize: 48, marginTop: 12 },
  sub: { ...type.body, color: colors.textMuted, fontSize: 22, marginTop: 10, marginBottom: 30 },
  grid: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cell: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 12, padding: 20, borderLeftWidth: 8,
  },
  cellV: { ...type.display, fontSize: 46 },
  cellK: { ...type.label, color: colors.textMuted, fontSize: 15, marginTop: 8 },
  verdict: { borderWidth: 4, borderRadius: 12, padding: 22, marginTop: 16 },
  verdictTxt: { ...type.h1, fontSize: 30, textAlign: 'center', letterSpacing: 1 },
  footer: { ...type.caption, color: colors.textDim, fontSize: 18, marginTop: 26, lineHeight: 28 },
  hazard: { height: 14, backgroundColor: colors.primary, marginTop: 24, borderRadius: 3 },
});
