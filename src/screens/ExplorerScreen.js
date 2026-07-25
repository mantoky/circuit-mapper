/**
 * MODO CONSTRUCAO - tela principal de cadastro.
 * Arvore recursiva + modais com backdrop blur para criar/editar sem perder contexto.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import TreeExplorer from '../components/TreeExplorer';
import BlurModal from '../components/BlurModal';
import TypePicker from '../components/TypePicker';
import AttributeEditor from '../components/AttributeEditor';
import Breadcrumb from '../components/Breadcrumb';
import VButton from '../components/VButton';
import { colors, type, metrics } from '../theme';
import { useProject } from '../store/ProjectContext';
import { findNode, findPath, countAll, depth } from '../core/treeEngine';
import { typeInfo, defaultAttributes } from '../core/schema';
import { inheritedPurpose } from '../core/validation';
import { autoSize } from '../core/engineering';

export default function ExplorerScreen() {
  const P = useProject();
  const [filter, setFilter] = useState('');
  const [addFor, setAddFor] = useState(undefined);   // undefined=fechado, null=raiz, id=pai
  const [editId, setEditId] = useState(null);

  const editNode = useMemo(() => (editId ? findNode(P.tree, editId) : null), [P.tree, editId]);
  const editPath = useMemo(() => (editId ? findPath(P.tree, editId) || [] : []), [P.tree, editId]);
  const purpose = useMemo(() => (editId ? inheritedPurpose(P.tree, editId) : null), [P.tree, editId]);

  const parentType = useMemo(() => {
    if (addFor === undefined || addFor === null) return null;
    const p = findNode(P.tree, addFor);
    return p ? p.type : null;
  }, [P.tree, addFor]);

  const handleCreate = useCallback((t) => {
    P.addNode(addFor === null ? null : addFor, {
      type: t,
      label: typeInfo(t).label,
      attributes: defaultAttributes(t),
    });
    setAddFor(undefined);
  }, [addFor, P]);

  const handleDelete = useCallback(() => {
    if (!editNode) return;
    const n = countAll([editNode]);
    Alert.alert(
      'Excluir item',
      `"${editNode.label}" sera removido${n > 1 ? ` junto com ${n - 1} item(ns) dependente(s)` : ''}. Confirmar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: () => { P.removeNode(editNode.id); setEditId(null); },
        },
      ]
    );
  }, [editNode, P]);

  const handleAutoSize = useCallback(() => {
    if (!editNode) return;
    const r = autoSize(editNode.attributes || {}, purpose);
    if (!r || !r.section) {
      Alert.alert('Dimensionamento', 'Informe potencia/corrente e comprimento para calcular.');
      return;
    }
    P.updateNode(editNode.id, {
      attributes: {
        section: String(r.section),
        breaker: String(r.breaker),
        ip: String(r.ib),
        peSection: String(r.peSection),
      },
    });
    Alert.alert(
      'Dimensionamento sugerido',
      `Secao: ${r.section} mm2\nDisjuntor: ${r.breaker} A\nIb: ${r.ib} A\nIz: ${r.iz} A\nQueda de tensao: ${r.voltageDrop}%\nPE: ${r.peSection} mm2`
    );
  }, [editNode, purpose, P]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="MODO CONSTRUCAO"
        subtitle={`${countAll(P.tree)} itens · ${depth(P.tree)} niveis · ${P.dirty ? 'salvando...' : 'salvo'}`}
      />

      <View style={styles.toolbar}>
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Buscar por TAG, descricao, secao, disjuntor..."
          placeholderTextColor={colors.textDim}
          style={styles.search}
          selectionColor={colors.primary}
        />
      </View>

      <View style={styles.actions}>
        <VButton label="Novo" icon="+" size="sm" onPress={() => setAddFor(null)} style={{ flex: 1.2 }} />
        <VButton label="Expandir" variant="dark" size="sm" onPress={P.expandAll} style={{ flex: 1 }} />
        <VButton label="Recolher" variant="dark" size="sm" onPress={P.collapseAll} style={{ flex: 1 }} />
        <VButton label="Desfazer" variant="ghost" size="sm" onPress={P.undo} style={{ flex: 1 }} />
      </View>

      <TreeExplorer
        tree={P.tree}
        expanded={P.expanded}
        statusById={P.validation.statusById}
        filter={filter}
        selectedId={editId}
        onToggle={P.toggleExpand}
        onOpen={setEditId}
        onAdd={setAddFor}
      />

      {/* ---------- MODAL: novo item ---------- */}
      <BlurModal
        visible={addFor !== undefined}
        onClose={() => setAddFor(undefined)}
        title="Novo item da hierarquia"
        subtitle={addFor ? `Sob: ${(findNode(P.tree, addFor) || {}).label || ''}` : 'Item de nivel raiz'}
        height={0.72}
      >
        <TypePicker parentType={parentType} onSelect={handleCreate} />
      </BlurModal>

      {/* ---------- MODAL: editar item ---------- */}
      <BlurModal
        visible={!!editNode}
        onClose={() => setEditId(null)}
        title={editNode ? editNode.label : ''}
        subtitle={editNode ? typeInfo(editNode.type).label : ''}
        height={0.92}
        footer={
          <>
            <VButton label="Duplicar" variant="dark" size="sm" style={{ flex: 1 }}
              onPress={() => { P.duplicateNode(editNode.id); setEditId(null); }} />
            <VButton label="Excluir" variant="danger" size="sm" style={{ flex: 1 }} onPress={handleDelete} />
            <VButton label="Concluir" size="sm" style={{ flex: 1.2 }} onPress={() => setEditId(null)} />
          </>
        }
      >
        {!!editNode && (
          <>
            <View style={styles.crumbWrap}>
              <Breadcrumb path={editPath} onPress={setEditId} />
            </View>
            <AttributeEditor
              node={editNode}
              purpose={purpose}
              onChangeLabel={(v) => P.updateNode(editNode.id, { label: v })}
              onChangeAttribute={(k, v) => P.setAttribute(editNode.id, k, v)}
              onAddCustom={(k, v) => P.setAttribute(editNode.id, k, v || '-')}
              onRemoveCustom={(k) => P.setAttribute(editNode.id, k, '')}
              onAutoSize={editNode.type === 'circuit' ? handleAutoSize : null}
            />
          </>
        )}
      </BlurModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  toolbar: { paddingHorizontal: metrics.pad, paddingTop: 12 },
  search: {
    ...type.body, color: colors.text, height: metrics.touchMin,
    backgroundColor: colors.surfaceHigh, borderRadius: metrics.radius,
    borderWidth: metrics.borderW, borderColor: colors.border, paddingHorizontal: 14,
  },
  actions: { flexDirection: 'row', gap: 8, padding: metrics.pad },
  crumbWrap: { borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.bgDeep },
});
