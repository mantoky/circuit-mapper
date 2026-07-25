/**
 * BACKUP / RESTORE do projeto em JSON (schema recursivo puro).
 * Permite transferir o levantamento entre dispositivos e versionar em nuvem.
 *
 * Seguranca: a validacao estrutural (IDs unicos, profundidade, limite de nos,
 * auditTree) e a sanitizacao de logos remotos vivem em src/core/importValidate
 * (CommonJS puro, testavel em Node). Aqui apenas delegamos.
 */
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { validateImport } from '../core/importValidate';
import { fileName } from './fileName';

export const SCHEMA_VERSION = 1;

export function serializeProject(tree, header) {
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    app: 'circuit-mapper',
    exportedAt: new Date().toISOString(),
    header,
    tree,
  }, null, 2);
}

export async function exportJson(tree, header) {
  const name = fileName(header, 'json');
  const uri = `${FileSystem.documentDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, serializeProject(tree, header), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { uri, name, mime: 'application/json' };
}

export function parseProject(raw) {
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error('Arquivo invalido: JSON malformado.'); }

  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Arquivo gerado em versao mais recente (v${data.schemaVersion}). Atualize o aplicativo.`);
  }
  return validateImport(data);
}

export async function importJson() {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled) return null;
  const raw = await FileSystem.readAsStringAsync(res.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return parseProject(raw);
}
