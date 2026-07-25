/**
 * EXPORTACAO IMAGEM (.jpg / .png) - react-native-view-shot
 * Captura o resumo executivo renderizado para compartilhamento rapido
 * em grupos de WhatsApp/Teams da operacao.
 */
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { fileName } from './fileName';

/**
 * @param {React.RefObject} viewRef ref da View a capturar
 * @param {'png'|'jpg'} format
 */
export async function exportImage(viewRef, header, format = 'png', opts = {}) {
  const uri = await captureRef(viewRef, {
    format,
    quality: format === 'jpg' ? 0.95 : 1,
    result: 'tmpfile',
    width: opts.width || 1240,   // ~A4 @150dpi
  });
  const name = fileName(header, format);
  const dest = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return { uri: dest, name, mime: format === 'jpg' ? 'image/jpeg' : 'image/png' };
}

/** Salva na galeria do dispositivo (opcional, requer permissao) */
export async function saveToGallery(uri) {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') throw new Error('Permissao de galeria negada.');
  const asset = await MediaLibrary.createAssetAsync(uri);
  await MediaLibrary.createAlbumAsync('Circuit Mapper', asset, false).catch(() => {});
  return asset;
}
