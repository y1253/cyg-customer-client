import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { FormData } from '../types';

const TEXTAREA_CLASS =
  "flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none";

interface Props {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
}

interface DocRule {
  id: "qcDocs" | "craDocs" | "salesTax";
  enabledKey: keyof FormData;
  noteKey: keyof FormData;
}

const CANADIAN_DOC_RULES: DocRule[] = [
  {
    id: "qcDocs",
    enabledKey: "qcDocsEnabled",
    noteKey: "qcDocsNote",
  },
  {
    id: "craDocs",
    enabledKey: "craDocsEnabled",
    noteKey: "craDocsNote",
  },
  {
    id: "salesTax",
    enabledKey: "salesTaxEnabled",
    noteKey: "salesTaxNote",
  },
];

export function Step10General({ data, onChange }: Props) {
  const { t } = useTranslation(["register", "common"]);
  const isCanada = data.country === "CANADA";

  return (
    <div className="flex flex-col gap-8">
      {/* The "come down to your location" question was removed (step2, 2026-10-15). */}
      {!isCanada && (
        <p className="text-sm text-muted-foreground">
          {t("general.nothing")}
        </p>
      )}

      {/* Canadian-only doc/tax rules */}
      {isCanada &&
        CANADIAN_DOC_RULES.map((rule) => (
          <div key={rule.enabledKey} className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t(`general.${rule.id}`)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange({ [rule.enabledKey]: true } as Partial<FormData>)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                  data[rule.enabledKey] === true
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
                  onChange({ [rule.enabledKey]: false, [rule.noteKey]: "" } as Partial<FormData>)
                }
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                  data[rule.enabledKey] === false
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <span className="text-2xl">✕</span>
                {t("common:actions.no")}
              </button>
            </div>

            {data[rule.enabledKey] === true && (
              <div className="pl-1">
                <textarea
                  value={data[rule.noteKey] as string}
                  onChange={(e) =>
                    onChange({ [rule.noteKey]: e.target.value } as Partial<FormData>)
                  }
                  placeholder={t("general.notePlaceholder")}
                  className={TEXTAREA_CLASS}
                />
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
