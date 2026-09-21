import type { TFile } from "obsidian";
import {
  getAllDailyNotes,
  getAllWeeklyNotes,
} from "obsidian-daily-notes-interface";
import { get, writable } from "svelte/store";

import { buildTaskIndex } from "src/io/tasks";
import type { TaskIndex } from "src/io/tasks";
import { defaultSettings, ISettings } from "src/settings";

import { getDateUIDFromFile } from "./utils";
import type { Moment } from "moment";
import { getDateUID } from "obsidian-daily-notes-interface";

function createDailyNotesStore() {
  let hasError = false;
  const store = writable<Record<string, TFile>>(null);
  return {
    reindex: () => {
      try {
        const dailyNotes = getAllDailyNotes();
        store.set(dailyNotes);
        hasError = false;
      } catch (err) {
        if (!hasError) {
          // Avoid error being shown multiple times
          console.log("[Calendar] Failed to find daily notes folder", err);
        }
        store.set({});
        hasError = true;
      }
    },
    ...store,
  };
}

function createWeeklyNotesStore() {
  let hasError = false;
  const store = writable<Record<string, TFile>>(null);
  return {
    reindex: () => {
      try {
        const weeklyNotes = getAllWeeklyNotes();
        store.set(weeklyNotes);
        hasError = false;
      } catch (err) {
        if (!hasError) {
          // Avoid error being shown multiple times
          console.log("[Calendar] Failed to find weekly notes folder", err);
        }
        store.set({});
        hasError = true;
      }
    },
    ...store,
  };
}

export const settings = writable<ISettings>(defaultSettings);
export const dailyNotes = createDailyNotesStore();
export const weeklyNotes = createWeeklyNotesStore();

function createSelectedFileStore() {
  const store = writable<string>(null);

  return {
    setFile: (file: TFile) => {
      const id = getDateUIDFromFile(file);
      store.set(id);
    },
    setDate: (date: Moment) => {
      store.set(getDateUID(date, "day"));
    },
    ...store,
  };
}

export const activeFile = createSelectedFileStore();

function createTaskIndexStore() {
  const store = writable<TaskIndex>(null);
  return {
    reindex: async (): Promise<void> => {
      store.set(await buildTaskIndex(get(dailyNotes) ?? {}));
    },
    ...store,
  };
}

export const taskIndex = createTaskIndexStore();
