/**
 * EXPLORER (Tree View) virtualizado.
 * FlatList sobre a arvore achatada -> performance estavel com milhares de nos.
 */
import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import TreeRow from './TreeRow';
import { colors, type, metrics } from '../theme';
import { flatten } from '../core/treeEngine';

export default function TreeExplorer({
  tree, expanded, statusById = {}, onToggle, onOpen, onAdd, selectedId, filter, ListHeaderComponent,
}) {
  const data = useMemo(() => {
    let flat = flatten(tree, { expanded });
    if (filter) {
      const q = filter.toLowerCase();
      flat = flat.filter((f) => {
        const a = f.node.attributes || {};
        return `${f.node.label} ${f.node.type} ${Object.values(a).join(' ')}`.toLowerCase().includes(q);
      });
    }
    return flat;
  }, [tree, expanded, filter]);

  return (
    <FlatList
      data={data}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={ListHeaderComponent}
      renderItem={({ item }) => (
        <TreeRow
          item={item}
          status={statusById[item.id]}
          onToggle={onToggle}
          onOpen={onOpen}
          onAdd={onAdd}
          selected={selectedId === item.id}
        />
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NENHUM ITEM CADASTRADO</Text>
          <Text style={styles.emptyTxt}>
            Toque em NOVO para iniciar a arvore pelo site, subestacao ou quadro geral.
            {'\n\n'}A hierarquia aceita niveis ilimitados:{'\n'}
            Site › Subestacao › Trafo › Quadro Geral › Sub-quadro › Grupo › Circuito › Ativo
          </Text>
        </View>
      }
      initialNumToRender={20}
      maxToRenderPerBatch={20}
      windowSize={11}
      removeClippedSubviews
      contentContainerStyle={{ paddingBottom: 130 }}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  empty: { padding: metrics.padLg, alignItems: 'center', marginTop: 40 },
  emptyTitle: { ...type.label, color: colors.primary, marginBottom: 10, fontSize: 14 },
  emptyTxt: { ...type.caption, color: colors.textDim, textAlign: 'center', lineHeight: 20 },
});
