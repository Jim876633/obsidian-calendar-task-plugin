import moment from "moment";

import { getOpenTaskDay, getSpanEnd, parseTaskLine } from "./tasks";

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).moment = moment;
});

const noteDate = moment("2026-01-02", "YYYY-MM-DD");

describe("parseTaskLine", () => {
  it("returns null for non-task lines", () => {
    expect(parseTaskLine("plain text", noteDate)).toBeNull();
    expect(parseTaskLine("- bullet", noteDate)).toBeNull();
  });

  it("spans from the scheduled date to the done date", () => {
    const task = parseTaskLine(
      "- [x] myRm error 測試 ⏳ 2026-01-05 ✅ 2026-01-15",
      noteDate
    );
    expect(task.isDone).toBe(true);
    expect(task.startDate.format("YYYY-MM-DD")).toBe("2026-01-05");
    expect(task.endDate.format("YYYY-MM-DD")).toBe("2026-01-15");
    expect(task.description).toBe("myRm error 測試");
  });

  it("falls back to the note date without ⏳", () => {
    const task = parseTaskLine("- [x] 休假 ✅ 2026-03-04", noteDate);
    expect(task.startDate.format("YYYY-MM-DD")).toBe("2026-01-02");
    expect(task.endDate.format("YYYY-MM-DD")).toBe("2026-03-04");
  });

  it("clamps a done date earlier than the scheduled date", () => {
    const task = parseTaskLine("- [x] X ⏳ 2026-01-10 ✅ 2026-01-08", noteDate);
    expect(task.startDate.format("YYYY-MM-DD")).toBe("2026-01-10");
    expect(task.endDate.format("YYYY-MM-DD")).toBe("2026-01-10");
  });

  it("strips priority emoji from the description", () => {
    const task = parseTaskLine("- [x] 報加班 🔽 ✅ 2026-03-31", noteDate);
    expect(task.description).toBe("報加班");
  });

  it("leaves open tasks without an end date", () => {
    const task = parseTaskLine("\t- [ ] senior angular lab", noteDate);
    expect(task.isDone).toBe(false);
    expect(task.endDate).toBeNull();
    expect(getSpanEnd({ ...task, file: null, line: 0 }).isSame(moment(), "day")).toBe(true);
  });

  it("lists an open task on its future scheduled date", () => {
    const future = moment().add(10, "days").format("YYYY-MM-DD");
    const task = parseTaskLine(`- [ ] later ⏳ ${future}`, noteDate);
    const entry = { ...task, file: null, line: 0 };
    expect(getOpenTaskDay(entry).format("YYYY-MM-DD")).toBe(future);
  });

  it("lists an open task with a past scheduled date on today", () => {
    const task = parseTaskLine("- [ ] overdue ⏳ 2026-01-05", noteDate);
    const entry = { ...task, file: null, line: 0 };
    expect(getOpenTaskDay(entry).isSame(moment(), "day")).toBe(true);
  });

  it("ends a checked task without ✅ on the note date", () => {
    const task = parseTaskLine("- [x] no date", noteDate);
    expect(task.endDate.format("YYYY-MM-DD")).toBe("2026-01-02");
  });
});
