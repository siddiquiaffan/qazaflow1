import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, useTheme } from './theme';
import { Button, Field } from './ui';

export function NumberPrompt({
  visible,
  title,
  initial,
  confirmLabel = 'Save',
  max,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]} onPress={() => {}}>
          <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>{title}</Text>
          <View style={{ flexDirection: 'row' }}>
            <Field label={max === undefined ? 'Number' : `Number (up to ${max})`} value={text} onChangeText={setText} keyboardType="number-pad" autoFocus />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" variant="secondary" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel} disabled={!valid} onPress={() => onConfirm(parsed)} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg },
  sheet: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
});
