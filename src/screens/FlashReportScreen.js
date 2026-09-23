/**
 * FLASH REPORT — falhas em ambiente TI / LTE
 * Formulario + preview do card + texto WhatsApp + compartilhamento de imagem.
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, Share, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import ScreenHeader from '../components/ScreenHeader';
import VField from '../components/VField';
import VSelect from '../components/VSelect';
import VButton from '../components/VButton';
import LogoPicker from '../components/LogoPicker';
import FlashReportCard from '../components/FlashReportCard';
import { colors, type, metrics } from '../theme';
import { useProject } from '../store/ProjectContext';
import { exportImage, saveToGallery } from '../export/imageExport';
import {
  KINDS, ENVIRONMENTS, SEVERITIES, STATUSES,
  parseList, formatWhatsApp, formatSubject, validateFlashReport, nowLocalStamp,
} from '../core/flashReport';

const KIND_OPTS = KINDS.map((k) => k.id);
const ENV_OPTS = ENVIRONMENTS.map((e) => e.id);
const SEV_OPTS = SEVERITIES.map((s) => s.label);
const ST_OPTS = STATUSES.map((s) => s.label);

function labelToId(list, label) {
  const hit = list.find((x) => x.label === label || x.id === label);
  return hit ? hit.id : label;
}

export default function FlashReportScreen() {
  const P = useProject();
  const r = P.flashReport;
  const set = (k) => (v) => P.setFlash({ [k]: v });
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const msg = formatWhatsApp(r);

  const syncLogosFromHeader = () => {
    P.setFlash({
      client: r.client || P.header.client || '',
      contractor: r.contractor || P.header.contractor || '',
      clientLogo: P.header.clientLogo || r.clientLogo,
      contractorLogo: P.header.contractorLogo || r.contractorLogo,
    });
  };

  const bumpUpdate = () => {
    P.setFlash({
      updateNumber: Number(r.updateNumber || 1) + 1,
      kind: 'ATUALIZACAO',
      updatedAt: nowLocalStamp(),
    });
  };

  const markNormalized = () => {
    P.setFlash({
      status: 'normalizado',
      kind: 'NORMALIZACAO',
      updatedAt: nowLocalStamp(),
      situation: r.situation || 'Servico restabelecido. Monitoramento ativo.',
    });
  };

  const shareText = async () => {
    const issues = validateFlashReport(r).filter((i) => i.level === 'error');
    if (issues.length) {
      Alert.alert('Flash incompleto', issues.map((i) => i.message).join('\n'));
      return;
    }
    try {
      await Share.share({ message: msg, title: formatSubject(r) });
    } catch (e) {
      Alert.alert('Falha ao compartilhar', e.message);
    }
  };

  const shareImage = async () => {
    const issues = validateFlashReport(r).filter((i) => i.level === 'error');
    if (issues.length) {
      Alert.alert('Flash incompleto', issues.map((i) => i.message).join('\n'));
      return;
    }
    setBusy(true);
    try {
      const file = await exportImage(cardRef, {
        site: r.title || 'flash-report',
        reportNumber: r.ticket || 'FR',
      }, 'png', { width: 1080 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: file.mime,
          dialogTitle: formatSubject(r),
        });
      } else {
        await saveToGallery(file.uri);
        Alert.alert('Salvo', 'Imagem gravada na galeria.');
      }
    } catch (e) {
      Alert.alert('Falha na imagem', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="FLASH REPORT"
        subtitle="Falhas TI / LTE · logos contratada e contratante"
      />
      <ScrollView
        contentContainerStyle={{ padding: metrics.pad, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.actionsTop}>
          <VButton label="Caso demo" variant="ghost" icon="DEMO"
            onPress={() => P.resetFlash(true)} style={{ flex: 1 }} />
          <VButton label="Novo" variant="dark" icon="+"
            onPress={() => P.resetFlash(false)} style={{ flex: 1 }} />
        </View>

        <Text style={styles.section}>Classificacao</Text>
        <VSelect label="Tipo" value={r.kind} options={KIND_OPTS} onChange={set('kind')} allowClear={false} />
        <VSelect label="Ambiente" value={r.environment} options={ENV_OPTS}
          onChange={set('environment')} allowClear={false} />
        <VSelect
          label="Severidade"
          value={SEVERITIES.find((s) => s.id === r.severity)?.label || 'Alta'}
          options={SEV_OPTS}
          onChange={(v) => P.setFlash({ severity: labelToId(SEVERITIES, v) })}
          allowClear={false}
        />
        <VSelect
          label="Status"
          value={STATUSES.find((s) => s.id === r.status)?.label || 'Em atendimento'}
          options={ST_OPTS}
          onChange={(v) => P.setFlash({ status: labelToId(STATUSES, v) })}
          allowClear={false}
        />

        <Text style={styles.section}>Identificacao</Text>
        <VField label="Area / Gerencia" value={r.area} onChangeText={set('area')}
          placeholder="GER TECN ATEND PA" />
        <VField label="Titulo da falha" value={r.title} onChangeText={set('title')}
          placeholder="FALHA NO SERVIDOR DE IMPRESSAO" />
        <VField label="Descricao" value={r.description} onChangeText={set('description')}
          multiline placeholder="Indisponibilidade do servico..." />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <VField label="Chamado / Ticket" value={r.ticket} onChangeText={set('ticket')}
              placeholder="INC-2026-0412" />
          </View>
          <View style={{ flex: 0.55 }}>
            <VField label="Atualizacao #" value={String(r.updateNumber || 1)}
              onChangeText={(v) => P.setFlash({ updateNumber: Number(v) || 1 })}
              kind="number" />
          </View>
        </View>

        <Text style={styles.section}>Escopo do impacto</Text>
        <VField
          label="Locais afetados (virgula ou linha)"
          value={(r.locations || []).join(', ')}
          onChangeText={(v) => P.setFlash({ locations: parseList(v) })}
          multiline
          placeholder="Serra Leste, Serra Norte, Serra Sul"
        />
        <VField
          label="Servicos impactados"
          value={(r.services || []).join(', ')}
          onChangeText={(v) => P.setFlash({ services: parseList(v) })}
          multiline
          placeholder="Impressao, Digitalizacao"
        />
        <VField label="Impacto operacional" value={r.impact} onChangeText={set('impact')}
          multiline placeholder="Quem/o que ficou sem servico" />
        <VField label="Motivo" value={r.reason} onChangeText={set('reason')}
          multiline placeholder="Causa raiz ou hipotese" />
        <VField label="Situacao atual" value={r.situation} onChangeText={set('situation')}
          multiline placeholder="O que o time esta fazendo agora" />
        <VField label="Contorno / Workaround" value={r.workaround} onChangeText={set('workaround')}
          multiline placeholder="Alternativa enquanto normaliza" />

        <Text style={styles.section}>Linha do tempo</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <VField label="Inicio" value={r.startedAt} onChangeText={set('startedAt')}
              placeholder="AAAA-MM-DD HH:MM" />
          </View>
          <View style={{ flex: 1 }}>
            <VField label="Atualizado" value={r.updatedAt} onChangeText={set('updatedAt')}
              placeholder="AAAA-MM-DD HH:MM" />
          </View>
        </View>
        <VField label="Previsao de normalizacao (ETA)" value={r.eta} onChangeText={set('eta')}
          placeholder="AAAA-MM-DD HH:MM" />

        <Text style={styles.section}>Empresas e responsaveis</Text>
        <VField label="Contratante" value={r.client} onChangeText={set('client')}
          placeholder="Vale S.A." />
        <VField label="Contratada" value={r.contractor} onChangeText={set('contractor')}
          placeholder="Xerox" />
        <VField
          label="Times envolvidos"
          value={(r.teams || []).join(', ')}
          onChangeText={(v) => P.setFlash({ teams: parseList(v) })}
          placeholder="Xerox, TI Vale"
        />
        <VField label="Responsavel" value={r.responsible} onChangeText={set('responsible')}
          placeholder="Time Xerox" />
        <VField label="Contato / Plantao" value={r.contact} onChangeText={set('contact')}
          placeholder="Ramal / WhatsApp do plantao" />
        <VField label="Observacoes" value={r.notes} onChangeText={set('notes')} multiline />

        <Text style={styles.section}>Logotipos</Text>
        <Text style={styles.hint}>
          Contratada a esquerda, contratante a direita — embutidos no card de imagem.
        </Text>
        <View style={styles.row}>
          <LogoPicker label="Logo da Contratada" value={r.contractorLogo}
            onChange={(v) => P.setFlash({ contractorLogo: v })} hint="Esquerda" />
          <LogoPicker label="Logo da Contratante" value={r.clientLogo}
            onChange={(v) => P.setFlash({ clientLogo: v })} hint="Direita" />
        </View>
        <VButton label="Usar logos do cabecalho do laudo" variant="ghost" icon="LOGO"
          onPress={syncLogosFromHeader} style={{ marginBottom: 8 }} />

        <Text style={styles.section}>Atalhos</Text>
        <View style={styles.actionsTop}>
          <VButton label="Nova atualizacao" variant="dark" icon="#"
            onPress={bumpUpdate} style={{ flex: 1 }} />
          <VButton label="Normalizado" variant="ok" icon="OK"
            onPress={markNormalized} style={{ flex: 1 }} />
        </View>

        <Text style={styles.section}>Preview do card</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 8 }}>
          <View style={styles.cardScale} collapsable={false}>
            <View ref={cardRef} collapsable={false}>
              <FlashReportCard report={r} />
            </View>
          </View>
        </ScrollView>

        <Text style={styles.section}>Texto WhatsApp / Teams</Text>
        <View style={styles.msgBox}>
          <Text style={styles.msgTxt} selectable>{msg}</Text>
        </View>

        <VButton label="Compartilhar texto" icon="TXT" size="lg" onPress={shareText}
          style={{ marginTop: 16 }} />
        <VButton
          label={busy ? 'Gerando imagem...' : 'Compartilhar card (PNG)'}
          icon="IMG" variant="ghost" size="lg"
          onPress={shareImage} disabled={busy}
          style={{ marginTop: 10 }}
        />
        {Platform.OS === 'web' ? (
          <Text style={[styles.hint, { marginTop: 10 }]}>
            No build web, use a aba Flash e o botao de copiar / baixar PNG.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  section: {
    ...type.label, color: colors.primary, marginTop: 22, marginBottom: 12, fontSize: 13,
    borderTopWidth: metrics.borderW, borderColor: colors.border, paddingTop: 14,
  },
  hint: { ...type.caption, color: colors.textDim, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10 },
  actionsTop: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  cardScale: { transform: [{ scale: 0.34 }], width: 1080 * 0.34, height: 980 * 0.34 },
  msgBox: {
    backgroundColor: colors.surface, borderRadius: 10, padding: 14,
    borderWidth: 1.4, borderColor: colors.border,
  },
  msgTxt: { ...type.body, color: colors.text, fontSize: 13.5, lineHeight: 21 },
});
