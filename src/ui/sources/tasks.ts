import type { Moment } from "moment";
import type { ICalendarSource, IDayMetadata, IDot } from "obsidian-calendar-ui";
import { get } from "svelte/store";

import { getTasksForDay } from "src/io/tasks";
import type { TaskEntry } from "src/io/tasks";

import { taskIndex } from "../stores";

const NUM_MAX_DOTS = 5;

function getDotForTask(task: TaskEntry, date: Moment): IDot {
  if (task.endDate && task.endDate.isSame(date, "day")) {
    return { className: "task-done", color: "default", isFilled: true };
  }
  if (task.isDone) {
    return { className: "task-span", color: "default", isFilled: true };
  }
  return { className: "task", color: "default", isFilled: false };
}

export const tasksSource: ICalendarSource = {
  getDailyMetadata: async (date: Moment): Promise<IDayMetadata> => {
    const tasks = getTasksForDay(get(taskIndex) ?? {}, date);
    const dots = tasks
      .slice(0, NUM_MAX_DOTS)
      .map((task) => getDotForTask(task, date));
    return {
      dots,
      dataAttributes: tasks.length
        ? { "data-task-count": String(tasks.length) }
        : {},
    };
  },

  getWeeklyMetadata: async (): Promise<IDayMetadata> => {
    return { dots: [] };
  },
};
