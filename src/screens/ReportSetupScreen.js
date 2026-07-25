/**
 * MODO LAUDO - preenchimento do cabecalho padrao + logos + instrumentos.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
import VField from '../components/VField';
import VButton from '../components/VButton';
import LogoPicker from '../components/LogoPicker';
import { colors, type, metrics } from '../theme';
import { useProject } from '../store/ProjectContext';

export default function ReportSetupScreen({ navigation }) {
  const P = useProject();
  const h = P.header;
  const set = (k) => (v) => P.setHeader({ [k]: v });
  const [instName, setInstName] = useState('');
  const [instModel, setInstModel] = useState('');
  const [instSerial, setInstSerial] = useState('');
  const [instCal, setInstCal] = useState('');

  const addInstrument = () => {
    if (!instName.trim()) return;
    P.setHeader({
      instruments: [...(h.instruments || []),
        { name: instName, model: instModel, serial: instSerial, calibration: instCal }],
    });
    setInstName(''); setInstModel(''); setInstSerial(''); setInstCal('');
  };

  const removeInstrument = (i) =>
    P.setHeader({ instruments: (h.instruments || []).filter((_, idx) => idx !== i) });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="CABECALHO DO LAUDO" subtitle="Dados obrigatorios do documento tecnico" />
      <ScrollView contentContainerStyle={{ padding: metrics.pad, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled">

        <Text style={styles.section}>Identificacao do Documento</Text>
        <VField label="Titulo do Laudo" value={h.reportTitle} onChangeText={set('reportTitle')} multiline />
        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <VField label="Numero do Documento" value={h.reportNumber} onChangeText={set('reportNumber')} placeholder="LT-2026-0147" />
          </View>
          <View style={{ flex: 1 }}>
            <VField label="Revisao" value={h.revision} onChangeText={set('revision')} placeholder="00" />
          </View>
        </View>

        <Text style={styles.section}>Contratante (Cliente)</Text>
        <VField label="Razao Social" value={h.client} onChangeText={set('client')} placeholder="Cliente Ltda." />
        <VField label="CNPJ" value={h.clientCnpj} onChangeText={set('clientCnpj')} />
        <VField label="Solicitante / Area" value={h.requester} onChangeText={set('requester')} placeholder="Gerencia de Manutencao Eletrica" />
        <VField label="Contrato / Ordem de Servico" value={h.contract} onChangeText={set('contract')} />

        <Text style={styles.section}>Contratada (Executante)</Text>
        <VField label="Razao Social / Profissional" value={h.contractor} onChangeText={set('contractor')} placeholder="Robson do Carmo - Engenharia Eletrica" />
        <VField label="CNPJ / CPF" value={h.contractorDoc} onChangeText={set('contractorDoc')} />

        <Text style={styles.section}>Localidade e Ativo</Text>
        <VField label="Site / Instalacao" value={h.site} onChangeText={set('site')} placeholder="Complexo Itabira - Usina 3" />
        <VField label="Localidade" value={h.location} onChangeText={set('location')} placeholder="Itabira / MG" />
        <VField label="TAG do Equipamento" value={h.equipmentTag} onChangeText={set('equipmentTag')} placeholder="SE-01 / QGBT-01" />

        <Text style={styles.section}>Logotipos</Text>
        <Text style={styles.hint}>
          As imagens sao embutidas na capa do PDF/DOC em base64 — funcionam offline, sem dependencia de rede.
        </Text>
        <View style={styles.row}>
          <LogoPicker label="Logo da Contratada" value={h.contractorLogo}
            onChange={(v) => P.setHeader({ contractorLogo: v })} hint="Canto esquerdo" />
          <LogoPicker label="Logo da Contratante" value={h.clientLogo}
            onChange={(v) => P.setHeader({ clientLogo: v })} hint="Canto direito" />
        </View>

        <Text style={styles.section}>Escopo e Metodologia</Text>
        <VField label="Escopo dos Servicos" value={h.scope} onChangeText={set('scope')} multiline />
        <VField label="Metodologia Aplicada" value={h.methodology} onChangeText={set('methodology')} multiline />
        <VField label="Normas de Referencia (uma por linha)"
          value={(h.standards || []).join('\n')}
          onChangeText={(v) => P.setHeader({ standards: v.split('\n').filter(Boolean) })}
          multiline />

        <Text style={styles.section}>Instrumentos Utilizados</Text>
        {(h.instruments || []).map((i, idx) => (
          <View key={idx} style={styles.instRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.instName}>{i.name}</Text>
              <Text style={styles.instSub}>
                {[i.model, i.serial, i.calibration && `Cal. ${i.calibration}`].filter(Boolean).join('  ·  ')}
              </Text>
            </View>
            <Pressable onPress={() => removeInstrument(idx)} hitSlop={metrics.hitSlop} style={styles.instDel}>
              <Text style={styles.instDelTxt}>×</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.row}>
          <View style={{ flex: 2 }}><VField label="Instrumento" value={instName} onChangeText={setInstName} placeholder="Alicate amperimetro" /></View>
          <View style={{ flex: 1.4 }}><VField label="Modelo" value={instModel} onChangeText={setInstModel} placeholder="Fluke 376" /></View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><VField label="N. de Serie" value={instSerial} onChangeText={setInstSerial} /></View>
          <View style={{ flex: 1 }}><VField label="Calibracao" value={instCal} onChangeText={setInstCal} placeholder="2026-02-11" /></View>
        </View>
        <VButton label="Adicionar instrumento" variant="ghost" icon="+" onPress={addInstrument} disabled={!instName.trim()} />

        <Text style={styles.section}>Responsavel Tecnico</Text>
        <VField label="Nome" value={h.technician} onChangeText={set('technician')} placeholder="Robson do Carmo" />
        <VField label="Titulo Profissional" value={h.technicianTitle} onChangeText={set('technicianTitle')} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}><VField label="CREA" value={h.crea} onChangeText={set('crea')} placeholder="CREA-MG 0000000" /></View>
          <View style={{ flex: 1 }}><VField label="ART / RRT" value={h.art} onChangeText={set('art')} /></View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}><VField label="Data da Inspecao" value={h.inspectionDate} onChangeText={set('inspectionDate')} placeholder="AAAA-MM-DD" /></View>
          <View style={{ flex: 1 }}><VField label="Data de Emissao" value={h.issueDate} onChangeText={set('issueDate')} placeholder="AAAA-MM-DD" /></View>
        </View>

        <VButton label="Ir para geracao de documentos" icon="GER" size="lg"
          onPress={() => navigation.navigate('Gerar')} style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  section: {
    ...type.label, color: colors.primary, marginTop: 24, marginBottom: 12, fontSize: 13,
    borderTopWidth: metrics.borderW, borderColor: colors.border, paddingTop: 14,
  },
  hint: { ...type.caption, color: colors.textDim, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10 },
  instRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderRadius: 8, padding: 12, marginBottom: 8, gap: 10,
  },
  instName: { ...type.bodyBold, color: colors.text },
  instSub: { ...type.caption, color: colors.textDim, marginTop: 2 },
  instDel: {
    width: 44, height: 44, borderRadius: 8, borderWidth: 1.4, borderColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  instDelTxt: { ...type.h1, color: colors.danger, lineHeight: 26 },
});
