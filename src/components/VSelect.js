/**
 * Seletor por chips - evita dropdowns nativos, dificeis de operar com luva.
 * Rolagem horizontal com alvos de 48dp+.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, type, metrics } from '../theme';

export default function VSelect({ label, value, options = [], onChange, unit, allowClear = true }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {!!unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((opt) => {
          const active = String(value) === String(opt);
          return (
            <Pressable
              key={String(opt)}
              hitSlop={metrics.hitSlop}
              onPress={() => onChange(active && allowClear ? '' : opt)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipTxt, active && styles.chipTxtActive]} numberOfLines={1}>
                {String(opt)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: metrics.gap },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  label: { ...type.label, color: colors.primary },
  unit: { ...type.caption, color: colors.textDim },
  row: { gap: 8, paddingRight: 8 },
  chip: {
    minHeight: 48, minWidth: 56, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surfaceHigh, borderRadius: metrics.radius,
    borderWidth: metrics.borderW, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipTxt: { ...type.bodyBold, color: colors.textMuted },
  chipTxtActive: { color: colors.onPrimary },
});
