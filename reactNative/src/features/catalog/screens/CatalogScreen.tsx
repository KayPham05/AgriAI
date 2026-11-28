import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { ListRow } from '@/components/ui/ListRow';
import { theme } from '@/theme/tokens';

export type CatalogCategory = 'plants' | 'diseases' | 'medicines' | 'documents';

const categories: readonly {
  id: CatalogCategory;
  title: string;
  subtitle: string;
  icon: ImageSourcePropType;
}[] = [
  { id: 'plants', title: 'Cây trồng', subtitle: 'Tên và thông tin cây trồng', icon: require('../../../../assets/shell/sprout.png') },
  { id: 'diseases', title: 'Bệnh và tình trạng', subtitle: 'Triệu chứng và hướng chăm sóc', icon: require('../../../../assets/shell/bug.png') },
  { id: 'medicines', title: 'Thuốc', subtitle: 'Thông tin tham khảo và nguồn', icon: require('../../../../assets/shell/pill.png') },
  { id: 'documents', title: 'Tài liệu', subtitle: 'Đọc hướng dẫn và kiến thức', icon: require('../../../../assets/shell/file-text.png') },
];

export function CatalogScreen({ onSelectCategory }: { onSelectCategory?: (category: CatalogCategory) => void } = {}) {
  const unavailableHint = 'Chức năng đang được chuẩn bị.';

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <AppHeader title="Tra cứu" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.intro}>Tìm thông tin về cây trồng, tình trạng và hướng chăm sóc.</Text>
          <View style={styles.list}>
            {categories.map((item, index) => (
              <Fragment key={item.id}>
                {index > 0 && <View style={styles.separator} />}
                <ListRow
                  title={item.title}
                  subtitle={item.subtitle}
                  icon={item.icon}
                  onPress={onSelectCategory ? () => onSelectCategory(item.id) : undefined}
                  accessibilityHint={onSelectCategory ? undefined : unavailableHint}
                />
              </Fragment>
            ))}
          </View>
          {!onSelectCategory && (
            <Text style={styles.note}>Danh mục chi tiết đang được kết nối dữ liệu.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    paddingTop: theme.spacing.control,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.gutter,
  },
  content: { width: '100%', maxWidth: theme.layout.contentMaxWidth, alignSelf: 'center', gap: theme.spacing.lg },
  intro: { ...theme.typography.body, color: theme.colors.textMuted },
  list: { width: '100%' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  note: { ...theme.typography.caption, color: theme.colors.textMuted },
});
