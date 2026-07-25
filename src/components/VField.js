/**
 * Campo de texto/numero para uso com luva: altura 56dp, fonte 16pt,
 * rotulo persistente (nao placeholder-only) para leitura sob sol.
 */
import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, type, metrics } from '../theme';

export default function VField({
  label, value, onChangeText, placeholder, unit, hint,
  kind = 'text', multiline = false, style, error,
}) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {!!unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      <View style={[styles.inputWrap, error && { borderColor: colors.danger }]}>
        <TextInput
          value={value === null || value === undefined ? '' : String(value)}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          keyboardType={kind === 'number' ? 'decimal-pad' : 'default'}
          multiline={multiline}
          style={[styles.input, multiline && { height: 108, textAlignVertical: 'top', paddingTop: 12 }]}
          selectionColor={colors.primary}
          autoCapitalize={kind === 'number' ? 'none' : 'sentences'}
        />
      </View>
      {!!(hint || error) && (
        <Text style={[styles.hint, error && { color: colors.danger }]}>{error || hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: metrics.gap },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  label: { ...type.label, color: colors.primary },
  unit: { ...type.caption, color: colors.textDim },
  inputWrap: {
    backgroundColor: colors.surfaceHigh, borderRadius: metrics.radius,
    borderWidth: metrics.borderW, borderColor: colors.border,
  },
  input: {
    ...type.body, color: colors.text, height: metrics.touchMin,
    paddingHorizontal: 14,
  },
  hint: { ...type.caption, color: colors.textDim, marginTop: 5 },
});
