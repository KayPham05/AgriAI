import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton } from '@/components/ui/ActionButton';
import { ListRow } from '@/components/ui/ListRow';
import { StatePanel } from '@/components/ui/StatePanel';
import type { AgriculturalProfileItem } from '@/features/profiles/fetchAgriculturalProfiles';
import { theme } from '@/theme/tokens';

export interface AgriculturalProfilesScreenProps {
  profiles: readonly AgriculturalProfileItem[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onCreate: () => void;
  onSelectProfile: (id: string) => void;
  onBack: () => void;
}

/** S17 owner agricultural profiles list; no fake server pagination. */
export function AgriculturalProfilesScreen({
  profiles,
  loading = false,
  error,
  onRefresh,
  onCreate,
  onSelectProfile,
  onBack,
}: AgriculturalProfilesScreenProps) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>Hồ sơ nông nghiệp</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Thêm hồ sơ" onPress={onCreate} style={styles.addBtn}>
          <Text style={styles.addText}>+ Thêm</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {loading && profiles.length === 0 ? (
            <StatePanel kind="loading" title="Đang tải hồ sơ" message="Vui lòng đợi trong giây lát." />
          ) : error && profiles.length === 0 ? (
            <StatePanel
              kind="error"
              title="Không tải được hồ sơ"
              message={error}
              actionLabel={onRefresh ? 'Thử lại' : undefined}
              onAction={onRefresh}
            />
          ) : profiles.length === 0 ? (
            <StatePanel
              kind="empty"
              title="Chưa có hồ sơ nông nghiệp"
              message="Tạo hồ sơ để theo dõi các lần chẩn đoán theo từng vườn hoặc thửa ruộng."
              actionLabel="Tạo hồ sơ"
              onAction={onCreate}
            />
          ) : (
            <>
              <View style={styles.list}>
                {profiles.map((profile, idx) => {
                  const sub = profile.description
                    ? `${profile.description} · ${profile.predictionCount} lượt chẩn đoán`
                    : `${profile.predictionCount} lượt chẩn đoán`;
                  return (
                    <Fragment key={profile.id}>
                      {idx > 0 && <View style={styles.separator} />}
                      <ListRow
                        title={profile.name}
                        subtitle={sub}
                        icon={require('../../../../assets/shell/user-round.png')}
                        onPress={() => onSelectProfile(profile.id)}
                      />
                    </Fragment>
                  );
                })}
              </View>
              <ActionButton label="Tạo hồ sơ mới" onPress={onCreate} />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.gutter, paddingVertical: theme.spacing.sm,
  },
  backBtn: { minHeight: theme.layout.touchMin, justifyContent: 'center' },
  backText: { ...theme.typography.label, color: theme.colors.text },
  headerTitle: { ...theme.typography.subtitle, color: theme.colors.text },
  addBtn: { minWidth: theme.layout.touchMin, minHeight: theme.layout.touchMin, justifyContent: 'center', alignItems: 'flex-end' },
  addText: { ...theme.typography.label, color: theme.colors.primary },
  scrollContent: { flexGrow: 1, paddingHorizontal: theme.spacing.gutter, paddingBottom: theme.spacing.xl },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.md },
  list: { width: '100%' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
});
