/**
 * Tipografia robusta para leitura em campo (capacete + luva + sol).
 * Familia: Roboto (Android nativo) / Aptos Narrow como alternativa de documento.
 * Tamanhos minimos elevados: nada abaixo de 13px na UI.
 */
import { Platform } from 'react-native';

const base = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'Roboto, "Aptos Narrow", "Helvetica Neue", Arial, sans-serif',
});

const condensed = Platform.select({
  ios: 'System',
  android: 'sans-serif-condensed',
  default: '"Aptos Narrow", "Roboto Condensed", Arial Narrow, sans-serif',
});

export const fonts = { base, condensed };

export const type = {
  display:  { fontFamily: condensed, fontSize: 30, fontWeight: '900', letterSpacing: 0.4 },
  h1:       { fontFamily: condensed, fontSize: 24, fontWeight: '800', letterSpacing: 0.3 },
  h2:       { fontFamily: base,      fontSize: 20, fontWeight: '700' },
  h3:       { fontFamily: base,      fontSize: 17, fontWeight: '700' },
  body:     { fontFamily: base,      fontSize: 16, fontWeight: '500' },
  bodyBold: { fontFamily: base,      fontSize: 16, fontWeight: '700' },
  label:    { fontFamily: condensed, fontSize: 13, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  caption:  { fontFamily: base,      fontSize: 13, fontWeight: '500' },
  mono:     { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 15, fontWeight: '600' },
};
