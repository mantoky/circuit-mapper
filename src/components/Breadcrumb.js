import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet, View } from 'react-native';
import { colors, type, metrics } from '../theme';

export default function Breadcrumb({ path = [], onPress }) {
  if (!path.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      {path.map((n, i) => (
        <View key={n.id} style={styles.item}>
          {i > 0 && <Text style={styles.sep}>›</Text>}
          <Pressable onPress={() => onPress && onPress(n.id)} hitSlop={metrics.hitSlop}>
            <Text style={[styles.txt, i === path.length - 1 && styles.last]} numberOfLines={1}>
              {n.label}
            </Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: metrics.pad, paddingVertical: 8, gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sep: { ...type.body, color: colors.textDim },
  txt: { ...type.caption, color: colors.textMuted, maxWidth: 170 },
  last: { color: colors.primary, fontWeight: '800' },
});
