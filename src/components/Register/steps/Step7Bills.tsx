import { Trans, useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthDaySelect } from "@/components/ui/MonthDaySelect";
import { CYCLE_TYPES, monthDayLabel, monthName, monthNames, ordinalNames, weekdayName, weekdayNames } from "@/lib/cycle";
import type { FormData } from '../types';

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

export function Step7Bills({ data, onChange }: Props) {
  const { t } = useTranslation(["register", "common"]);
  const cycleType = data.apCycleType;
  const cycleDay = String(data.apCycleDay ?? 1);
  const cycleNth = String(data.apCycleNth ?? 1);

  return (
    <div className="flex flex-col gap-6">
      {/* Yes / No question — the answer also sets "track open bills" (one question, not two) */}
      <div>
        <p className="mb-1 text-sm font-medium text-foreground">
          {t("payables.question")}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          <Trans t={t} i18nKey="payables.openHint" components={{ b: <span className="font-medium text-foreground" /> }} />
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ apManageBills: true })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.apManageBills === true
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✓</span>
            {t("common:actions.yes")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ apManageBills: false })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.apManageBills === false
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✕</span>
            {t("common:actions.no")}
          </button>
        </div>
      </div>

      {/* Cycle configuration — only when YES */}
      {data.apManageBills === true && (
        <div className="flex flex-col gap-4">
          {/* Starting date */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-start-date">
              {t("schedule.startDate")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ap-start-date"
              type="date"
              value={data.apStartDate}
              onChange={(e) => onChange({ apStartDate: e.target.value })}
            />
          </div>

          {/* Cycle type */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-cycle-type">{t("schedule.repeat")}</Label>
            <select
              id="ap-cycle-type"
              value={cycleType}
              onChange={(e) =>
                onChange({
                  apCycleType: e.target.value,
                  apCycleDay: null,
                  apCycleNth: null,
                  apCycle: 30,
                })
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
              <Label htmlFor="ap-cycle-days">{t("schedule.everyDays")}</Label>
              <Input
                id="ap-cycle-days"
                type="number"
                min={1}
                value={data.apCycle}
                onChange={(e) => onChange({ apCycle: Number(e.target.value) || 30 })}
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                {t("schedule.firstDueFromStart", { count: data.apCycle || 30 })}
              </p>
            </div>
          )}

          {/* MONTHLY_DATE */}
          {cycleType === "MONTHLY_DATE" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ap-cycle-date">{t("schedule.dayOfMonth")}</Label>
              <MonthDaySelect
                id="ap-cycle-date"
                value={cycleDay}
                onChange={(v) => onChange({ apCycleDay: v })}
              />
              <p className="text-xs text-muted-foreground">
                {t("schedule.repeatsMonthly", { day: monthDayLabel(cycleDay) })}
              </p>
            </div>
          )}

          {/* WEEKLY_DAY */}
          {cycleType === "WEEKLY_DAY" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ap-cycle-weekday">{t("schedule.dayOfWeek")}</Label>
              <select
                id="ap-cycle-weekday"
                value={cycleDay}
                onChange={(e) => onChange({ apCycleDay: Number(e.target.value) })}
                className={SELECT_CLASS}
              >
                {weekdayNames().map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {t("schedule.repeatsWeekly", { weekday: weekdayName(Number(cycleDay)) })}
              </p>
            </div>
          )}

          {/* MONTHLY_WEEKDAY */}
          {cycleType === "MONTHLY_WEEKDAY" && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="ap-cycle-nth">{t("schedule.which")}</Label>
                  <select
                    id="ap-cycle-nth"
                    value={cycleNth}
                    onChange={(e) => onChange({ apCycleNth: Number(e.target.value) })}
                    className={SELECT_CLASS}
                  >
                    {ordinalNames().map((o, i) => (
                      <option key={i + 1} value={i + 1}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="ap-cycle-mwd">{t("schedule.weekday")}</Label>
                  <select
                    id="ap-cycle-mwd"
                    value={cycleDay}
                    onChange={(e) => onChange({ apCycleDay: Number(e.target.value) })}
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
              <Label htmlFor="ap-cycle-quarterly">{t("schedule.dayOfMonth")}</Label>
              <MonthDaySelect
                id="ap-cycle-quarterly"
                value={cycleDay}
                onChange={(v) => onChange({ apCycleDay: v })}
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
                  <Label htmlFor="ap-cycle-yearly-month">{t("schedule.month")}</Label>
                  <select
                    id="ap-cycle-yearly-month"
                    value={cycleNth}
                    onChange={(e) => onChange({ apCycleNth: Number(e.target.value) })}
                    className={SELECT_CLASS}
                  >
                    {monthNames().map((m, i) => (
                      <option key={i + 1} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <Label htmlFor="ap-cycle-yearly-day">{t("schedule.day")}</Label>
                  <MonthDaySelect
                    id="ap-cycle-yearly-day"
                    value={cycleDay}
                    onChange={(v) => onChange({ apCycleDay: v })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("schedule.repeatsYearly", { month: monthName(Number(cycleNth) - 1), day: monthDayLabel(cycleDay) })}
              </p>
            </div>
          )}

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ap-note">{t("schedule.note")}</Label>
            <textarea
              id="ap-note"
              value={data.apNote}
              onChange={(e) => onChange({ apNote: e.target.value })}
              placeholder={t("schedule.optionalNote")}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
