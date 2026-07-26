/**
 * PHOTO RESOLVE - converte URIs de arquivos (RN/FileSystem) em data URIs
 * para embutir no laudo (HTML/PDF/DOC) e no backup JSON (auto-contido para VPS).
 * Em ambientes sem FileSystem (web/Node), as URIs ja sao data: -> no-op.
 */
import * as FileSystem from 'expo-file-system';

const isDataUri = (u) => typeof u === 'string' && u.startsWith('data:');

/** Le um arquivo de imagem -> data URI; data URIs passam direto. */
export async function readPhotoDataUri(uri) {
  if (!uri) return null;
  if (isDataUri(uri)) return uri;
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const ext = (String(uri).match(/\.(\w+)(\?|$)/) || [, 'jpg'])[1].toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${b64}`;
  } catch (e) {
    return null;
  }
}

/** Clona a arvore resolvendo todas as fotos para data URIs. */
export async function resolveTreePhotos(tree) {
  const walk = async (nodes) => {
    if (!nodes || !nodes.length) return nodes;
    const out = [];
    for (const n of nodes) {
      const photos = (n.meta && n.meta.photos) || [];
      let nextPhotos = photos;
      let changed = false;
      if (photos.some((p) => p && p.uri && !isDataUri(p.uri))) {
        nextPhotos = [];
        for (const p of photos) {
          if (!p || !p.uri) { nextPhotos.push(p); continue; }
          const dataUri = await readPhotoDataUri(p.uri);
          nextPhotos.push(dataUri ? { ...p, uri: dataUri } : p);
          changed = true;
        }
      }
      const nextChildren = await walk(n.children);
      const childChanged = nextChildren !== n.children;
      if (changed || childChanged) {
        out.push({
          ...n,
          children: childChanged ? nextChildren : n.children,
          meta: changed ? { ...(n.meta || {}), photos: nextPhotos } : n.meta,
        });
      } else {
        out.push(n);
      }
    }
    return out;
  };
  return walk(tree);
}
