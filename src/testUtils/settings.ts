import type { ISettings } from "src/settings";

export function getDefaultSettings(
  overrides: Partial<ISettings> = {}
): ISettings {
  return Object.assign(
    {},
    {
      weekStart: "sunday",
      shouldConfirmBeforeCreate: false,
      showWeeklyNote: false,
      weeklyNoteFolder: "",
      weeklyNoteFormat: "",
      weeklyNoteTemplate: "",
    },
    overrides
  );
}
