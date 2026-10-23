import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { radius } from './theme';
import { T } from './ui';
import { useTheme } from './theme';

interface ToastState {
  id: number;
  message: string | null;
  actionLabel?: string;
  onAction?: () => void;
  show: (message: string, action?: { label: string; onPress: () => void }) => void;
  hide: () => void;
}

export const useToast = create<ToastState>((set) => ({
  id: 0,
  message: null,
  show: (message, action) =>
    set((s) => ({ id: s.id + 1, message, actionLabel: action?.label, onAction: action?.onPress })),
  hide: () => set({ message: null, actionLabel: undefined, onAction: undefined }),
}));

const DURATION_MS = 4000;

/** Mount once near the root. Shows the latest toast above the tab bar for a few seconds. */
export function ToastHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id, message, actionLabel, onAction, hide } = useToast();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return;
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, bounciness: 6 }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => hide());
    }, DURATION_MS);
    return () => clearTimeout(timer);
    // `id` restarts the timer when a new toast replaces the current one.
  }, [id, message, slide, hide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + 84,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        },
      ]}
    >
      <View
        accessibilityLiveRegion="polite"
        style={[styles.toast, { backgroundColor: t.text }]}
      >
        <T variant="subheading" style={{ color: t.bg, flex: 1 }}>
          {message}
        </T>
        {actionLabel && onAction ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              onAction();
              hide();
            }}
          >
            <T variant="subheading" style={{ color: t.accent }}>
              {actionLabel}
            </T>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    elevation: 6,
  },
});
