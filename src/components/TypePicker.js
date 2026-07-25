/**
 * Seletor do tipo de item a criar - respeita as regras de aninhamento do schema.
 */
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, type, metrics } from '../theme';
import { NODE_TYPES, CREATION_ORDER, typeInfo, allowedChildren } from '../core/schema';

export default function TypePicker({ parentType, onSelect }) {
  const allowed = parentType ? allowedChildren(parentType) : CREATION_ORDER;
  return (
    <ScrollView contentContainerStyle={{ padding: metrics.pad, gap: 10 }}>
      <Text style={styles.hint}>
        {parentType
          ? `Tipos permitidos sob "${typeInfo(parentType).label}":`
          : 'Selecione o tipo de item raiz:'}
      </Text>
      {allowed.map((t) => {
        const ti = NODE_TYPES[t];
        if (!ti) return null;
        return (
          <Pressable key={t} onPress={() => onSelect(t)} style={styles.card} hitSlop={metrics.hitSlop}>
            <View style={[styles.badge, { borderColor: ti.color }]}>
              <Text style={[styles.badgeTxt, { color: ti.color }]}>{ti.short}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{ti.label}</Text>
              <Text style={styles.sub}>
                {ti.allowedChildren.length
                  ? `Aceita: ${ti.allowedChildren.map((c) => NODE_TYPES[c].label).join(', ')}`
                  : 'Item terminal (folha da arvore)'}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hint: { ...type.caption, color: colors.textMuted, marginBottom: 6 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surface, borderRadius: metrics.radius, padding: 14,
    minHeight: metrics.touchLarge, borderWidth: metrics.borderW, borderColor: colors.border,
  },
  badge: {
    minWidth: 52, paddingVertical: 6, borderRadius: 6, borderWidth: 1.6, alignItems: 'center',
  },
  badgeTxt: { ...type.label, fontSize: 10.5 },
  label: { ...type.bodyBold, color: colors.text },
  sub: { ...type.caption, color: colors.textDim, marginTop: 2 },
  arrow: { ...type.h1, color: colors.primary },
});
