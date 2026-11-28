import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme/tokens';

export interface ShellTabBarProps {
  state: { index: number; routes: readonly { key: string; name: string; params?: object }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: {
    emit: (event: { type: 'tabPress' | 'tabLongPress'; target: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
}

const tabIcons: Record<string, ImageSourcePropType> = {
  home: require('../../../assets/shell/tab-home.png'),
  catalog: require('../../../assets/shell/tab-catalog.png'),
  diagnosis: require('../../../assets/shell/tab-diagnosis.png'),
  history: require('../../../assets/shell/tab-history.png'),
  account: require('../../../assets/shell/tab-account.png'),
};

export function ShellTabBar({ state, descriptors, navigation }: ShellTabBarProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, theme.spacing.md);

  return (
    <View style={[styles.container, { paddingBottom }]}>
      <View accessibilityRole="tablist" style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = typeof options.title === 'string' ? options.title : route.name;
          const focused = state.index === index;
          const isDiagnosis = route.name === 'diagnosis';
          const icon = tabIcons[route.name];

          function handlePress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={handlePress}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            >
              <View style={[
                styles.iconPill,
                isDiagnosis ? styles.diagnosisPill : focused && styles.selectedPill,
              ]}>
                {icon && <Image source={icon} accessible={false} style={styles.icon} />}
              </View>
              <Text
                numberOfLines={1}
                style={[styles.label, (focused || isDiagnosis) ? styles.selectedLabel : styles.idleLabel]}
              >
                {label}
              </Text>
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryPressed,
    borderRadius: theme.radius.media,
    paddingVertical: theme.spacing.xs,
  },
  tab: {
    flex: 1,
    minWidth: theme.layout.touchMin,
    minHeight: theme.shell.tabMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  tabPressed: { opacity: 0.84 },
  iconPill: {
    width: theme.shell.tabIconWidth,
    height: theme.shell.tabIconHeight,
    borderRadius: theme.radius.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPill: { backgroundColor: theme.colors.primary },
  diagnosisPill: {
    width: theme.shell.tabCenterIconWidth,
    backgroundColor: theme.colors.accent,
  },
  icon: {
    width: theme.shell.tabIconSize,
    height: theme.shell.tabIconSize,
  },
  label: {
    ...theme.typography.label,
    textAlign: 'center',
  },
  selectedLabel: { color: theme.colors.onPrimary },
  idleLabel: { color: theme.colors.secondary },
  indicator: {
    width: theme.shell.indicatorWidth,
    height: theme.shell.indicatorHeight,
    borderRadius: 1,
  },
  indicatorActive: { backgroundColor: theme.colors.accent },
});
