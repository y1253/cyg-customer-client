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

interface CyclePickerConfig {
  startDateKey: keyof FormData;
  cycleTypeKey: keyof FormData;
  cycleKey: keyof FormData;
  cycleDayKey: keyof FormData;
  cycleNthKey: keyof FormData;
  noteKey: keyof FormData;
  idPrefix: string;
}

function CyclePicker({
  data,
  onChange,
  config,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
  config: CyclePickerConfig;
}) {
  const { t } = useTranslation(["register", "common"]);
  const cycleType = data[config.cycleTypeKey] as string;
  const cycleDay = String((data[config.cycleDayKey] as number | null) ?? 1);
  const cycleNth = String((data[config.cycleNthKey] as number | null) ?? 1);
  const cycle = data[config.cycleKey] as number;

  return (
    <div className="flex flex-col gap-3 pl-1">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.idPrefix}-start-date`}>{t("schedule.startDate")}</Label>
        <Input
          id={`${config.idPrefix}-start-date`}
          type="date"
          value={data[config.startDateKey] as string}
          onChange={(e) => onChange({ [config.startDateKey]: e.target.value } as Partial<FormData>)}
        />
        <p className="text-xs text-muted-foreground">{t("schedule.backfill")}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.idPrefix}-cycle-type`}>{t("schedule.repeat")}</Label>
        <select
          id={`${config.idPrefix}-cycle-type`}
          value={cycleType}
          onChange={(e) =>
            onChange({
              [config.cycleTypeKey]: e.target.value,
              [config.cycleDayKey]: e.target.value === 'WEEKLY_DAY' ? 1 : null,
              [config.cycleNthKey]: null,
              [config.cycleKey]: 30,
            } as Partial<FormData>)
          }
          className={SELECT_CLASS}
        >
          {CYCLE_TYPES.map((c) => (
            <option key={c} value={c}>{t(`schedule.types.${c}`)}</option>
          ))}
        </select>
      </div>

      {cycleType === "DAYS" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${config.idPrefix}-cycle-days`}>{t("schedule.everyDays")}</Label>
          <Input
            id={`${config.idPrefix}-cycle-days`}
            type="number"
            min={1}
            value={cycle}
            onChange={(e) => onChange({ [config.cycleKey]: Number(e.target.value) || 30 } as Partial<FormData>)}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">{t("schedule.firstDue", { count: cycle || 30 })}</p>
        </div>
      )}

      {cycleType === "MONTHLY_DATE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${config.idPrefix}-cycle-date`}>{t("schedule.dayOfMonth")}</Label>
          <MonthDaySelect
            id={`${config.idPrefix}-cycle-date`}
            value={cycleDay}
            onChange={(v) => onChange({ [config.cycleDayKey]: v } as Partial<FormData>)}
          />
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsMonthly", { day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {cycleType === "WEEKLY_DAY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${config.idPrefix}-cycle-weekday`}>{t("schedule.dayOfWeek")}</Label>
          <select
            id={`${config.idPrefix}-cycle-weekday`}
            value={cycleDay}
            onChange={(e) => onChange({ [config.cycleDayKey]: Number(e.target.value) } as Partial<FormData>)}
            className={SELECT_CLASS}
          >
            {weekdayNames().map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("schedule.repeatsWeekly", { weekday: weekdayName(Number(cycleDay)) })}</p>
        </div>
      )}

      {cycleType === "MONTHLY_WEEKDAY" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${config.idPrefix}-cycle-nth`}>{t("schedule.which")}</Label>
              <select
                id={`${config.idPrefix}-cycle-nth`}
                value={cycleNth}
                onChange={(e) => onChange({ [config.cycleNthKey]: Number(e.target.value) } as Partial<FormData>)}
                className={SELECT_CLASS}
              >
                {ordinalNames().map((o, i) => (
                  <option key={i + 1} value={i + 1}>{o}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${config.idPrefix}-cycle-mwd`}>{t("schedule.weekday")}</Label>
              <select
                id={`${config.idPrefix}-cycle-mwd`}
                value={cycleDay}
                onChange={(e) => onChange({ [config.cycleDayKey]: Number(e.target.value) } as Partial<FormData>)}
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

      {cycleType === "QUARTERLY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${config.idPrefix}-cycle-quarterly`}>{t("schedule.dayOfMonth")}</Label>
          <MonthDaySelect
            id={`${config.idPrefix}-cycle-quarterly`}
            value={cycleDay}
            onChange={(v) => onChange({ [config.cycleDayKey]: v } as Partial<FormData>)}
          />
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsQuarterly", { day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {cycleType === "YEARLY" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${config.idPrefix}-cycle-yearly-month`}>{t("schedule.month")}</Label>
              <select
                id={`${config.idPrefix}-cycle-yearly-month`}
                value={cycleNth}
                onChange={(e) => onChange({ [config.cycleNthKey]: Number(e.target.value) } as Partial<FormData>)}
                className={SELECT_CLASS}
              >
                {monthNames().map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor={`${config.idPrefix}-cycle-yearly-day`}>{t("schedule.day")}</Label>
              <MonthDaySelect
                id={`${config.idPrefix}-cycle-yearly-day`}
                value={cycleDay}
                onChange={(v) => onChange({ [config.cycleDayKey]: v } as Partial<FormData>)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsYearly", { month: monthName(Number(cycleNth) - 1), day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${config.idPrefix}-note`}>
          {t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span>
        </Label>
        <textarea
          id={`${config.idPrefix}-note`}
          value={data[config.noteKey] as string}
          onChange={(e) => onChange({ [config.noteKey]: e.target.value } as Partial<FormData>)}
          placeholder={t("schedule.notePlaceholder")}
          className={TEXTAREA_CLASS}
        />
      </div>
    </div>
  );
}

const PAYROLL_CYCLE_CONFIG: CyclePickerConfig = {
  startDateKey: "payrollStartDate",
  cycleTypeKey: "payrollCycleType",
  cycleKey: "payrollCycle",
  cycleDayKey: "payrollCycleDay",
  cycleNthKey: "payrollCycleNth",
  noteKey: "payrollNote",
  idPrefix: "pr",
};


export function Step9Payroll({ data, onChange }: Props) {
  const { t } = useTranslation(["register", "common"]);
  const isCanada = data.country === 'CANADA';

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1 — Payroll Management */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-foreground">{t("payroll.question")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ payrollEnabled: true })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.payrollEnabled === true
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✓</span>
            {t("common:actions.yes")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ payrollEnabled: false })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.payrollEnabled === false
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✕</span>
            {t("common:actions.no")}
          </button>
        </div>

        {data.payrollEnabled === true && (
          <CyclePicker data={data} onChange={onChange} config={PAYROLL_CYCLE_CONFIG} />
        )}
      </div>

      {/* Section 2 — Payroll Tax Filing (Canada only) */}
      {isCanada && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">{t("payroll.taxQuestion")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ payrollTaxEnabled: true })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                data.payrollTaxEnabled === true
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <span className="text-2xl">✓</span>
              {t("common:actions.yes")}
            </button>
            <button
              type="button"
              onClick={() => onChange({ payrollTaxEnabled: false, payrollTaxCadEnabled: false, payrollTaxQcEnabled: false })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                data.payrollTaxEnabled === false
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <span className="text-2xl">✕</span>
              {t("common:actions.no")}
            </button>
          </div>

          {data.payrollTaxEnabled === true && (
            <div className="flex flex-col gap-4 pl-1">
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-foreground">{t("payroll.whichType")} <span className="text-xs font-normal text-muted-foreground">{t("payroll.selectOneOrBoth")}</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onChange({ payrollTaxCadEnabled: !data.payrollTaxCadEnabled })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-sm font-medium transition-all",
                      data.payrollTaxCadEnabled
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    🍁 {t("payroll.canadian")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ payrollTaxQcEnabled: !data.payrollTaxQcEnabled })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border-2 p-4 text-sm font-medium transition-all",
                      data.payrollTaxQcEnabled
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
                    )}
                  >
                    🏙️ {t("payroll.quebec")}
                  </button>
                </div>
              </div>

              {data.payrollTaxCadEnabled && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🍁 {t("payroll.canadianSchedule")}</p>
                  <div className="flex flex-col gap-1.5 pl-1">
                    <Label htmlFor="pr-tax-note">{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
                    <textarea
                      id="pr-tax-note"
                      value={data.payrollTaxNote as string}
                      onChange={(e) => onChange({ payrollTaxNote: e.target.value })}
                      placeholder={t("schedule.notePlaceholder")}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              )}
              {data.payrollTaxQcEnabled && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🏙️ {t("payroll.quebecSchedule")}</p>
                  <div className="flex flex-col gap-1.5 pl-1">
                    <Label htmlFor="pr-tax-qc-note">{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
                    <textarea
                      id="pr-tax-qc-note"
                      value={data.payrollTaxQcNote as string}
                      onChange={(e) => onChange({ payrollTaxQcNote: e.target.value })}
                      placeholder={t("schedule.notePlaceholder")}
                      className={TEXTAREA_CLASS}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Section 3 — Payroll Year End (Canada only) */}
      {isCanada && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">{t("payroll.yearEndQuestion")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ payrollYearEndEnabled: true })}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                data.payrollYearEndEnabled === true
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <span className="text-2xl">✓</span>
              {t("common:actions.yes")}
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  payrollYearEndEnabled: false,
                  payrollYearEndRl1: false,
                  payrollYearEndT4: false,
                  payrollYearEndCnesst: false,
                })
              }
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                data.payrollYearEndEnabled === false
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <span className="text-2xl">✕</span>
              {t("common:actions.no")}
            </button>
          </div>

          {data.payrollYearEndEnabled === true && (
            <div className="flex flex-col gap-3 pl-1">
              <p className="text-xs text-muted-foreground">{t("payroll.yearEndHint")}</p>
              {(
                [
                  { id: "rl1", key: "payrollYearEndRl1" as keyof FormData },
                  { id: "t4", key: "payrollYearEndT4" as keyof FormData },
                  { id: "cnesst", key: "payrollYearEndCnesst" as keyof FormData },
                ] as const
              ).map(({ id, key }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ [key]: !data[key] } as Partial<FormData>)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all",
                    data[key]
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
                  )}
                >
                  <span className="text-base">{data[key] ? "✓" : "○"}</span>
                  {t(`payroll.yearEnd.${id}`)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
