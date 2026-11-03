import React from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCheck, ShieldCheck, TriangleAlert, X } from 'lucide-react-native';
import { colors, maxWidth, radius, space, type } from '../theme';
import { initials } from '../lib/format';
import type { ProfileSummary, TrustLevel } from '../lib/types';

export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true }: {
  children: React.ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; padded?: boolean;
}) {
  const inner = <View style={[s.column, padded && s.padded]}>{children}</View>;
  if (!scroll) return <View style={s.screen}>{inner}</View>;
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={{ paddingBottom: space.xxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.teal} /> : undefined}
    >
      {inner}
    </ScrollView>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; accessibilityLabel?: string }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

type ButtonKind = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({ title, onPress, kind = 'primary', disabled, loading, icon, style }: {
  title: string; onPress: () => void; kind?: ButtonKind; disabled?: boolean; loading?: boolean; icon?: React.ReactNode; style?: ViewStyle;
}) {
  const bg = { primary: colors.teal, secondary: colors.surface, danger: colors.sos, ghost: 'transparent' }[kind];
  const fg = kind === 'primary' || kind === 'danger' ? colors.white : kind === 'secondary' ? colors.ink : colors.teal;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading) }}
      style={({ pressed }) => [
        s.button, { backgroundColor: bg }, kind === 'secondary' && s.buttonOutline,
        (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={[s.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }}
      style={[s.chip, selected && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
      <Text style={[s.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, style, ...props }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={type.label}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[s.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, error ? { borderColor: colors.sos } : null, style]}
        accessibilityLabel={label}
        {...props}
      />
      {error ? <Text style={[type.small, { color: colors.sos }]}>{error}</Text> : hint ? <Text style={type.small}>{hint}</Text> : null}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.teal, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
    </View>
  );
}

const LEVEL_TEXT: Record<TrustLevel, string> = { 1: 'Email', 2: 'Work email', 3: 'ID verified' };
export function TrustBadge({ level, expert }: { level: TrustLevel; expert?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
      <View style={[s.badge, level === 3 && { backgroundColor: colors.tealTint }]}>
        {level === 3 ? <BadgeCheck size={13} color={colors.teal} /> : <ShieldCheck size={13} color={colors.muted} />}
        <Text style={[s.badgeText, level === 3 && { color: colors.teal }]}>{LEVEL_TEXT[level]}</Text>
      </View>
      {expert ? (
        <View style={[s.badge, { backgroundColor: colors.saffronTint }]}>
          <Text style={[s.badgeText, { color: colors.saffron }]}>Expert</Text>
        </View>
      ) : null}
    </View>
  );
}

export function PersonLine({ person, sub }: { person: ProfileSummary; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Avatar name={person.displayName} size={32} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600', color: colors.ink }} numberOfLines={1}>{person.displayName}</Text>
        {sub ? <Text style={type.small} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <TrustBadge level={person.trustLevel} expert={person.isExpert} />
    </View>
  );
}

export function Banner({ tone = 'warn', title, children }: { tone?: 'warn' | 'info' | 'danger'; title?: string; children: React.ReactNode }) {
  const bg = { warn: colors.saffronTint, info: colors.tealTint, danger: colors.sosTint }[tone];
  const fg = { warn: colors.saffron, info: colors.teal, danger: colors.sos }[tone];
  return (
    <View style={[s.banner, { backgroundColor: bg }]} accessibilityRole="alert">
      <TriangleAlert size={18} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={{ fontWeight: '700', color: fg }}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>{children}</Text> : children}
      </View>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.lg }}>
      <Text style={type.h2}>{children}</Text>
      {action}
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <View style={s.empty}>
      <Text style={[type.h2, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.small, { textAlign: 'center' }]}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  return children ? <Text style={[type.small, { color: colors.sos }]} accessibilityRole="alert">{children}</Text> : null;
}

export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.sheetBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[s.sheet, { paddingBottom: space.xl + insets.bottom }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={type.h2}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={12}>
              <X size={22} color={colors.muted} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Loading() {
  return (
    <View style={{ padding: space.xxl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.teal} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  column: { width: '100%', maxWidth, alignSelf: 'center', gap: space.md },
  padded: { paddingHorizontal: space.lg, paddingTop: space.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.sm, borderWidth: 1, borderColor: colors.line },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  buttonOutline: { borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: 16, fontWeight: '600' },
  chip: { paddingHorizontal: space.md, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipText: { fontSize: 14, fontWeight: '500', color: colors.ink },
  input: { minHeight: 48, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16, color: colors.ink },
  avatar: { backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.bg },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  banner: { flexDirection: 'row', gap: space.sm, padding: space.md, borderRadius: radius.md, alignItems: 'flex-start' },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.lg },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,31,75,0.35)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.xl, gap: space.md, width: '100%', maxWidth, alignSelf: 'center' },
});
