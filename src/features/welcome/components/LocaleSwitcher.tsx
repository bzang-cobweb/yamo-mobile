import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { useI18n } from '@/shared/i18n/I18nContext';
import { localeService } from '@/shared/services/LocaleService';
import { ThemedText } from '@/shared/theme/components/themed-text';
import { Spacing } from '@/shared/theme/theme';

const PRIMARY = '#208AEF';

/**
 * Choix de la langue avant d'avoir un compte : les langues proposées par l'API,
 * chacune écrite dans sa propre langue ; la langue courante est marquée.
 */
export function LocaleSwitcher() {
  const { locale, chooseLocale } = useI18n();
  const { data } = useQuery({
    queryKey: ['locales'],
    queryFn: () => localeService.list(),
    staleTime: Infinity,
  });
  const locales = data?.data ?? [];

  if (locales.length < 2) {
    return null;
  }

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {locales.map(({ code, label }) => {
        const selected = code === locale;

        return (
          <Pressable
            key={code}
            testID={`locale-option-${code}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            onPress={() => chooseLocale(code)}
            hitSlop={8}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
            <ThemedText type="small" style={selected ? styles.selectedText : undefined}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.two },
  option: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: { borderColor: PRIMARY },
  selectedText: { color: PRIMARY, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
