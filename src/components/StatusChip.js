import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColor, type } from '../theme';

const LABEL = { ok: 'CONFORME', warn: 'RESSALVA', error: 'NAO CONF.' };

export default function StatusChip({ status, compact = false }) {
  if (!status) return null;
  const c = statusColor(status);
  if (compact) return <View style={[styles.dot, { backgroundColor: c }]} />;
  return (
    <View style={[styles.chip, { borderColor: c, backgroundColor: `${c}22` }]}>
      <Text style={[styles.txt, { color: c }]}>{LABEL[status] || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1.2 },
  txt: { ...type.label, fontSize: 10, letterSpacing: 0.7 },
  dot: { width: 11, height: 11, borderRadius: 6 },
});
