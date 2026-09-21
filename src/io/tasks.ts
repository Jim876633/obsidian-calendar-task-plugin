import type { Moment } from "moment";
import type { TFile } from "obsidian";
import { getDateFromFile, getDateUID } from "obsidian-daily-notes-interface";

export interface TaskEntry {
  file: TFile;
  line: number;
  rawLine: string;
  description: string;
  isDone: boolean;
  // ⏳ scheduled date when present, else the date of the daily note.
  startDate: Moment;
  // null while the task is still open; the span then runs until today.
  endDate: Moment | null;
}

export type TaskIndex = Record<string, TaskEntry[]>;

const TASK_LINE = /^\s*[-*+]\s+\[(.)\]\s+(.*)$/;
const DATE_FIELD = /\s*(✅|❌|⏳|📅|🛫|➕)\s*(\d{4}-\d{2}-\d{2})/g;
const PRIORITY_FIELD = /\s*(🔺|⏫|🔼|🔽|⏬)/g;

function parseDate(value: string): Moment | null {
  const date = window.moment(value, "YYYY-MM-DD", true);
  return date.isValid() ? date : null;
}

export function parseTaskLine(
  rawLine: string,
  noteDate: Moment
): Omit<TaskEntry, "file" | "line"> | null {
  const match = rawLine.match(TASK_LINE);
  if (!match) {
    return null;
  }
  const [, status, body] = match;
  const isDone = status !== " ";

  let startDate: Moment | null = null;
  let endDate: Moment | null = null;
  const dateField = new RegExp(DATE_FIELD.source, "g");
  let field: RegExpExecArray | null;
  while ((field = dateField.exec(body)) !== null) {
    const [, emoji, value] = field;
    if (emoji === "⏳") {
      startDate = parseDate(value);
    } else if (emoji === "✅" || emoji === "❌") {
      endDate = parseDate(value);
    }
  }
  startDate ??= noteDate.clone();
  // Guard against ✅ earlier than ⏳ so the span loop still terminates.
  if (endDate && endDate.isBefore(startDate, "day")) {
    endDate = startDate.clone();
  }
  // A checked task without a ✅ date still ends the day it started.
  if (isDone && !endDate) {
    endDate = startDate.clone();
  }

  const description = body
    .replace(DATE_FIELD, "")
    .replace(PRIORITY_FIELD, "")
    .trim();

  return {
    rawLine,
    description,
    isDone,
    startDate,
    endDate,
  };
}

export function getSpanEnd(task: TaskEntry): Moment {
  return task.endDate ?? window.moment();
}

export function getOpenTaskDay(task: TaskEntry): Moment {
  const today = window.moment();
  return task.startDate.isAfter(today, "day") ? task.startDate.clone() : today;
}

export async function buildTaskIndex(
  dailyNotes: Record<string, TFile>
): Promise<TaskIndex> {
  const index: TaskIndex = {};
  const { vault } = window.app;

  for (const file of Object.values(dailyNotes)) {
    const noteDate = getDateFromFile(file, "day");
    if (!noteDate) {
      continue;
    }
    const contents = await vault.cachedRead(file);
    contents.split("\n").forEach((rawLine, line) => {
      const parsed = parseTaskLine(rawLine, noteDate);
      if (!parsed) {
        return;
      }
      const task: TaskEntry = { ...parsed, file, line };
      // Open tasks are listed on a single day: today, or the scheduled
      // date when it is still ahead. Past days show finished work only.
      if (!task.isDone) {
        const uid = getDateUID(getOpenTaskDay(task), "day");
        (index[uid] ??= []).push(task);
        return;
      }
      const cursor = task.startDate.clone();
      const end = getSpanEnd(task);
      while (cursor.isSameOrBefore(end, "day")) {
        const uid = getDateUID(cursor, "day");
        (index[uid] ??= []).push(task);
        cursor.add(1, "day");
      }
    });
  }
  return index;
}

export function getTasksForDay(index: TaskIndex, date: Moment): TaskEntry[] {
  return index[getDateUID(date, "day")] ?? [];
}
