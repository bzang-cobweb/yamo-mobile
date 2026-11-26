import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { BottomSheet } from "@/shared/components/BottomSheet";
import { useI18n } from "@/shared/i18n/I18nContext";
import { ThemedText } from "@/shared/theme/components/themed-text";
import { Spacing } from "@/shared/theme/theme";

import type { FieldProps } from "../../types";
import {
  dateFormats,
  formatDate,
  parseIsoDate,
  toIsoDate,
} from "../../utils/dates";
import { FieldShell } from "../FieldShell";
import { useInputStyle } from "./inputStyle";

/**
 * Date seule (`AAAA-MM-JJ`) avec le sélecteur natif : calendrier dans un panneau à
 * sa taille sur iOS, qui ne pousse pas le formulaire (fermé dès qu'une date est choisie ;
 * décision 2026-11-26-calendrier-en-panneau), boîte de dialogue sur
 * Android. Le calendrier propose les dates entre les bornes servies par Laravel
 * (`date_range` : une naissance jusqu'à aujourd'hui, une réservation à partir
 * d'aujourd'hui ; décision 2026-11-19-bornes-des-dates), toutes sans bornes. Un champ
 * facultatif peut être vidé (« Effacer », sous le champ → valeur vide).
 */
export function DateField({
  field,
  value,
  onChange,
  error,
  disabled,
}: FieldProps<string>) {
  const { t, locale } = useI18n();
  const inputStyle = useInputStyle(Boolean(error));
  const [open, setOpen] = useState(false);
  const date = parseIsoDate(value);
  const minimumDate = parseIsoDate(field.date_range?.min ?? "") ?? undefined;
  const maximumDate = parseIsoDate(field.date_range?.max ?? "") ?? undefined;
  // Le calendrier s'ouvre sur la date choisie, sinon aujourd'hui ramené dans les bornes.
  const today = new Date();
  const start =
    date ??
    (minimumDate && today < minimumDate
      ? minimumDate
      : maximumDate && today > maximumDate
        ? maximumDate
        : today);

  function choose(event: DateTimePickerEvent, chosen?: Date) {
    if (event.type === "set" && chosen) {
      onChange(toIsoDate(chosen));
      // Date choisie : le calendrier se replie (il cachait le reste du formulaire).
      setOpen(false);
    }
  }

  function toggle() {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: start,
        mode: "date",
        minimumDate,
        maximumDate,
        onChange: choose,
      });
    } else {
      setOpen((current) => !current);
    }
  }

  return (
    <FieldShell field={field} error={error}>
      <Pressable
        testID={`field-${field.name}`}
        accessibilityRole="button"
        accessibilityLabel={field.label ?? field.name}
        accessibilityValue={{
          text: date
            ? formatDate(date, locale, dateFormats(field.date_formats).value)
            : undefined,
        }}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={toggle}
        style={inputStyle}
      >
        <ThemedText themeColor={date ? "text" : "textSecondary"}>
          {date
            ? formatDate(date, locale, dateFormats(field.date_formats).value)
            : (field.placeholder ?? t("form.selectPlaceholder"))}
        </ThemedText>
      </Pressable>

      {!field.required && date && (
        <View style={styles.actions}>
          <Pressable
            testID={`field-${field.name}-clear`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => {
              setOpen(false);
              onChange("");
            }}
          >
            <ThemedText type="linkPrimary">{t("form.clearDate")}</ThemedText>
          </Pressable>
        </View>
      )}
      {Platform.OS !== "android" && (
        <BottomSheet
          visible={open}
          title={field.label ?? ""}
          onClose={() => setOpen(false)}
          fitContent
          testID={`field-${field.name}-sheet`}
        >
          <View style={styles.picker}>
            <DateTimePicker
              testID={`field-${field.name}-picker`}
              value={start}
              mode="date"
              display="inline"
              locale={locale}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={choose}
            />
          </View>
        </BottomSheet>
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: Spacing.one,
  },
  picker: { padding: Spacing.four, alignItems: "center" },
});
