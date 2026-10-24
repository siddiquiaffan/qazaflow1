import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { toAsciiDigits, useT } from '@/i18n';

import { radius, spacing, useTheme } from './theme';
import { Button, Field, IconButton, T } from './ui';

/** Dialog for entering a whole number, with quick -/+ steppers. */
export function NumberPrompt({
  visible,
  hidden = false,
  title,
  hint,
  initial,
  confirmLabel,
  min = 0,
  max,
  extra,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  /** Hide the dialog without resetting what was typed (e.g. while a picker is open on top). */
  hidden?: boolean;
  title: string;
  hint?: string;
  initial: number;
  confirmLabel?: string;
  min?: number;
  max?: number;
  /** Optional controls shown under the number field (e.g. a day selector). */
  extra?: ReactNode;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}) {
  const t = useTheme();
  const { t: tx, digits } = useT();
  const [text, setText] = useState(String(initial));

  useEffect(() => {
    if (visible) setText(String(initial));
  }, [visible, initial]);

  const parsed = Math.floor(Number(text));
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= min && (max === undefined || parsed <= max);
  const step = (delta: number) => {
    const base = Number.isFinite(parsed) ? parsed : 0;
    const next = Math.max(min, max === undefined ? base + delta : Math.min(max, base + delta));
    setText(String(next));
  };

  return (
    <Modal visible={visible && !hidden} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onCancel}>
          <Pressable style={[styles.sheet, { backgroundColor: t.surface }]} onPress={() => {}}>
            <T variant="heading">{title}</T>
            {hint ? (
              <T variant="caption" color="muted">
                {hint}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <IconButton icon="remove" label={tx('np.decrease')} onPress={() => step(-1)} size={52} />
              <Field
                label={max === undefined ? tx('np.number') : tx('np.range', { min, max })}
                value={digits(text)}
                onChangeText={(v) => setText(toAsciiDigits(v).replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                style={{ textAlign: 'center', fontSize: 22 }}
              />
              <IconButton icon="add" label={tx('np.increase')} onPress={() => step(1)} size={52} />
            </View>
            {extra}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={tx('common.cancel')} variant="tonal" onPress={onCancel} style={{ flex: 1 }} />
              <Button label={confirmLabel ?? tx('common.save')} disabled={!valid} onPress={() => onConfirm(parsed)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Anchored near the top so the number pad can never cover the buttons, whatever the
  // keyboard-resize behaviour of the device.
  backdrop: { flex: 1, justifyContent: 'flex-start', paddingTop: '14%', paddingHorizontal: spacing.md },
  sheet: { borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
});
