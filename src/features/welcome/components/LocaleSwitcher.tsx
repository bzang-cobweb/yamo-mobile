import { useQuery } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { OptionsModal } from '@/features/form/components/fields/OptionsModal';
import { useI18n } from '@/shared/i18n/I18nContext';
import { localeService } from '@/shared/services/LocaleService';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { useTheme } from '@/shared/theme/hooks/use-theme';
import { Spacing } from '@/shared/theme/theme';

/**
 * Choix de la langue avant d'avoir un compte : une liste déroulante simple, la
 * langue courante et une icône ; un appui ouvre la liste des langues proposées
 * par l'API, chacune écrite dans sa propre langue. Masquée s'il n'y a qu'une
 * langue.
 */
export function LocaleSwitcher({ style }: { style?: StyleProp<ViewStyle> }) {
  const { locale, chooseLocale } = useI18n();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['locales'],
    queryFn: () => localeService.list(),
    staleTime: Infinity,
  });
  const locales = data?.data ?? [];

  if (locales.length < 2) {
    return null;
  }

  const current = locales.find(({ code }) => code === locale);

  return (
    <>
      <Pressable
        testID="locale-switcher"
        accessibilityRole="button"
        accessibilityLabel={current?.label ?? locale}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed }) => [styles.trigger, { borderColor: theme.textSecondary }, style, pressed && styles.pressed]}>
        <SymbolView name={{ ios: 'globe', android: 'language', web: 'language' }} size={16} tintColor={theme.textSecondary} />
        <ThemedText type="small">{current?.label ?? locale}</ThemedText>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={12}
          tintColor={theme.textSecondary}
        />
      </Pressable>
      <OptionsModal
        visible={open}
        title={null}
        options={locales.map(({ code, label }) => ({ value: code, label }))}
        selected={locale}
        onSelect={chooseLocale}
        onClose={() => setOpen(false)}
        testIDPrefix="locale"
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
  },
  pressed: { opacity: 0.7 },
});
