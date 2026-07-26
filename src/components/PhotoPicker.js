/**
 * PHOTOPICKER - captura e gestao de fotos por item
 * ------------------------------------------------------------------
 * - Camera (expo-image-picker) ou galeria
 * - Persiste o arquivo em FileSystem.documentDirectory/photos/ (sobrevive a restart)
 * - meta.photos guarda apenas { id, uri, caption, takenAt } -> AsyncStorage fica leve
 * - No laudo/export, photoResolve le o arquivo -> base64 -> embute no HTML
 */
import React, { useState } from 'react';
import { View, Text, Image, Pressable, TextInput, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import VButton from './VButton';
import { colors, type, metrics } from '../theme';

const PHOTOS_DIR = FileSystem.documentDirectory + 'photos/';

function newPhotoId() {
  return 'ph_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(PHOTOS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
}

async function persistToLocal(pickedUri) {
  await ensureDir();
  const ext = (pickedUri.match(/\.(\w+)(\?|$)/) || [, 'jpg'])[1].toLowerCase();
  const dest = PHOTOS_DIR + newPhotoId() + '.' + (ext === 'jpeg' ? 'jpg' : ext);
  await FileSystem.copyAsync({ from: pickedUri, to: dest });
  return dest;
}

export default function PhotoPicker({ photos = [], onAdd, onRemove, onCaption }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  async function requestCam() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera', 'Permissao de camera negada. Libere nas configuracoes do app.');
      return false;
    }
    return true;
  }

  async function takePhoto() {
    if (busy) return;
    if (!(await requestCam())) return;
    setBusy(true);
    try {
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (res.canceled || !res.assets || !res.assets.length) return;
      const picked = res.assets[0];
      const uri = await persistToLocal(picked.uri);
      onAdd && onAdd({
        id: newPhotoId(),
        uri,
        caption: '',
        takenAt: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert('Foto', 'Nao foi possivel capturar: ' + (e && e.message));
    } finally {
      setBusy(false);
    }
  }

  async function pickFromGallery() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (res.canceled || !res.assets || !res.assets.length) return;
      const picked = res.assets[0];
      const uri = await persistToLocal(picked.uri);
      onAdd && onAdd({
        id: newPhotoId(),
        uri,
        caption: '',
        takenAt: new Date().toISOString(),
      });
    } catch (e) {
      Alert.alert('Galeria', 'Nao foi possivel importar: ' + (e && e.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <View style={styles.actions}>
        <VButton label="Tirar foto" icon="CAM" size="sm" style={{ flex: 1 }} onPress={takePhoto} disabled={busy} />
        <VButton label="Galeria" variant="dark" size="sm" style={{ flex: 1 }} onPress={pickFromGallery} disabled={busy} />
      </View>
      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.busyTxt}>Processando imagem...</Text>
        </View>
      )}

      {photos.length > 0 && (
        <View style={styles.grid}>
          {photos.map((p) => (
            <View key={p.id} style={styles.cell}>
              <Pressable onPress={() => setPreview(p)} hitSlop={metrics.hitSlop}>
                <Image source={{ uri: p.uri }} style={styles.thumb} resizeMode="cover" />
              </Pressable>
              <Pressable
                onPress={() => onRemove && onRemove(p.id)}
                style={styles.del}
                hitSlop={metrics.hitSlop}
                accessibilityRole="button"
                accessibilityLabel="Remover foto"
              >
                <Text style={styles.delTxt}>×</Text>
              </Pressable>
              <TextInput
                style={styles.cap}
                value={p.caption || ''}
                onChangeText={(v) => onCaption && onCaption(p.id, v)}
                placeholder="Legenda..."
                placeholderTextColor={colors.textDim}
                selectionColor={colors.primary}
              />
            </View>
          ))}
        </View>
      )}

      <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.previewWrap} onPress={() => setPreview(null)}>
          <Image
            source={{ uri: preview?.uri }}
            style={styles.previewImg}
            resizeMode="contain"
          />
          <Text style={styles.previewCap}>{preview?.caption || ''}</Text>
          <Text style={styles.previewHint}>Toque para fechar</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

const THUMB = (metrics.screenW || 360) / 3 - 18;

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  busyTxt: { ...type.caption, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  cell: { width: THUMB },
  thumb: {
    width: THUMB, height: THUMB, borderRadius: metrics.radius,
    borderWidth: metrics.borderW, borderColor: colors.border,
  },
  del: {
    position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  delTxt: { color: '#fff', fontWeight: '800', lineHeight: 22, fontSize: 16 },
  cap: {
    ...type.caption, color: colors.text, marginTop: 6, fontSize: 11,
    backgroundColor: colors.surfaceHigh, borderRadius: 6, paddingHorizontal: 8,
    height: 30, borderWidth: metrics.borderW, borderColor: colors.border,
  },
  previewWrap: {
    flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  previewImg: { width: '100%', height: '70%', borderRadius: 8 },
  previewCap: { ...type.body, color: colors.text, marginTop: 14, textAlign: 'center' },
  previewHint: { ...type.caption, color: colors.textDim, marginTop: 6 },
});
