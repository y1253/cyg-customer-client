// Shared constants and helpers for recurring-schedule cycle pickers.
// Keep this the single source of truth so day-of-month behavior stays consistent
// across the Register wizard, AddTaskDialog, TaskDialog, and the schedule editor.
//
// Every label is built at CALL time in the shown language (French / English), so these
// are functions, not constants: a constant would be frozen in the language at load.
import i18n, { currentLang, currentLocale } from "@/i18n";

/** Capitalise the first letter (French Intl names are lower case; a picker lists them capitalised). */
const cap = (s: string) => s.charAt(0).toLocaleUpperCase(currentLocale()) + s.slice(1);

/** Weekday name for 0=Sunday … 6=Saturday, as written inside a sentence ("lundi" / "Monday"). */
export function weekdayName(day: number): string | undefined {
  if (!Number.isInteger(day) || day < 0 || day > 6) return undefined;
  // 2026-01-04 was a Sunday.
  return new Intl.DateTimeFormat(currentLocale(), { weekday: "long" }).format(new Date(2026, 0, 4 + day));
}

/** Month name for 0=January … 11=December, as written inside a sentence ("mars" / "March"). */
export function monthName(month: number): string | undefined {
  if (!Number.isInteger(month) || month < 0 || month > 11) return undefined;
  return new Intl.DateTimeFormat(currentLocale(), { month: "long" }).format(new Date(2026, month, 1));
}

/** Weekday names Sunday…Saturday for a picker (capitalised). */
export function weekdayNames(): string[] {
  return Array.from({ length: 7 }, (_, i) => cap(weekdayName(i)!));
}

/** "1st" … "4th" / "1er" … "4e" — for the Nth-weekday pickers. */
export function ordinalNames(): string[] {
  return [1, 2, 3, 4].map((n) => dayOrdinal(n));
}

/** Month names January…December for a picker (capitalised). */
export function monthNames(): string[] {
  return Array.from({ length: 12 }, (_, i) => cap(monthName(i)!));
}

export type CycleTypeKey = "DAYS" | "MONTHLY_DATE" | "WEEKLY_DAY" | "MONTHLY_WEEKDAY" | "QUARTERLY" | "YEARLY";

/** The `CycleType` values, in the order the pickers list them. */
export const CYCLE_TYPES: CycleTypeKey[] = ["DAYS", "MONTHLY_DATE", "WEEKLY_DAY", "MONTHLY_WEEKDAY", "QUARTERLY", "YEARLY"];

/**
 * Label for a `CycleType` value. Render the options from `CYCLE_TYPES` with this (and
 * pass the map as the Select's `items`) so the trigger shows "Day of month" rather than
 * the raw `MONTHLY_DATE`.
 */
export function cycleTypeLabel(type: CycleTypeKey): string {
  return i18n.t(`portal:cycle.types.${type}`);
}

/**
 * Sentinel stored in `cycleDay` meaning "the last day of the month", regardless
 * of how many days the month has. Used by the date-based cycle types
 * (MONTHLY_DATE / QUARTERLY / YEARLY). The day picker lists 1–28 then this value.
 * Must match the backend `LAST_DAY_OF_MONTH` in compute-next-due.ts.
 */
export const LAST_DAY_OF_MONTH = 0;

/** Highest selectable concrete day (every month has at least 28 days). */
export const MAX_MONTH_DAY = 28;

/** Returns "st" | "nd" | "rd" | "th" for a day number (English only — see `dayOrdinal`). */
export function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** An ordinal number in the shown language: "15th" / "1er", "2e", "15e". */
export function dayOrdinal(n: number): string {
  if (currentLang() === "fr") return n === 1 ? "1er" : `${n}e`;
  return `${n}${ordinalSuffix(n)}`;
}

/** A day of the month as written after a month name: "15" / "1er" (French), "15" (English). */
function dayOfMonth(n: number): string {
  return currentLang() === "fr" && n === 1 ? "1er" : String(n);
}

/**
 * Human label for a day-of-month value: "the last day" for the sentinel,
 * otherwise "the 15th" ("le dernier jour" / "le 15"). `cycleDay` may arrive as a number or string.
 */
export function monthDayLabel(value: number | string): string {
  const n = Number(value);
  if (n === LAST_DAY_OF_MONTH) return i18n.t("portal:cycle.lastDay");
  return i18n.t("portal:cycle.theDay", { day: dayOfMonth(n), nth: dayOrdinal(n) });
}

export type CycleFields = {
  cycleType: string;
  cycle: number;
  cycleDay: number | null;
  cycleNth: number | null;
};

/**
 * One sentence for how often a schedule repeats ("Monthly on the 15th", "Every Monday").
 * Mirrors the meaning of each `CycleType` in the root CLAUDE.md; for YEARLY, `cycleNth`
 * is the MONTH (1-12), not an ordinal.
 */
export function cycleLabel({ cycleType, cycle, cycleDay, cycleNth }: CycleFields): string {
  const day = cycleDay ?? 1;
  switch (cycleType) {
    case "MONTHLY_DATE":
      return i18n.t("portal:cycle.monthlyOn", { day: monthDayLabel(day) });
    case "QUARTERLY":
      return i18n.t("portal:cycle.quarterlyOn", { day: monthDayLabel(day) });
    case "WEEKLY_DAY": {
      const weekday = weekdayName(day);
      return weekday ? i18n.t("portal:cycle.everyWeekday", { weekday }) : i18n.t("portal:cycle.everyWeek");
    }
    case "MONTHLY_WEEKDAY":
      return i18n.t("portal:cycle.nthWeekday", {
        nth: ordinalNames()[(cycleNth ?? 1) - 1] ?? dayOrdinal(1),
        weekday: weekdayName(day) ?? i18n.t("portal:cycle.day"),
      });
    case "YEARLY": {
      const month = monthName((cycleNth ?? 1) - 1) ?? monthName(0)!;
      return day === LAST_DAY_OF_MONTH
        ? i18n.t("portal:cycle.yearlyLastDay", { month })
        : i18n.t("portal:cycle.yearlyOn", { month, day: dayOfMonth(day) });
    }
    default:
      return i18n.t("portal:cycle.everyNDays", { count: cycle });
  }
}
