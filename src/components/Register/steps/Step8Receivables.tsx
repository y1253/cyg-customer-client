import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthDaySelect } from "@/components/ui/MonthDaySelect";
import { CYCLE_TYPES, monthDayLabel, monthName, monthNames, ordinalNames, weekdayName, weekdayNames } from "@/lib/cycle";
import type { FormData } from '../types';

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

const TEXTAREA_CLASS =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none";

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

interface RuleConfig {
  id: "invoicing" | "statements" | "collection" | "report";
  enabledKey: keyof FormData;
  startDateKey: keyof FormData;
  cycleTypeKey: keyof FormData;
  cycleKey: keyof FormData;
  cycleDayKey: keyof FormData;
  cycleNthKey: keyof FormData;
  noteKey: keyof FormData;
  idPrefix: string;
}

const RULES: RuleConfig[] = [
  {
    id: "invoicing",
    enabledKey: "arInvoicingEnabled",
    startDateKey: "arInvoicingStartDate",
    cycleTypeKey: "arInvoicingCycleType",
    cycleKey: "arInvoicingCycle",
    cycleDayKey: "arInvoicingCycleDay",
    cycleNthKey: "arInvoicingCycleNth",
    noteKey: "arInvoicingNote",
    idPrefix: "ar-inv",
  },
  {
    id: "statements",
    enabledKey: "arStatementsEnabled",
    startDateKey: "arStatementsStartDate",
    cycleTypeKey: "arStatementsCycleType",
    cycleKey: "arStatementsCycle",
    cycleDayKey: "arStatementsCycleDay",
    cycleNthKey: "arStatementsCycleNth",
    noteKey: "arStatementsNote",
    idPrefix: "ar-stmt",
  },
  {
    id: "collection",
    enabledKey: "arCollectionEnabled",
    startDateKey: "arCollectionStartDate",
    cycleTypeKey: "arCollectionCycleType",
    cycleKey: "arCollectionCycle",
    cycleDayKey: "arCollectionCycleDay",
    cycleNthKey: "arCollectionCycleNth",
    noteKey: "arCollectionNote",
    idPrefix: "ar-col",
  },
  {
    id: "report",
    enabledKey: "arReportEnabled",
    startDateKey: "arReportStartDate",
    cycleTypeKey: "arReportCycleType",
    cycleKey: "arReportCycle",
    cycleDayKey: "arReportCycleDay",
    cycleNthKey: "arReportCycleNth",
    noteKey: "arReportNote",
    idPrefix: "ar-rep",
  },
];

