/**
 * GERADOR DE DOCUMENTOS - "Gerar Laudo" em 4 formatos + backup.
 * A View de resumo (capturada para imagem) fica montada fora da tela visivel.
 */
import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import VButton from '../components/VButton';
import KpiCard from '../components/KpiCard';
import StatusChip from '../components/StatusChip';
import { colors, type, metrics } from '../theme';
import { useProject } from '../store/ProjectContext';
import { generateAndShare, generateAll, printLaudo, FORMATS } from '../export';
import SummaryCard from './SummaryCard';

const SECTIONS = [
  { key: 'cover', label: 'Capa' },
  { key: 'intro', label: 'Identificacao e metodologia' },
  { key: 'tree', label: 'Estrutura hierarquica' },
  { key: 'tables', label: 'Quadros de cargas' },
  { key: 'assets', label: 'Inventario de ativos' },
  { key: 'findings', label: 'Apontamentos tecnicos' },
  { key: 'conclusion', label: 'Parecer conclusivo' },
];

export default function ExportScreen() {
  const P = useProject();
  const s = P.validation.summary;
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [sections, setSections] = useState(SECTIONS.map((x) => x.key));
  const [log, setLog] = useState([]);

  const ctx = { tree: P.tree, header: P.header, viewRef: shotRef, sections };

  const inconclusive = !s.circuits && !s.panels;

  const run = async (fmt) => {
    if (!P.tree.length) { Alert.alert('Sem dados', 'Cadastre a hierarquia antes de gerar o laudo.'); return; }
    if (inconclusive) {
      Alert.alert('Laudo inconclusivo', 'Nenhum circuito ou quadro cadastrado. O laudo seria inconclusivo; complete o levantamento antes de exportar.');
      return;
    }
    setBusy(fmt);
    try {
      const file = await generateAndShare(fmt, ctx);
      setLog((l) => [{ name: file.name, when: new Date().toLocaleTimeString('pt-BR') }, ...l].slice(0, 8));
    } catch (e) {
      Alert.alert('Falha na geracao', `${fmt.toUpperCase()}: ${e.message}`);
    } finally { setBusy(null); }
  };

  const runAll = async () => {
    if (inconclusive) {
      Alert.alert('Laudo inconclusivo', 'Complete o levantamento (circuitos/quadros) antes de gerar o pacote.');
      return;
    }
    setBusy('all');
    try {
      const out = await generateAll(ctx);
      const okFiles = out.filter((o) => !o.error);
      setLog((l) => [...okFiles.map((f) => ({ name: f.name, when: new Date().toLocaleTimeString('pt-BR') })), ...l].slice(0, 8));
      Alert.alert('Pacote gerado',
        out.map((o) => `${o.format.toUpperCase()}: ${o.error ? 'ERRO - ' + o.error : 'OK'}`).join('\n'));
    } finally { setBusy(null); }
  };

  const toggle = (k) =>
    setSections((cur) => cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="GERAR LAUDO" subtitle="PDF · Word · Excel · Imagem · Backup" />
      <ScrollView contentContainerStyle={{ padding: metrics.pad, paddingBottom: 60 }}>

        {!!P.hydrateError && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Estado persistido corrompido</Text>
            <Text style={styles.alertTxt}>Nao foi possivel ler o projeto salvo ({P.hydrateError}). Um projeto em branco foi carregado. Exporte um backup JSON se hadados importantes, e reinicie o app.</Text>
          </View>
        )}
        {!!P.saveError && (
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Falha ao salvar</Text>
            <Text style={styles.alertTxt}>O ultimo salvamento falhou: {P.saveError}. Exporte um backup JSON imediatamente para nao perder o levantamento.</Text>
          </View>
        )}

        <View style={styles.kpis}>
          <KpiCard value={s.circuits} label="Circuitos" />
          <KpiCard value={s.panels} label="Quadros" />
          <KpiCard value={`${s.conformityIndex}%`} label="Conformidade"
            accent={s.errors ? colors.danger : s.warnings ? colors.warn : colors.ok} />
        </View>

        <View style={styles.verdictBox}>
          <StatusChip status={s.errors ? 'error' : s.warnings ? 'warn' : 'ok'} />
          <Text style={styles.verdictTxt}>{s.verdict}</Text>
        </View>

        <Text style={styles.section}>Secoes incluidas no documento</Text>
        {SECTIONS.map((sec) => {
          const on = sections.includes(sec.key);
          return (
            <Pressable key={sec.key} onPress={() => toggle(sec.key)} style={styles.checkRow} hitSlop={metrics.hitSlop}>
              <View style={[styles.check, on && styles.checkOn]}>
                {on && <Text style={styles.checkTxt}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>{sec.label}</Text>
            </Pressable>
          );
        })}

        <Text style={styles.section}>Formatos de saida</Text>
        {FORMATS.map((f) => (
          <View key={f.key} style={styles.fmtRow}>
            <View style={styles.fmtBadge}><Text style={styles.fmtBadgeTxt}>{f.icon}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fmtLabel}>{f.label}</Text>
              <Text style={styles.fmtHint}>{f.hint}</Text>
            </View>
            {busy === f.key
              ? <ActivityIndicator color={colors.primary} style={{ width: 96 }} />
              : <VButton label="Gerar" size="sm" style={{ width: 96 }} onPress={() => run(f.key)} />}
          </View>
        ))}

        <VButton label={busy === 'all' ? 'Gerando pacote...' : 'Gerar pacote completo'} icon="ALL" size="lg"
          disabled={!!busy} onPress={runAll} style={{ marginTop: 18 }} />
        <VButton label="Imprimir / salvar via sistema" variant="ghost" icon="PRN"
          onPress={() => printLaudo(P.tree, P.header, { sections })} style={{ marginTop: 10 }} />
        <VButton label="Exportar resumo em JPG" variant="dark" icon="JPG"
          onPress={() => run('jpg')} style={{ marginTop: 10 }} />

        {!!log.length && (
          <>
            <Text style={styles.section}>Arquivos gerados nesta sessao</Text>
            {log.map((l, i) => (
              <View key={i} style={styles.logRow}>
                <Text style={styles.logName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.logTime}>{l.when}</Text>
              </View>
            ))}
          </>
        )}

        {/* View capturada para exportacao em imagem */}
        <View style={styles.shotHost} pointerEvents="none">
          <View ref={shotRef} collapsable={false}>
            <SummaryCard />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  alertBox: {
    backgroundColor: colors.dangerSoft || 'rgba(229,56,59,0.12)',
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    borderRadius: metrics.radius,
    padding: 12,
    marginBottom: 12,
  },
  alertTitle: { ...type.label, color: colors.danger, marginBottom: 4, fontSize: 13 },
  alertTxt: { ...type.caption, color: colors.text, lineHeight: 18 },
  kpis: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  verdictBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: metrics.radius, padding: 14, borderLeftWidth: metrics.accentW, borderLeftColor: colors.primary,
  },
  verdictTxt: { ...type.caption, color: colors.text, flex: 1, lineHeight: 18 },
  section: {
    ...type.label, color: colors.primary, marginTop: 24, marginBottom: 12, fontSize: 13,
    borderTopWidth: metrics.borderW, borderColor: colors.border, paddingTop: 14,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  check: {
    width: 30, height: 30, borderRadius: 7, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkTxt: { color: colors.onPrimary, fontWeight: '900', fontSize: 17 },
  checkLabel: { ...type.body, color: colors.text },
  fmtRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: metrics.radius, padding: 12, marginBottom: 8,
  },
  fmtBadge: {
    width: 50, height: 44, borderRadius: 7, borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center',
  },
  fmtBadgeTxt: { ...type.label, color: colors.primary, fontSize: 10 },
  fmtLabel: { ...type.bodyBold, color: colors.text },
  fmtHint: { ...type.caption, color: colors.textDim, marginTop: 1 },
  logRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 10,
    backgroundColor: colors.surface, borderRadius: 7, padding: 11, marginBottom: 6,
  },
  logName: { ...type.caption, color: colors.text, flex: 1 },
  logTime: { ...type.caption, color: colors.textDim },
  shotHost: { position: 'absolute', left: -2000, top: 0, width: 1240 },
});
