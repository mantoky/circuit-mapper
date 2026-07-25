/**
 * Modal com BACKDROP BLUR (expo-blur) - mantem a arvore visivel atras,
 * requisito de UX: editar atributos sem perder o contexto hierarquico.
 * Animacao de entrada suave (slide + fade) sem travar o thread de UI.
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, Pressable, Animated, StyleSheet, Platform, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, type, metrics, motion, shadow } from '../theme';

export default function BlurModal({
  visible, onClose, title, subtitle, children, footer, height = 0.86,
}) {
  const { height: H } = useWindowDimensions();
  const slide = useRef(new Animated.Value(60)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, { toValue: 0, duration: motion.base, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: motion.base, useNativeDriver: true }),
      ]).start();
    } else {
      slide.setValue(60); fade.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <BlurView
          intensity={Platform.OS === 'android' ? 55 : 32}
          tint="dark"
          style={StyleSheet.absoluteFill}
        >
          <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
        </BlurView>

        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: H * height, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              {!!subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
            </View>
            <Pressable onPress={onClose} hitSlop={metrics.hitSlop} style={styles.close}>
              <Text style={styles.closeTxt}>FECHAR</Text>
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>{children}</View>
          {!!footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: metrics.radiusLg + 6, borderTopRightRadius: metrics.radiusLg + 6,
    borderTopWidth: 3, borderColor: colors.primary,
    paddingBottom: 18, ...shadow.modal,
  },
  grabber: {
    width: 54, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: metrics.pad, paddingVertical: 12,
    borderBottomWidth: metrics.borderW, borderColor: colors.border,
  },
  title: { ...type.h2, color: colors.text },
  subtitle: { ...type.caption, color: colors.primary, marginTop: 3 },
  close: {
    height: 44, paddingHorizontal: 14, borderRadius: metrics.radius,
    borderWidth: metrics.borderW, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  closeTxt: { ...type.label, color: colors.textMuted },
  footer: {
    flexDirection: 'row', gap: 10, paddingHorizontal: metrics.pad, paddingTop: 12,
    borderTopWidth: metrics.borderW, borderColor: colors.border,
  },
});
