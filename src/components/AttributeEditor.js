/**
 * EDITOR DE ATRIBUTOS
 * 1) Campos tipados do schema (por tipo de no)
 * 2) "ATRIBUTOS DIVERSOS": metadados customizaveis criados em campo
 * 3) Painel de calculo: Ib / Iz / dV / PE recalculados ao vivo (NBR 5410)
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import VField from './VField';
import VSelect from './VSelect';
import VButton from './VButton';
import StatusChip from './StatusChip';
import { colors, type, metrics } from '../theme';
import { fieldsFor, typeInfo } from '../core/schema';
import { validateCircuit } from '../core/validation';

export default function AttributeEditor({
  node, purpose, onChangeLabel, onChangeAttribute,
  onAddCustom, onRemoveCustom, onAutoSize,
}) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const defs = fieldsFor(node.type);
  const knownKeys = defs.map((d) => d.key);
  const attrs = node.attributes || {};
  const customKeys = Object.keys(attrs).filter((k) => !knownKeys.includes(k));

  const calc = useMemo(() => {
    if (node.type !== 'circuit') return null;
    return validateCircuit(node, { purpose });
  }, [node, purpose]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: metrics.pad, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <VField
        label="Descricao do Item"
        value={node.label}
        onChangeText={onChangeLabel}
        placeholder={typeInfo(node.type).label}
      />

      {/* --------- Painel de calculo eletrico --------- */}
      {!!calc && (
        <View style={styles.calc}>
          <View style={styles.calcHead}>
            <Text style={styles.calcTitle}>VERIFICACAO NBR 5410 (AO VIVO)</Text>
            <StatusChip status={calc.status} />
          </View>
          <View style={styles.calcGrid}>
            <Metric k="Ib" v={`${calc.computed.ib || 0} A`} hint="Corrente de projeto" />
            <Metric k="In" v={`${calc.computed.in || '-'} A`} hint="Disjuntor" />
            <Metric k="Iz" v={`${calc.computed.iz || 0} A`} hint="Cabo corrigido" />
            <Metric k="dV" v={`${calc.computed.voltageDrop || 0} %`} hint="Limite 4%"
              alert={calc.computed.voltageDrop > 4} />
            <Metric k="S(VA)" v={`${calc.computed.powerVa || 0}`} hint="Pot. aparente" />
            <Metric k="PE min" v={`${calc.computed.peMin || 0} mm2`} hint="Tab. 58" />
          </View>
          <Text style={styles.criterion}>
            Criterio: Ib &le; In &le; Iz {calc.computed.ib && calc.computed.in && calc.computed.iz
              ? `→ ${calc.computed.ib} ≤ ${calc.computed.in} ≤ ${calc.computed.iz}`
              : ''}
          </Text>
          {!!onAutoSize && (
            <VButton
              label="Dimensionar automaticamente"
              variant="ghost" size="sm" icon="CALC"
              onPress={onAutoSize}
              style={{ marginTop: 10 }}
            />
          )}
          {calc.findings.map((f, i) => (
            <View key={i} style={[styles.finding, f.level === 'warn' && { borderLeftColor: colors.warn }]}>
              <Text style={styles.findingCode}>{f.code} · {f.ref}</Text>
              <Text style={styles.findingMsg}>{f.message}</Text>
              <Text style={styles.findingAct}>▸ {f.action}</Text>
            </View>
          ))}
        </View>
      )}

      {/* --------- Campos do schema --------- */}
      <Text style={styles.section}>Atributos Tecnicos</Text>
      {defs.map((d) => (
        d.kind === 'select' ? (
          <VSelect
            key={d.key}
            label={d.label}
            unit={d.unit}
            value={attrs[d.key]}
            options={d.options}
            onChange={(v) => onChangeAttribute(d.key, v)}
          />
        ) : (
          <VField
            key={d.key}
            label={d.label}
            unit={d.unit}
            hint={d.hint}
            kind={d.kind}
            placeholder={d.placeholder}
            value={attrs[d.key]}
            onChangeText={(v) => onChangeAttribute(d.key, v)}
            multiline={d.key === 'observation'}
          />
        )
      ))}

      {/* --------- Atributos diversos (customizaveis) --------- */}
      <Text style={styles.section}>Atributos Diversos</Text>
      <Text style={styles.sectionHint}>
        Metadados livres para particularidades do site (ex.: "Nivel de curto", "Data da termografia",
        "N. do desenho unifilar").
      </Text>

      {customKeys.map((k) => (
        <View key={k} style={styles.customRow}>
          <View style={{ flex: 1 }}>
            <VField label={k} value={attrs[k]} onChangeText={(v) => onChangeAttribute(k, v)} />
          </View>
          <Pressable onPress={() => onRemoveCustom(k)} style={styles.del} hitSlop={metrics.hitSlop}>
            <Text style={styles.delTxt}>×</Text>
          </Pressable>
        </View>
      ))}

      <View style={styles.addCustom}>
        <View style={{ flex: 1 }}>
          <VField label="Novo atributo" value={newKey} onChangeText={setNewKey} placeholder="Nome do campo" />
        </View>
        <View style={{ flex: 1 }}>
          <VField label="Valor" value={newValue} onChangeText={setNewValue} placeholder="Conteudo" />
        </View>
      </View>
      <VButton
        label="Adicionar atributo"
        variant="ghost"
        icon="+"
        disabled={!newKey.trim()}
        onPress={() => { onAddCustom(newKey.trim(), newValue); setNewKey(''); setNewValue(''); }}
      />

      <Text style={styles.meta}>
        ID: {node.id}{'\n'}
        Criado: {new Date(node.meta?.createdAt || Date.now()).toLocaleString('pt-BR')}{'\n'}
        Atualizado: {new Date(node.meta?.updatedAt || Date.now()).toLocaleString('pt-BR')}
      </Text>
    </ScrollView>
  );
}

