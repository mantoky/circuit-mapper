/**
 * Card visual do Flash Report — capturavel como PNG/JPG para
 * compartilhamento rapido no grupo da operacao (WhatsApp / Teams).
 * Inclui logos da contratada (esq.) e contratante (dir.).
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, type } from '../theme';
import {
  kindInfo, statusInfo, severityInfo, environmentInfo, joinList,
} from '../core/flashReport';

export default function FlashReportCard({ report }) {
  const r = report || {};
  const kind = kindInfo(r.kind);
  const st = statusInfo(r.status);
  const sev = severityInfo(r.severity);
  const env = environmentInfo(r.environment);
  const locs = joinList(r.locations);
  const svcs = joinList(r.services);
  const teams = joinList(r.teams);
  const accent = statusAccent(r.status);

  return (
    <View style={styles.card}>
      <View style={[styles.stripe, { backgroundColor: accent }]} />

      <View style={styles.logos}>
        <LogoSlot uri={r.contractorLogo} caption={r.contractor || 'Contratada'} align="left" />
        <View style={styles.logoMid}>
          <Text style={styles.kicker}>{kind.emoji} FLASH REPORT</Text>
          <Text style={styles.kindLine}>{kind.id} · {env.label}</Text>
        </View>
        <LogoSlot uri={r.clientLogo} caption={r.client || 'Contratante'} align="right" />
      </View>

      <Text style={styles.area}>{r.area || 'OPERACAO'}</Text>
      {Number(r.updateNumber) > 1 ? (
        <Text style={styles.update}>ATUALIZACAO #{r.updateNumber}</Text>
      ) : null}

      <Text style={styles.title}>{String(r.title || 'SEM TITULO').toUpperCase()}</Text>
      {!!r.description && <Text style={styles.desc}>{r.description}</Text>}

      <View style={styles.badges}>
        <Badge label={`${st.emoji} ${st.label}`} color={accent} />
        <Badge label={`${sev.emoji} ${sev.label}`} color={colors.warn} />
        {!!r.ticket && <Badge label={r.ticket} color={colors.info} />}
      </View>

      {!!locs && (
        <Row label="Locais afetados" value={locs} />
      )}
      {!!svcs && (
        <Row label="Servicos impactados" value={svcs} />
      )}
      {!!r.impact && (
        <Row label="Impacto" value={r.impact} />
      )}
      {!!r.reason && (
        <Row label="Motivo" value={r.reason} />
      )}
      {!!r.situation && (
        <Row label="Situacao atual" value={r.situation} highlight />
      )}
      {!!r.workaround && (
        <Row label="Contorno" value={r.workaround} />
      )}

      <View style={styles.timeline}>
        {!!r.startedAt && <TimeCell k="Inicio" v={r.startedAt} />}
        {!!r.updatedAt && <TimeCell k="Atualizado" v={r.updatedAt} />}
        {!!r.eta && <TimeCell k="Previsao" v={r.eta} />}
      </View>

      <View style={styles.parties}>
        {!!r.client && <Text style={styles.party}>Contratante: {r.client}</Text>}
        {!!r.contractor && <Text style={styles.party}>Contratada: {r.contractor}</Text>}
        {!!teams && <Text style={styles.party}>Times: {teams}</Text>}
        {!!r.responsible && <Text style={styles.party}>Responsavel: {r.responsible}</Text>}
        {!!r.contact && <Text style={styles.party}>Contato: {r.contact}</Text>}
      </View>

      {!!r.notes && <Text style={styles.notes}>Obs.: {r.notes}</Text>}

      <View style={[styles.stripeBottom, { backgroundColor: accent }]} />
    </View>
  );
}

function LogoSlot({ uri, caption, align }) {
  return (
    <View style={[styles.logoSlot, align === 'right' && { alignItems: 'flex-end' }]}>
      {uri ? (
        <Image source={{ uri }} style={styles.logoImg} resizeMode="contain" />
      ) : (
        <View style={styles.logoPh}>
          <Text style={styles.logoPhTxt}>LOGO</Text>
        </View>
      )}
      <Text style={styles.logoCap} numberOfLines={1}>{caption}</Text>
    </View>
  );
}

function Badge({ label, color }) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}22` }]}>
      <Text style={[styles.badgeTxt, { color }]}>{label}</Text>
    </View>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={[styles.row, highlight && styles.rowHi]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function TimeCell({ k, v }) {
  return (
    <View style={styles.timeCell}>
      <Text style={styles.timeK}>{k}</Text>
      <Text style={styles.timeV}>{v}</Text>
    </View>
  );
}

function statusAccent(status) {
  switch (status) {
    case 'normalizado': return colors.ok;
    case 'encerrado': return colors.textDim;
    case 'identificado': return colors.info;
    case 'em_analise': return '#A78BFA';
    case 'monitorando': return colors.warn;
    case 'em_atendimento':
    default: return colors.warn;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    padding: 36,
    width: 1080,
    borderWidth: 2,
    borderColor: colors.borderStrong,
  },
  stripe: { height: 12, borderRadius: 3, marginBottom: 28 },
  stripeBottom: { height: 12, borderRadius: 3, marginTop: 28 },
  logos: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18, gap: 18,
  },
  logoSlot: { width: 220, alignItems: 'flex-start' },
  logoImg: { width: 200, height: 72 },
  logoPh: {
    width: 160, height: 64, borderWidth: 2, borderStyle: 'dashed',
    borderColor: colors.borderStrong, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  logoPhTxt: { ...type.label, color: colors.textDim, fontSize: 14 },
  logoCap: { ...type.caption, color: colors.textDim, marginTop: 8, fontSize: 16 },
  logoMid: { flex: 1, alignItems: 'center' },
  kicker: {
    ...type.label, color: colors.primary, fontSize: 22, letterSpacing: 3, textAlign: 'center',
  },
  kindLine: {
    ...type.bodyBold, color: colors.textMuted, fontSize: 20, marginTop: 8, textAlign: 'center',
  },
  area: {
    ...type.label, color: colors.textMuted, fontSize: 18, letterSpacing: 1.5,
    textAlign: 'center', marginTop: 6,
  },
  update: {
    ...type.label, color: colors.warn, fontSize: 16, textAlign: 'center', marginTop: 8,
  },
  title: {
    ...type.display, color: colors.text, fontSize: 42, marginTop: 22,
    textAlign: 'center', lineHeight: 50,
  },
  desc: {
    ...type.body, color: colors.textMuted, fontSize: 24, marginTop: 14,
    textAlign: 'center', lineHeight: 34,
  },
  badges: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 12, marginTop: 26, marginBottom: 18,
  },
  badge: {
    borderWidth: 2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  badgeTxt: { ...type.bodyBold, fontSize: 20 },
  row: {
    backgroundColor: colors.surface, borderRadius: 12, padding: 18,
    marginBottom: 10, borderLeftWidth: 6, borderLeftColor: colors.primary,
  },
  rowHi: { borderLeftColor: colors.warn, backgroundColor: colors.warnSoft },
  rowLabel: { ...type.label, color: colors.primary, fontSize: 16, marginBottom: 6 },
  rowValue: { ...type.body, color: colors.textMuted, fontSize: 22, lineHeight: 30 },
  timeline: { flexDirection: 'row', gap: 12, marginTop: 14 },
  timeCell: {
    flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: 10, padding: 16,
  },
  timeK: { ...type.label, color: colors.textDim, fontSize: 14 },
  timeV: { ...type.bodyBold, color: colors.text, fontSize: 20, marginTop: 6 },
  parties: { marginTop: 20, gap: 4 },
  party: { ...type.caption, color: colors.textDim, fontSize: 18, lineHeight: 26 },
  notes: {
    ...type.body, color: colors.textDim, fontSize: 18, fontStyle: 'italic',
    marginTop: 16, lineHeight: 26,
  },
});
