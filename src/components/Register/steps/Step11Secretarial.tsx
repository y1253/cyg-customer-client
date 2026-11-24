import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthDaySelect } from "@/components/ui/MonthDaySelect";
import { CYCLE_TYPES, dayOrdinal, monthDayLabel, monthName, monthNames, ordinalNames, weekdayName, weekdayNames } from "@/lib/cycle";
import type { FormData, CashFlowAccount, CreditCardAccount } from '../types';

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

const TEXTAREA_CLASS =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none";

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

interface RuleConfig {
  enabledKey: keyof FormData;
  startDateKey: keyof FormData;
  cycleTypeKey: keyof FormData;
  cycleKey: keyof FormData;
  cycleDayKey: keyof FormData;
  cycleNthKey: keyof FormData;
  idPrefix: string;
}

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
    </div>
  );
}

function AccountCyclePicker({
  account,
  idPrefix,
  onChange,
}: {
  account: CashFlowAccount;
  idPrefix: string;
  onChange: (updated: CashFlowAccount) => void;
}) {
  const { t } = useTranslation(["register", "common"]);
  const cycleDay = String(account.cycleDay ?? 1);
  const cycleNth = String(account.cycleNth ?? 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-start-date`}>{t("schedule.startDate")}</Label>
        <Input
          id={`${idPrefix}-start-date`}
          type="date"
          value={account.startDate}
          onChange={(e) => onChange({ ...account, startDate: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t("schedule.backfill")}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-cycle-type`}>{t("schedule.repeat")}</Label>
        <select
          id={`${idPrefix}-cycle-type`}
          value={account.cycleType}
          onChange={(e) => onChange({ ...account, cycleType: e.target.value, cycleDay: e.target.value === 'WEEKLY_DAY' ? 1 : null, cycleNth: null, cycle: 30 })}
          className={SELECT_CLASS}
        >
          {CYCLE_TYPES.map((c) => (
            <option key={c} value={c}>{t(`schedule.types.${c}`)}</option>
          ))}
        </select>
      </div>

      {account.cycleType === "DAYS" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-cycle-days`}>{t("schedule.everyDays")}</Label>
          <Input
            id={`${idPrefix}-cycle-days`}
            type="number"
            min={1}
            value={account.cycle}
            onChange={(e) => onChange({ ...account, cycle: Number(e.target.value) || 30 })}
            placeholder="30"
          />
          <p className="text-xs text-muted-foreground">{t("schedule.firstDue", { count: account.cycle || 30 })}</p>
        </div>
      )}

      {account.cycleType === "MONTHLY_DATE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-cycle-date`}>{t("schedule.dayOfMonth")}</Label>
          <MonthDaySelect
            id={`${idPrefix}-cycle-date`}
            value={cycleDay}
            onChange={(v) => onChange({ ...account, cycleDay: v })}
          />
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsMonthly", { day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {account.cycleType === "WEEKLY_DAY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-cycle-weekday`}>{t("schedule.dayOfWeek")}</Label>
          <select
            id={`${idPrefix}-cycle-weekday`}
            value={cycleDay}
            onChange={(e) => onChange({ ...account, cycleDay: Number(e.target.value) })}
            className={SELECT_CLASS}
          >
            {weekdayNames().map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("schedule.repeatsWeekly", { weekday: weekdayName(Number(cycleDay)) })}</p>
        </div>
      )}

      {account.cycleType === "MONTHLY_WEEKDAY" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>{t("schedule.which")}</Label>
              <select
                value={cycleNth}
                onChange={(e) => onChange({ ...account, cycleNth: Number(e.target.value) })}
                className={SELECT_CLASS}
              >
                {ordinalNames().map((o, i) => (
                  <option key={i + 1} value={i + 1}>{o}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>{t("schedule.weekday")}</Label>
              <select
                value={cycleDay}
                onChange={(e) => onChange({ ...account, cycleDay: Number(e.target.value) })}
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

      {account.cycleType === "QUARTERLY" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-cycle-quarterly`}>{t("schedule.dayOfMonth")}</Label>
          <MonthDaySelect
            id={`${idPrefix}-cycle-quarterly`}
            value={cycleDay}
            onChange={(v) => onChange({ ...account, cycleDay: v })}
          />
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsQuarterly", { day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}

      {account.cycleType === "YEARLY" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>{t("schedule.month")}</Label>
              <select
                value={cycleNth}
                onChange={(e) => onChange({ ...account, cycleNth: Number(e.target.value) })}
                className={SELECT_CLASS}
              >
                {monthNames().map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>{t("schedule.day")}</Label>
              <MonthDaySelect
                value={cycleDay}
                onChange={(v) => onChange({ ...account, cycleDay: v })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("schedule.repeatsYearly", { month: monthName(Number(cycleNth) - 1), day: monthDayLabel(cycleDay) })}
          </p>
        </div>
      )}
    </div>
  );
}