function Metric({ k, v, hint, alert }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricK}>{k}</Text>
      <Text style={[styles.metricV, alert && { color: colors.danger }]}>{v}</Text>
      <Text style={styles.metricH}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    ...type.label, color: colors.primary, marginTop: 20, marginBottom: 4,
    borderTopWidth: metrics.borderW, borderColor: colors.border, paddingTop: 14, fontSize: 13,
  },
  sectionHint: { ...type.caption, color: colors.textDim, marginBottom: 12, lineHeight: 18 },
  calc: {
    backgroundColor: colors.bgDeep, borderRadius: metrics.radius, padding: 14,
    borderWidth: metrics.borderW, borderColor: colors.border, marginBottom: 6,
  },
  calcHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calcTitle: { ...type.label, color: colors.primary, fontSize: 11 },
  calcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: {
    minWidth: 88, flexGrow: 1, backgroundColor: colors.surface, borderRadius: 8, padding: 9,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  metricK: { ...type.label, color: colors.textDim, fontSize: 9.5 },
  metricV: { ...type.h3, color: colors.text, marginTop: 2 },
  metricH: { ...type.caption, color: colors.textDim, fontSize: 10.5, marginTop: 1 },
  criterion: { ...type.caption, color: colors.textMuted, marginTop: 10, fontStyle: 'italic' },
  finding: {
    marginTop: 10, backgroundColor: colors.surface, borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: colors.danger,
  },
  findingCode: { ...type.label, fontSize: 9.5, color: colors.textDim },
  findingMsg: { ...type.caption, color: colors.text, marginTop: 3, lineHeight: 18 },
  findingAct: { ...type.caption, color: colors.primary, marginTop: 4 },
  customRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  del: {
    width: 48, height: metrics.touchMin, marginTop: 24, borderRadius: metrics.radius,
    backgroundColor: colors.surface, borderWidth: metrics.borderW, borderColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  delTxt: { ...type.h1, color: colors.danger, lineHeight: 26 },
  addCustom: { flexDirection: 'row', gap: 10 },
  meta: { ...type.caption, color: colors.textDim, marginTop: 24, lineHeight: 18, fontSize: 11 },
});
