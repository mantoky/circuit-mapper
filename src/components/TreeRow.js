/**
 * LINHA DA ARVORE (Explorer)
 * - recuo visual por nivel com guias verticais
 * - alvo de expansao independente do alvo de edicao (evita toque errado com luva)
 * - barra lateral colorida = status de conformidade NBR 5410
 */
import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, phaseColor, statusColor, type, metrics } from '../theme';
import { typeInfo } from '../core/schema';
import StatusChip from './StatusChip';

function TreeRow({ item, status, onToggle, onOpen, onAdd, selected }) {
  const { node, level, isExpanded, hasChildren, childCount } = item;
  const ti = typeInfo(node.type);
  const a = node.attributes || {};

  const subtitle = [
    a.tag || a.circuitNumber,
    a.tension && (/v/i.test(String(a.tension)) ? String(a.tension) : `${a.tension}V`),
    a.section && `${a.section}mm2`,
    a.breaker && `${a.breaker}A`,
    a.powerW && `${Number(a.powerW) >= 1000 ? (Number(a.powerW) / 1000).toFixed(1) + 'kW' : a.powerW + 'W'}`,
    a.location,
  ].filter(Boolean).slice(0, 3).join('  •  ');

  return (
    <View style={[styles.row, selected && styles.rowSelected]}>
      {/* guias de nivel */}
      <View style={{ flexDirection: 'row' }}>
        {Array.from({ length: level }).map((_, i) => (
          <View key={i} style={styles.guide} />
        ))}
      </View>

      {/* barra de status */}
      <View style={[styles.accent, { backgroundColor: status ? statusColor(status) : ti.color }]} />

      {/* botao expandir/colapsar */}
      <Pressable
        onPress={() => hasChildren && onToggle(node.id)}
        disabled={!hasChildren}
        hitSlop={metrics.hitSlop}
        style={[styles.toggle, !hasChildren && { opacity: 0.28 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!isExpanded, disabled: !hasChildren }}
        accessibilityLabel={isExpanded ? `Recolher ${node.label}` : `Expandir ${node.label}`}
      >
        <Text style={styles.toggleTxt}>{hasChildren ? (isExpanded ? '−' : '+') : '·'}</Text>
      </Pressable>

      {/* conteudo (abre modal de edicao) */}
      <Pressable
        style={styles.content}
        onPress={() => onOpen(node.id)}
        hitSlop={metrics.hitSlop}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${node.label}`}
        accessibilityHint={subtitle || ti.label}
      >
        <View style={styles.titleLine}>
          <View style={[styles.typeTag, { borderColor: ti.color }]}>
            <Text style={[styles.typeTxt, { color: ti.color }]}>{ti.short}</Text>
          </View>
          <Text style={styles.label} numberOfLines={1}>{node.label}</Text>
          {!!a.phase && (
            <View style={[styles.phase, { backgroundColor: phaseColor(a.phase) }]}>
              <Text style={[styles.phaseTxt, {
                color: String(a.phase).toUpperCase() === 'S' ? '#06141F' : '#FFF',
              }]}>{a.phase}</Text>
            </View>
          )}
        </View>
        {!!subtitle && <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>}
      </Pressable>

      {/* contador de filhos */}
      {hasChildren && (
        <View style={styles.count}>
          <Text style={styles.countTxt}>{childCount}</Text>
        </View>
      )}

      {!!status && status !== 'ok' && <StatusChip status={status} compact />}

      {/* adicionar filho */}
      {!!ti.allowedChildren.length && (
        <Pressable
          onPress={() => onAdd(node.id)}
          hitSlop={metrics.hitSlop}
          style={styles.add}
          accessibilityRole="button"
          accessibilityLabel={`Adicionar item em ${node.label}`}
        >
          <Text style={styles.addTxt}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    minHeight: metrics.rowHeight, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderColor: colors.bg, paddingRight: 8,
  },
  rowSelected: { backgroundColor: colors.surfaceAlt },
  guide: { width: metrics.indent, height: metrics.rowHeight, borderRightWidth: 1, borderColor: colors.border },
  accent: { width: metrics.accentW, alignSelf: 'stretch' },
  toggle: { width: metrics.touchMin, height: metrics.rowHeight, alignItems: 'center', justifyContent: 'center' },
  toggleTxt: { ...type.h1, color: colors.primary, lineHeight: 26 },
  content: { flex: 1, paddingVertical: 8, paddingRight: 6, minHeight: metrics.touchMin, justifyContent: 'center' },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  typeTag: { borderWidth: 1.3, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1.5, minWidth: 40, alignItems: 'center' },
  typeTxt: { ...type.label, fontSize: 9.5, letterSpacing: 0.5 },
  label: { ...type.bodyBold, color: colors.text, flexShrink: 1 },
  sub: { ...type.caption, color: colors.textDim, marginTop: 3, marginLeft: 2 },
  phase: { minWidth: 30, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, alignItems: 'center' },
  phaseTxt: { ...type.label, fontSize: 10 },
  count: {
    minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
    borderWidth: 1, borderColor: colors.primary,
  },
  countTxt: { ...type.label, fontSize: 10, color: colors.primary },
  add: {
    width: metrics.touchMin, height: metrics.touchMin, borderRadius: metrics.radius, marginLeft: 6,
    backgroundColor: colors.primarySoft, borderWidth: 1.4, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addTxt: { ...type.h1, color: colors.primary, lineHeight: 26 },
});

export default memo(TreeRow);
