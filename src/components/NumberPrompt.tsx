import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from './theme';
import { Button, Field, IconButton, T } from './ui';

/** Bottom-sheet prompt for entering a whole number, with quick -/+ steppers. */
export function NumberPrompt({
  visible,
  title,
  hint,
  initial,
  confirmLabel = 'Save',
  max,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  hint?: string;
  initial: number;
  confirmLabel?: string;
  max?: number;
  onCancel: () => void;
  onConfirm: (value: number) => void;
}) {
  const t = useTheme();
  const [text, setText] = useState(String(initial));

  useEffect(() => {
    if (visible) setText(String(initial));
  }, [visible, initial]);

  const parsed = Math.floor(Number(text));
  const valid = text.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && (max === undefined || parsed <= max);
  const step = (delta: number) => {
    const base = Number.isFinite(parsed) ? parsed : 0;
    const next = Math.max(0, max === undefined ? base + delta : Math.min(max, base + delta));
    setText(String(next));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onCancel}>
          <Pressable style={[styles.sheet, { backgroundColor: t.surface }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: t.border }]} />
            <T variant="heading">{title}</T>
            {hint ? (
              <T variant="caption" color="muted">
                {hint}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              <IconButton icon="remove" label="Decrease" onPress={() => step(-1)} size={52} />
              <Field
                label={max === undefined ? 'Number' : `Number (up to ${max.toLocaleString()})`}
                value={text}
                onChangeText={(v) => setText(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                style={{ textAlign: 'center', fontSize: 22 }}
              />
              <IconButton icon="add" label="Increase" onPress={() => step(1)} size={52} />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label="Cancel" variant="tonal" onPress={onCancel} style={{ flex: 1 }} />
              <Button label={confirmLabel} disabled={!valid} onPress={() => onConfirm(parsed)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
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
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 4 },
});