function CyclePicker({
  data,
  onChange,
  rule,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
  rule: RuleConfig;
}) {
  const { t } = useTranslation(["register", "common"]);
  const cycleType = data[rule.cycleTypeKey] as string;
  const cycleDay = String((data[rule.cycleDayKey] as number | null) ?? 1);
  const cycleNth = String((data[rule.cycleNthKey] as number | null) ?? 1);
  const cycle = data[rule.cycleKey] as number;

  return (
    <div className="flex flex-col gap-3 pl-1">
      {/* Starting date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${rule.idPrefix}-start-date`}>{t("schedule.startDate")}</Label>
        <Input
          id={`${rule.idPrefix}-start-date`}
          type="date"
          value={data[rule.startDateKey] as string}
          onChange={(e) => onChange({ [rule.startDateKey]: e.target.value } as Partial<FormData>)}
        />
        <p className="text-xs text-muted-foreground">{t("schedule.backfill")}</p>
      </div>

      {/* Cycle type */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${rule.idPrefix}-cycle-type`}>{t("schedule.repeat")}</Label>
        <select
          id={`${rule.idPrefix}-cycle-type`}
          value={cycleType}
          onChange={(e) =>
            onChange({
              [rule.cycleTypeKey]: e.target.value,
              [rule.cycleDayKey]: e.target.value === 'WEEKLY_DAY' ? 1 : null,
              [rule.cycleNthKey]: null,
              [rule.cycleKey]: 30,
            } as Partial<FormData>)
          }
          className={SELECT_CLASS}
        >
          {CYCLE_TYPES.map((c) => (
            <option key={c} value={c}>{t(`schedule.types.${c}`)}</option>
          ))}
        </select>
      </div>

      {/* DAYS */}
      {cycleType === "DAYS" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${rule.idPrefix}-cycle-days`}>{t("schedule.everyDays")}</Label>
          <Input
            id={`${rule.idPrefix}-cycle-days`}
            type="number"
            min={1}
            value={cycle}
            onChange={(e) => onChange({ [rule.cycleKey]: Number(e.target.value) || 30 } as Partial<FormData>)}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">{t("schedule.firstDue", { count: cycle || 30 })}</p>
        </div>
      )}

      {/* MONTHLY_DATE */}
      {cycleType === "MONTHLY_DATE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${rule.idPrefix}-cycle-date`}>{t("schedule.dayOfMonth")}</Label>
          <MonthDaySelect
            id={`${rule.idPrefix}-cycle-date`}
            value={cycleDay}
            onChange={(v) => onChange({ [rule.cycleDayKey]: v } as Partial<FormData>)}
          />
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsMonthly", { day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {/* WEEKLY_DAY */}
      {cycleType === "WEEKLY_DAY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${rule.idPrefix}-cycle-weekday`}>{t("schedule.dayOfWeek")}</Label>
          <select
            id={`${rule.idPrefix}-cycle-weekday`}
            value={cycleDay}
            onChange={(e) => onChange({ [rule.cycleDayKey]: Number(e.target.value) } as Partial<FormData>)}
            className={SELECT_CLASS}
          >
            {weekdayNames().map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("schedule.repeatsWeekly", { weekday: weekdayName(Number(cycleDay)) })}</p>
        </div>
      )}

      {/* MONTHLY_WEEKDAY */}
      {cycleType === "MONTHLY_WEEKDAY" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${rule.idPrefix}-cycle-nth`}>{t("schedule.which")}</Label>
              <select
                id={`${rule.idPrefix}-cycle-nth`}
                value={cycleNth}
                onChange={(e) => onChange({ [rule.cycleNthKey]: Number(e.target.value) } as Partial<FormData>)}
                className={SELECT_CLASS}
              >
                {ordinalNames().map((o, i) => (
                  <option key={i + 1} value={i + 1}>{o}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${rule.idPrefix}-cycle-mwd`}>{t("schedule.weekday")}</Label>
              <select
                id={`${rule.idPrefix}-cycle-mwd`}
                value={cycleDay}
                onChange={(e) => onChange({ [rule.cycleDayKey]: Number(e.target.value) } as Partial<FormData>)}
                className={SELECT_CLASS}
              >
                {weekdayNames().map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsNthWeekday", { nth: ordinalNames()[Number(cycleNth) - 1], weekday: weekdayName(Number(cycleDay)) })}
          </p>
        </div>
      )}

      {/* QUARTERLY */}
      {cycleType === "QUARTERLY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${rule.idPrefix}-cycle-quarterly`}>{t("schedule.dayOfMonth")}</Label>
          <MonthDaySelect
            id={`${rule.idPrefix}-cycle-quarterly`}
            value={cycleDay}
            onChange={(v) => onChange({ [rule.cycleDayKey]: v } as Partial<FormData>)}
          />
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsQuarterly", { day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {/* YEARLY */}
      {cycleType === "YEARLY" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${rule.idPrefix}-cycle-yearly-month`}>{t("schedule.month")}</Label>
              <select
                id={`${rule.idPrefix}-cycle-yearly-month`}
                value={cycleNth}
                onChange={(e) => onChange({ [rule.cycleNthKey]: Number(e.target.value) } as Partial<FormData>)}
                className={SELECT_CLASS}
              >
                {monthNames().map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${rule.idPrefix}-cycle-yearly-day`}>{t("schedule.day")}</Label>
              <MonthDaySelect
                id={`${rule.idPrefix}-cycle-yearly-day`}
                value={cycleDay}
                onChange={(v) => onChange({ [rule.cycleDayKey]: v } as Partial<FormData>)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsYearly", { month: monthName(Number(cycleNth) - 1), day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {/* Note (optional) */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${rule.idPrefix}-note`}>{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
        <textarea
          id={`${rule.idPrefix}-note`}
          value={data[rule.noteKey] as string}
          onChange={(e) => onChange({ [rule.noteKey]: e.target.value } as Partial<FormData>)}
          placeholder={t("schedule.notePlaceholder")}
          className={TEXTAREA_CLASS}
        />
      </div>
    </div>
  );
}

export function Step8Receivables({ data, onChange }: Props) {
  const { t } = useTranslation(["register", "common"]);
  return (
    <div className="flex flex-col gap-8">
      {RULES.map((rule) => {
        const enabled = data[rule.enabledKey] as boolean | null;
        return (
          <div key={rule.idPrefix} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t(`receivables.${rule.id}`)}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange({ [rule.enabledKey]: true } as Partial<FormData>)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                  enabled === true
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <span className="text-2xl">✓</span>
                {t("common:actions.yes")}
              </button>
              <button
                type="button"
                onClick={() => onChange({ [rule.enabledKey]: false } as Partial<FormData>)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                  enabled === false
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <span className="text-2xl">✕</span>
                {t("common:actions.no")}
              </button>
            </div>

            {enabled === true && (
              <CyclePicker data={data} onChange={onChange} rule={rule} />
            )}
          </div>
        );
      })}
    </div>
  );
}
