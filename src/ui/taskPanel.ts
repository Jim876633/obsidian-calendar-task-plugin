import type { Moment } from "moment";
import { App, Component, MarkdownRenderer } from "obsidian";

import { getSpanEnd, getTasksForDay } from "src/io/tasks";
import type { TaskEntry, TaskIndex } from "src/io/tasks";

export class TaskPanel extends Component {
  private containerEl: HTMLElement;
  private selectedDate: Moment | null = null;
  private index: TaskIndex = {};

  constructor(private app: App, parentEl: HTMLElement) {
    super();
    this.containerEl = parentEl.createDiv("calendar-task-panel");
  }

  setIndex(index: TaskIndex): void {
    this.index = index ?? {};
    this.render();
  }

  showDate(date: Moment): void {
    this.selectedDate = date.clone();
    this.render();
  }

  private render(): void {
    this.containerEl.empty();
    if (!this.selectedDate) {
      return;
    }

    const tasks = getTasksForDay(this.index, this.selectedDate);
    this.containerEl.createDiv("calendar-task-panel-header", (el) => {
      el.createSpan({ text: this.selectedDate.format("YYYY-MM-DD (ddd)") });
      el.createSpan({
        cls: "calendar-task-panel-count",
        text: String(tasks.length),
      });
    });

    if (!tasks.length) {
      this.containerEl.createDiv({
        cls: "calendar-task-panel-empty",
        text: "No tasks",
      });
      return;
    }

    const listEl = this.containerEl.createEl("ul", "calendar-task-list");
    tasks.forEach((task) => this.renderTask(listEl, task));
  }

  private renderTask(listEl: HTMLElement, task: TaskEntry): void {
    const itemEl = listEl.createEl("li", {
      cls: `calendar-task-item ${task.isDone ? "is-done" : "is-open"}`,
    });
    itemEl.addEventListener("click", () => this.openTask(task));

    const textEl = itemEl.createDiv("calendar-task-text");
    MarkdownRenderer.renderMarkdown(
      task.description,
      textEl,
      task.file.path,
      this
    );

    const start = task.startDate.format("MM-DD");
    const end = getSpanEnd(task).format("MM-DD");
    const span = start === end ? start : `${start} → ${end}`;
    itemEl.createDiv({
      cls: "calendar-task-meta",
      text: `${span} · ${task.file.basename}`,
    });
  }

  private async openTask(task: TaskEntry): Promise<void> {
    const leaf = this.app.workspace.getUnpinnedLeaf();
    await leaf.openFile(task.file, { eState: { line: task.line } });
  }
}
