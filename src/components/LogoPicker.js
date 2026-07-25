/**
 * UPLOAD DE LOGOS (contratada / contratante) - expo-image-picker.
 * Converte para data URI base64 para embutir no PDF/DOC sem depender de arquivo externo.
 */
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, type, metrics } from '../theme';

export default function LogoPicker({ label, value, onChange, hint }) {
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        base64: true,
        allowsEditing: true,
        aspect: [3, 1],
      });
      if (!res.canceled && res.assets?.[0]) {
        const a = res.assets[0];
        const mime = a.mimeType || 'image/png';
        onChange(a.base64 ? `data:${mime};base64,${a.base64}` : a.uri);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={pick} style={styles.box} hitSlop={metrics.hitSlop}>
        {busy ? <ActivityIndicator color={colors.primary} />
          : value ? <Image source={{ uri: value }} style={styles.img} resizeMode="contain" />
            : <Text style={styles.placeholder}>TOQUE PARA{'\n'}SELECIONAR IMAGEM</Text>}
      </Pressable>
      <View style={styles.actions}>
        {!!value && (
          <Pressable onPress={() => onChange(null)} hitSlop={metrics.hitSlop}>
            <Text style={styles.remove}>REMOVER</Text>
          </Pressable>
        )}
        {!!hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, marginBottom: metrics.gap },
  label: { ...type.label, color: colors.primary, marginBottom: 6 },
  box: {
    height: 96, borderRadius: metrics.radius, borderWidth: 1.6, borderStyle: 'dashed',
    borderColor: colors.borderStrong, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 8,
  },
  img: { width: '100%', height: '100%' },
  placeholder: { ...type.label, color: colors.textDim, textAlign: 'center', fontSize: 10, lineHeight: 16 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, alignItems: 'center' },
  remove: { ...type.label, color: colors.danger, fontSize: 10 },
  hint: { ...type.caption, color: colors.textDim, fontSize: 10.5, flex: 1, textAlign: 'right' },
});
