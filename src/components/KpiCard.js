import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, metrics, shadow } from '../theme';

export default function KpiCard({ value, label, accent = colors.primary, flex = 1 }) {
  return (
    <View style={[styles.card, { borderLeftColor: accent, flex }]}>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: metrics.radius,
    borderLeftWidth: metrics.accentW, padding: 12, minWidth: 96, ...shadow.card,
  },
  value: { ...type.display, fontSize: 26 },
  label: { ...type.label, color: colors.textMuted, marginTop: 4, fontSize: 10 },
});
