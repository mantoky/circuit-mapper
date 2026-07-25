/**
 * Botao industrial: alvo minimo 56dp, alto contraste, feedback tatil imediato.
 * Variantes: primary (amarelo) | ghost | danger | dark
 */
import React, { useRef } from 'react';
import { Pressable, Text, View, Animated, StyleSheet } from 'react-native';
import { colors, type, metrics, motion, shadow } from '../theme';

export default function VButton({
  label, onPress, variant = 'primary', icon, size = 'md',
  disabled = false, style, textStyle, full = false,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (to) => Animated.timing(scale, {
    toValue: to, duration: motion.fast, useNativeDriver: true,
  }).start();

  const v = VARIANTS[variant] || VARIANTS.primary;
  const h = size === 'lg' ? metrics.touchLarge : metrics.touchMin; // sm/md >= 56dp (luva)

  return (
    <Animated.View style={[{ transform: [{ scale }] }, full && { flex: 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        hitSlop={metrics.hitSlop}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.base,
          { height: h, backgroundColor: v.bg, borderColor: v.border },
          pressed && { backgroundColor: v.pressed },
          disabled && styles.disabled,
        ]}
      >
        {!!icon && (
          <View style={[styles.iconBox, { borderColor: v.fg }]}>
            <Text style={[styles.iconTxt, { color: v.fg }]}>{icon}</Text>
          </View>
        )}
        <Text
          numberOfLines={1}
          style={[
            size === 'sm' ? type.label : type.bodyBold,
            { color: v.fg, letterSpacing: 0.6, textTransform: 'uppercase' },
            textStyle,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const VARIANTS = {
  primary: { bg: colors.primary, pressed: colors.primaryDark, fg: colors.onPrimary, border: colors.primary },
  ghost:   { bg: 'transparent', pressed: colors.surfaceAlt, fg: colors.primary, border: colors.primary },
  dark:    { bg: colors.surface, pressed: colors.surfaceAlt, fg: colors.text, border: colors.border },
  danger:  { bg: colors.danger, pressed: '#C22F32', fg: '#FFF', border: colors.danger },
  ok:      { bg: colors.ok, pressed: '#2A9E55', fg: '#0E1F14', border: colors.ok },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: metrics.radius, borderWidth: metrics.borderW,
    paddingHorizontal: metrics.pad, gap: 10, ...shadow.card,
  },
  disabled: { opacity: 0.4 },
  iconBox: {
    width: 26, height: 26, borderRadius: 6, borderWidth: 1.4,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTxt: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
});
