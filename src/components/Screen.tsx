import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from './theme';
import { T } from './ui';

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: 20,
        paddingBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1 }}>
        {subtitle ? (
          <T variant="label" color="muted">
            {subtitle}
          </T>
        ) : null}
        <T variant="title" accessibilityRole="header">
          {title}
        </T>
      </View>
      {right}
    </View>
  );
}

export function Screen({
  title,
  subtitle,
  right,
  children,
  contentStyle,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader title={title} subtitle={subtitle} right={right} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 120, gap: spacing.md }, contentStyle]}
      >
        {children}
      </ScrollView>
    </View>
  );
}
