import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TREE = '@vcm/tree';
const KEY_HEADER = '@vcm/header';
const KEY_EXPANDED = '@vcm/expanded';

/**
 * Carrega o estado persistido. Em caso de corrupcao, devolve nulls e um flag
 * `error` para o contexto apresentar ao usuario em vez de substituir silenciosamente
 * o projeto por um estado vazio.
 */
export async function loadState() {
  try {
    const [t, h, e] = await Promise.all([
      AsyncStorage.getItem(KEY_TREE),
      AsyncStorage.getItem(KEY_HEADER),
      AsyncStorage.getItem(KEY_EXPANDED),
    ]);
    let tree = null, header = null, expanded = null;
    if (t) { try { tree = JSON.parse(t); } catch { return { error: 'tree_corrupt' }; } }
    if (h) { try { header = JSON.parse(h); } catch { return { error: 'header_corrupt' }; } }
    if (e) { try { expanded = JSON.parse(e); } catch { return { error: 'expanded_corrupt' }; } }
    return { tree, header, expanded };
  } catch (err) {
    console.warn('[persistence] falha ao carregar estado:', err.message);
    return { error: 'load_failed', message: err.message };
  }
}

/**
 * Gravacao atomica dos tres blocos via multiSet: ou todos persistem, ou nenhum.
 * Nao engole erros — propaga para o contexto tratar (nao mentir "salvo").
 */
export async function saveAll({ tree, header, expanded }) {
  const pairs = [
    [KEY_TREE, JSON.stringify(tree ?? [])],
    [KEY_HEADER, JSON.stringify(header ?? {})],
    [KEY_EXPANDED, JSON.stringify(expanded ?? {})],
  ];
  await AsyncStorage.multiSet(pairs);
}

export async function saveTree(tree) {
  await AsyncStorage.setItem(KEY_TREE, JSON.stringify(tree));
}
export async function saveHeader(header) {
  await AsyncStorage.setItem(KEY_HEADER, JSON.stringify(header));
}
export async function saveExpanded(expanded) {
  await AsyncStorage.setItem(KEY_EXPANDED, JSON.stringify(expanded));
}
export async function clearAll() {
  await AsyncStorage.multiRemove([KEY_TREE, KEY_HEADER, KEY_EXPANDED]);
}
