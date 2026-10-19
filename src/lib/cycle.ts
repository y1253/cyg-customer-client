// Shared constants and helpers for recurring-schedule cycle pickers.
// Keep this the single source of truth so day-of-month behavior stays consistent
// across the Register wizard, AddTaskDialog, TaskDialog, and the schedule editor.

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const ORDINALS = ["1st", "2nd", "3rd", "4th"];

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Labels for the `CycleType` enum, in the order the pickers list them. Render the
 * options from this map (and pass it as the Select's `items`) so the trigger shows
 * "Day of month" rather than the raw `MONTHLY_DATE`.
 */
export const CYCLE_TYPE_LABELS: Record<string, string> = {
  DAYS: "Every N days",
  MONTHLY_DATE: "Day of month",
  WEEKLY_DAY: "Day of week",
  MONTHLY_WEEKDAY: "Nth weekday of month",
  QUARTERLY: "Quarterly — specific date",
  YEARLY: "Yearly — specific date",
};

/**
 * Sentinel stored in `cycleDay` meaning "the last day of the month", regardless
 * of how many days the month has. Used by the date-based cycle types
 * (MONTHLY_DATE / QUARTERLY / YEARLY). The day picker lists 1–28 then this value.
 * Must match the backend `LAST_DAY_OF_MONTH` in compute-next-due.ts.
 */
export const LAST_DAY_OF_MONTH = 0;

/** Highest selectable concrete day (every month has at least 28 days). */
export const MAX_MONTH_DAY = 28;

/** Returns "st" | "nd" | "rd" | "th" for a day number. */
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

/**
 * Human label for a day-of-month value: "the last day" for the sentinel,
 * otherwise "the 15th". `cycleDay` may arrive as a number or string.
 */
export function monthDayLabel(value: number | string): string {
  const n = Number(value);
  if (n === LAST_DAY_OF_MONTH) return "the last day";
  return `the ${n}${ordinalSuffix(n)}`;
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
      return `Monthly on ${monthDayLabel(day)}`;
    case "QUARTERLY":
      return `Quarterly on ${monthDayLabel(day)}`;
    case "WEEKLY_DAY":
      return `Every ${WEEKDAYS[day] ?? "week"}`;
    case "MONTHLY_WEEKDAY":
      return `The ${ORDINALS[(cycleNth ?? 1) - 1] ?? "1st"} ${WEEKDAYS[day] ?? "day"} of each month`;
    case "YEARLY": {
      const month = MONTHS[(cycleNth ?? 1) - 1] ?? "January";
      return day === LAST_DAY_OF_MONTH
        ? `Yearly on the last day of ${month}`
        : `Yearly on ${month} ${day}`;
    }
    default:
      return cycle === 1 ? "Every day" : `Every ${cycle} days`;
  }
}
