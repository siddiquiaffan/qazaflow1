import { Ionicons } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';

import { LANGS, NATIVE_NAMES, tr, useI18n, useT, type Pref } from '@/i18n';

import { radius, spacing, useTheme } from './theme';
import { T } from './ui';

/** Radio list: follow the phone, or one of the supported languages. */
export function LanguageOptions({ onPick }: { onPick: (pref: Pref) => void }) {
  const t = useTheme();
  const { t: tx } = useT();
  const pref = useI18n((s) => s.pref);
  const options: { key: Pref; label: string }[] = [
    { key: 'system', label: tx('lang.system') },
    ...LANGS.map((l) => ({ key: l as Pref, label: NATIVE_NAMES[l] })),
  ];
  return (
    <>
      {options.map((o) => {
        const selected = o.key === pref;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.label}
            onPress={() => onPick(o.key)}
            android_ripple={{ color: t.primarySoft }}
            style={[styles.row, { borderBottomColor: t.border }]}
          >
            <T variant="subheading" style={{ flex: 1 }}>
              {o.label}
            </T>
            {selected ? <Ionicons name="checkmark-circle" size={24} color={t.primary} /> : null}
          </Pressable>
        );
      })}
    </>
  );
}

/** Ask for a restart when the layout direction changed (shared by Settings and first-run setup). */
export function chooseLanguage(next: Pref): void {
  const needsRestart = useI18n.getState().setPref(next);
  if (!needsRestart) return;
  const { t: after } = tr();
  Alert.alert(after('lang.restartTitle'), after('lang.restartText', { app: after('app.name') }), [
    { text: after('lang.restart'), onPress: () => reloadAppAsync('language change') },
  ]);
}

/** Bottom sheet to pick the app language: follow the phone, or one of the supported languages. */
export function LanguageSheet({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (pref: Pref) => void;
}) {
  const t = useTheme();
  const { t: tx } = useT();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: t.surface }]} onPress={() => {}}>
          <T variant="heading" style={{ marginBottom: spacing.xs }}>
            {tx('lang.pick')}
          </T>
          <LanguageOptions onPick={onPick} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