export function Step11Secretarial({ data, onChange }: Props) {
  const { t } = useTranslation(["register", "common"]);
  const checkingSavingsAccounts = data.reconciliationAccounts.filter(
    (a) => a.type === 'Checking' || a.type === 'Savings',
  );
  const ccAccounts = data.reconciliationAccounts.filter(
    (a) => a.type === 'Credit Card' || a.type === 'Line of Credit',
  );

  function initCashFlowAccounts() {
    return checkingSavingsAccounts.map((a) => ({
      accountName: a.name,
      enabled: true,
      note: '',
      startDate: a.startDate,
      cycleType: 'DAYS',
      cycle: 30,
      cycleDay: null,
      cycleNth: null,
    }));
  }

  function initCreditCardAccounts() {
    return ccAccounts.map((a) => ({
      accountName: a.name,
      enabled: true,
      note: '',
      statementDay: null,
      limitEnabled: false,
      limitNote: '',
      limitAmount: '',
      limitCycleDays: 1,
    }));
  }

  function updateCashFlowAccount(index: number, updated: CashFlowAccount) {
    const next = [...data.cashFlowAccounts];
    next[index] = updated;
    onChange({ cashFlowAccounts: next });
  }

  function updateCreditCardAccount(index: number, updated: CreditCardAccount) {
    const next = [...data.creditCardAccounts];
    next[index] = updated;
    onChange({ creditCardAccounts: next });
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Cash Flow Management */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{t("secretarial.cashFlowTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("secretarial.cashFlowHint")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ cashFlowEnabled: true, cashFlowAccounts: initCashFlowAccounts() })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.cashFlowEnabled === true
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✓</span>
            {t("common:actions.yes")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ cashFlowEnabled: false, cashFlowAccounts: [] })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.cashFlowEnabled === false
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✕</span>
            {t("common:actions.no")}
          </button>
        </div>

        {data.cashFlowEnabled === true && (
          <div className="flex flex-col gap-4 mt-1">
            {data.cashFlowAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-1">{t("secretarial.noCashAccounts")}</p>
            ) : (
              data.cashFlowAccounts.map((account, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-4 flex flex-col gap-3 transition-opacity",
                    account.enabled ? "border-border" : "border-muted-foreground/20 opacity-50",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCashFlowAccount(i, { ...account, enabled: !account.enabled })}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        account.enabled
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {account.enabled && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                    <span className="text-sm font-medium">{account.accountName}</span>
                  </div>
                  {account.enabled && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label>{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
                        <textarea
                          value={account.note}
                          onChange={(e) => updateCashFlowAccount(i, { ...account, note: e.target.value })}
                          placeholder={t("schedule.notePlaceholder")}
                          className={TEXTAREA_CLASS}
                        />
                      </div>
                      <AccountCyclePicker
                        account={account}
                        idPrefix={`cf-acc-${i}`}
                        onChange={(updated) => updateCashFlowAccount(i, updated)}
                      />
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Credit Card Management */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{t("secretarial.creditCardTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("secretarial.creditCardHint")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ creditCardEnabled: true, creditCardAccounts: initCreditCardAccounts() })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.creditCardEnabled === true
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✓</span>
            {t("common:actions.yes")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ creditCardEnabled: false, creditCardAccounts: [] })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.creditCardEnabled === false
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✕</span>
            {t("common:actions.no")}
          </button>
        </div>

        {data.creditCardEnabled === true && (
          <div className="flex flex-col gap-4 mt-1">
            {data.creditCardAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-1">{t("secretarial.noCardAccounts")}</p>
            ) : (
              data.creditCardAccounts.map((account, i) => {
                const checkDueDay = account.statementDay != null
                  ? Math.min(account.statementDay + 5, 31)
                  : null;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-4 flex flex-col gap-3 transition-opacity",
                      account.enabled ? "border-border" : "border-muted-foreground/20 opacity-50",
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateCreditCardAccount(i, { ...account, enabled: !account.enabled })}
                        className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          account.enabled
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background",
                        )}
                      >
                        {account.enabled && <span className="text-[10px] font-bold">✓</span>}
                      </button>
                      <span className="text-sm font-medium">{account.accountName}</span>
                    </div>

                    {account.enabled && (
                      <>
                        {/* Note */}
                        <div className="flex flex-col gap-1.5">
                          <Label>{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
                          <textarea
                            value={account.note}
                            onChange={(e) => updateCreditCardAccount(i, { ...account, note: e.target.value })}
                            placeholder={t("schedule.notePlaceholder")}
                            className={TEXTAREA_CLASS}
                          />
                        </div>

                        {/* Statement date */}
                        <div className="flex flex-col gap-1.5">
                          <Label>{t("secretarial.statementDay")}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            value={account.statementDay ?? ''}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              updateCreditCardAccount(i, { ...account, statementDay: v > 0 ? Math.min(v, 31) : null });
                            }}
                            placeholder={t("secretarial.statementDayPlaceholder")}
                          />
                          {checkDueDay != null && (
                            <p className="text-xs text-muted-foreground">
                              {t("secretarial.scheduledCheck", { nth: dayOrdinal(checkDueDay), day: checkDueDay })}
                            </p>
                          )}
                        </div>

                        {/* Credit limit sub-section */}
                        <div className="flex flex-col gap-3 border-t pt-3 mt-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateCreditCardAccount(i, { ...account, limitEnabled: !account.limitEnabled })}
                              className={cn(
                                "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                account.limitEnabled
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background",
                              )}
                            >
                              {account.limitEnabled && <span className="text-[10px] font-bold">✓</span>}
                            </button>
                            <span className="text-sm text-foreground">{t("secretarial.limitQuestion")}</span>
                          </div>

                          {account.limitEnabled && (
                            <div className="flex flex-col gap-3 pl-7">
                              <div className="flex flex-col gap-1.5">
                                <Label>{t("secretarial.amount")}</Label>
                                <Input
                                  type="text"
                                  value={account.limitAmount}
                                  onChange={(e) => updateCreditCardAccount(i, { ...account, limitAmount: e.target.value })}
                                  placeholder={t("secretarial.amountPlaceholder")}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label>{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
                                <textarea
                                  value={account.limitNote}
                                  onChange={(e) => updateCreditCardAccount(i, { ...account, limitNote: e.target.value })}
                                  placeholder={t("schedule.notePlaceholder")}
                                  className={TEXTAREA_CLASS}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label>{t("secretarial.checkFrequency")}</Label>
                                <select
                                  value={account.limitCycleDays}
                                  onChange={(e) => updateCreditCardAccount(i, { ...account, limitCycleDays: Number(e.target.value) })}
                                  className={SELECT_CLASS}
                                >
                                  <option value={1}>{t("secretarial.everyDay")}</option>
                                  <option value={2}>{t("secretarial.everyNthDay", { nth: dayOrdinal(2), n: 2 })}</option>
                                  <option value={3}>{t("secretarial.everyNthDay", { nth: dayOrdinal(3), n: 3 })}</option>
                                  <option value={4}>{t("secretarial.everyNthDay", { nth: dayOrdinal(4), n: 4 })}</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Receipt Tracking */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{t("secretarial.receiptTitle")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("secretarial.receiptHint")}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ receiptTrackingEnabled: true })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.receiptTrackingEnabled === true
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✓</span>
            {t("common:actions.yes")}
          </button>
          <button
            type="button"
            onClick={() => onChange({ receiptTrackingEnabled: false })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
              data.receiptTrackingEnabled === false
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <span className="text-2xl">✕</span>
            {t("common:actions.no")}
          </button>
        </div>
        {data.receiptTrackingEnabled === true && (
          <div className="flex flex-col gap-3 pl-1">
            <CyclePicker
              data={data}
              onChange={onChange}
              rule={{
                enabledKey: "receiptTrackingEnabled",
                startDateKey: "receiptTrackingStartDate",
                cycleTypeKey: "receiptTrackingCycleType",
                cycleKey: "receiptTrackingCycle",
                cycleDayKey: "receiptTrackingCycleDay",
                cycleNthKey: "receiptTrackingCycleNth",
                idPrefix: "rt",
              }}
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rt-note">{t("schedule.note")} <span className="text-muted-foreground font-normal">{t("schedule.optionalParen")}</span></Label>
              <textarea
                id="rt-note"
                value={data.receiptTrackingNote}
                onChange={(e) => onChange({ receiptTrackingNote: e.target.value })}
                placeholder={t("schedule.notePlaceholder")}
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
