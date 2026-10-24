import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch as RNSwitch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { isRtl, URDU_FONT, URDU_LINE_HEIGHT, useI18n, type Lang } from '@/i18n';

import { tap } from './haptics';
import { radius, spacing, useTheme, type Theme } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/* ───────────── Typography ───────────── */

type Variant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
type ColorKey = 'text' | 'muted' | 'primary' | 'danger' | 'onPrimary' | 'onHero' | 'onHeroMuted' | 'accent' | 'success';

const VARIANTS: Record<Variant, TextStyle> = {
  display: { fontSize: 52, fontWeight: '800', letterSpacing: -1.5 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  heading: { fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
  subheading: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 23 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
};

/**
 * Script-specific text tweaks. Joined scripts break if letters are spaced apart, and Urdu's Nastaliq
 * font needs a taller line box than Latin text or its strokes get clipped.
 */
export function localizeTextStyle(style: TextStyle, lang: Lang): TextStyle {
  if (lang === 'en') return style;
  const out: { -readonly [K in keyof TextStyle]: TextStyle[K] } = { ...style, letterSpacing: 0, textTransform: 'none' };
  if (lang !== 'ur') return out;
  const size = typeof style.fontSize === 'number' ? style.fontSize : 16;
  const weight = String(style.fontWeight ?? '400');
  const bold = weight === 'bold' || Number(weight) >= 600;
  out.fontFamily = bold ? URDU_FONT.bold : URDU_FONT.regular;
  out.fontWeight = 'normal';
  out.lineHeight = Math.round(size * URDU_LINE_HEIGHT);
  return out;
}

export function T({
  variant = 'body',
  color = 'text',
  style,
  ...props
}: TextProps & { variant?: Variant; color?: ColorKey }) {
  const t = useTheme();
  const lang = useI18n((s) => s.lang);
  const flat = StyleSheet.flatten([VARIANTS[variant], { color: t[color] }, style]) as TextStyle;
  return <Text {...props} style={localizeTextStyle(flat, lang)} />;
}

/** Chevron that points the way the reading direction goes. */
export function ForwardIcon({ size = 18, color }: { size?: number; color: string }) {
  const rtl = isRtl(useI18n((s) => s.lang));
  return <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={size} color={color} />;
}

/* ───────────── Surfaces ───────────── */

export function Card({
  children,
  style,
  tone = 'plain',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'plain' | 'tinted' | 'hero' | 'accent';
}) {
  const t = useTheme();
  const bg = { plain: t.surface, tinted: t.primarySoft, hero: t.hero, accent: t.accentSoft }[tone];
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg, borderColor: tone === 'plain' ? t.border : 'transparent' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A card holding rows separated by hairlines. */
export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <T variant="label" color="muted">
        {children}
      </T>
      {right}
    </View>
  );
}

/* ───────────── Icons ───────────── */

export function IconBadge({
  name,
  size = 44,
  tone = 'primary',
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  tone?: 'primary' | 'accent' | 'danger';
}) {
  const t = useTheme();
  const bg = { primary: t.primarySoft, accent: t.accentSoft, danger: t.dangerSoft }[tone];
  const fg = { primary: t.primary, accent: t.onAccentSoft, danger: t.danger }[tone];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={size * 0.5} color={fg} />
    </View>
  );
}

/* ───────────── Buttons ───────────── */

type ButtonVariant = 'primary' | 'tonal' | 'ghost' | 'danger' | 'onHero';

function buttonColors(t: Theme, v: ButtonVariant) {
  switch (v) {
    case 'primary':
      return { bg: t.primary, fg: t.onPrimary };
    case 'tonal':
      return { bg: t.primarySoft, fg: t.primary };
    case 'ghost':
      return { bg: 'transparent', fg: t.primary };
    case 'danger':
      return { bg: t.dangerSoft, fg: t.danger };
    case 'onHero':
      return { bg: 'rgba(255,255,255,0.16)', fg: t.onHero };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  size = 'md',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  size?: 'md' | 'sm';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const { bg, fg } = buttonColors(t, variant);
  const small = size === 'sm';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, minHeight: small ? 40 : 52, paddingHorizontal: small ? 14 : 20 },
        { opacity: disabled ? 0.4 : pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 18 : 20} color={fg} />}
          <T style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '700' }}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'tonal',
  size = 44,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: number;
  disabled?: boolean;
}) {
  const t = useTheme();
  const { bg, fg } = buttonColors(t, variant);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed ? 0.94 : 1 }],
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={fg} />
    </Pressable>
  );
}

/* ───────────── Rows ───────────── */

export function ListRow({
  icon,
  leading,
  title,
  subtitle,
  right,
  onPress,
  danger,
  last,
}: {
  icon?: IconName;
  /** Custom leading element; takes precedence over `icon`. */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  const content = (
    <View style={[styles.row, !last && { borderBottomColor: t.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      {leading ?? (icon ? <IconBadge name={icon} size={40} tone={danger ? 'danger' : 'primary'} /> : null)}
      <View style={{ flex: 1 }}>
        <T variant="subheading" color={danger ? 'danger' : 'text'}>
          {title}
        </T>
        {subtitle ? (
          <T variant="caption" color="muted">
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <ForwardIcon color={t.muted} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        tap();
        onPress();
      }}
      android_ripple={{ color: t.primarySoft }}
    >
      {content}
    </Pressable>
  );
}

export function Switch({ value, onValueChange, label }: { value: boolean; onValueChange: (v: boolean) => void; label: string }) {
  const t = useTheme();
  return (
    <RNSwitch
      accessibilityLabel={label}
      value={value}
      onValueChange={(v) => {
        tap();
        onValueChange(v);
      }}
      trackColor={{ false: t.track, true: t.primary }}
      thumbColor={value ? t.onPrimary : '#FFFFFF'}
    />
  );
}

/* ───────────── Inputs ───────────── */

export function Field({ label, style, ...props }: { label: string } & TextInputProps) {
  const t = useTheme();
  const lang = useI18n((s) => s.lang);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <T variant="caption" color="muted">
        {label}
      </T>
      <TextInput
        placeholderTextColor={t.muted}
        accessibilityLabel={label}
        selectionColor={t.primary}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          { color: t.text, backgroundColor: t.surface, borderColor: focused ? t.primary : t.border },
          lang === 'ur' ? { fontFamily: URDU_FONT.regular } : null,
          style,
        ]}
      />
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.segment, selected && { backgroundColor: t.surface, borderColor: t.border, borderWidth: StyleSheet.hairlineWidth }]}
          >
            <T style={{ color: selected ? t.primary : t.muted, fontWeight: '700', fontSize: 14 }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────── Progress & feedback ───────────── */

export function ProgressBar({ fraction, height = 8, color }: { fraction: number; height?: number; color?: string }) {
  const t = useTheme();
  const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: t.track }}
    >
      <View style={{ height: '100%', width: `${pct}%`, borderRadius: height / 2, backgroundColor: color ?? t.primary }} />
    </View>
  );
}

export function EmptyState({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.empty}>
      <IconBadge name={icon} size={72} />
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T color="muted" style={{ textAlign: 'center', maxWidth: 280 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: -spacing.xs,
    paddingHorizontal: 4,
  },
  button: {
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: spacing.md, paddingVertical: 14, minHeight: 64 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    fontWeight: '600',
  },
  segmented: { flexDirection: 'row', borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 42, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 48, paddingHorizontal: spacing.lg },
});
