import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from './theme';
import { Button, T } from './ui';

/**
 * Native clock / calendar picker. On Android it opens the system dialog (clock face for time,
 * calendar for date); on iOS it shows a bottom sheet with a spinner.
 */
export function DateTimeSheet({
  visible,
  mode,
  value,
  maximumDate,
  title,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  mode: 'time' | 'date';
  value: Date;
  maximumDate?: Date;
  title?: string;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState(value);

  // Keep the latest callbacks without re-opening the Android dialog when they change.
  const latest = useRef({ onCancel, onConfirm, value, mode, maximumDate });
  latest.current = { onCancel, onConfirm, value, mode, maximumDate };

  useEffect(() => {
    if (!visible) return;
    if (Platform.OS === 'android') {
      const { value: v, mode: m, maximumDate: max } = latest.current;
      DateTimePickerAndroid.open({
        value: v,
        mode: m,
        display: m === 'time' ? 'clock' : 'calendar',
        is24Hour: false,
        maximumDate: max,
        onChange: (event, date) => {
          if (event.type === 'set' && date) latest.current.onConfirm(date);
          else latest.current.onCancel();
        },
      });
      return () => {
        DateTimePickerAndroid.dismiss(latest.current.mode).catch(() => {});
      };
    }
    setDraft(latest.current.value);
  }, [visible]);

  if (Platform.OS === 'android') return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: t.overlay }]} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: t.surface }]} onPress={() => {}}>
          {title ? <T variant="heading">{title}</T> : null}
          <DateTimePicker
            value={draft}
            mode={mode}
            display="spinner"
            maximumDate={maximumDate}
            onChange={(_, d) => d && setDraft(d)}
            themeVariant={t.bg === '#0B1512' ? 'dark' : 'light'}
          />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="Cancel" variant="tonal" onPress={onCancel} style={{ flex: 1 }} />
            <Button label="Done" onPress={() => onConfirm(draft)} style={{ flex: 1 }} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.md },
});
