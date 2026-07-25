import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, metrics } from '../theme';

export default function ScreenHeader({ title, subtitle, right }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stripe} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgDeep, paddingHorizontal: metrics.pad, paddingVertical: 14,
    borderBottomWidth: 2.5, borderColor: colors.primary,
  },
  stripe: { width: 5, height: 34, backgroundColor: colors.primary, borderRadius: 3 },
  title: { ...type.h1, color: colors.text },
  sub: { ...type.caption, color: colors.primary, marginTop: 2 },
});
