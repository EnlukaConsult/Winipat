// 5-rule password strength meter — exported as a pure function (rules) +
// component (UI). Pages can use `getPasswordStrength()` standalone to decide
// whether to disable the submit button without needing to render the meter.

export type StrengthRuleKey = "length" | "upper" | "lower" | "number" | "symbol";

export const PASSWORD_RULES: Record<
  StrengthRuleKey,
  { label: string; test: (v: string) => boolean }
> = {
  length: { label: "At least 8 characters",         test: (v) => v.length >= 8 },
  upper:  { label: "At least 1 uppercase letter",   test: (v) => /[A-Z]/.test(v) },
  lower:  { label: "At least 1 lowercase letter",   test: (v) => /[a-z]/.test(v) },
  number: { label: "At least 1 number",             test: (v) => /[0-9]/.test(v) },
  symbol: { label: "At least 1 symbol, e.g. @, #, !", test: (v) => /[^A-Za-z0-9]/.test(v) },
};

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4 | 5;
  valid: Record<StrengthRuleKey, boolean>;
  label: string;
  color: string;
  width: number; // percent
  isStrong: boolean;
};

export function getPasswordStrength(value: string): PasswordStrength {
  const valid: Record<StrengthRuleKey, boolean> = {
    length: PASSWORD_RULES.length.test(value),
    upper:  PASSWORD_RULES.upper.test(value),
    lower:  PASSWORD_RULES.lower.test(value),
    number: PASSWORD_RULES.number.test(value),
    symbol: PASSWORD_RULES.symbol.test(value),
  };
  const score = (Object.values(valid).filter(Boolean).length) as PasswordStrength["score"];

  const widthMap = [0, 20, 40, 65, 85, 100];
  let label = "Enter a password";
  let color = "#cbd5e8";

  if (value) {
    if (score <= 1) {
      label = "Weak";
      color = "#e5484d";
    } else if (score <= 3) {
      label = "Medium";
      color = "#f59e0b";
    } else if (score === 4) {
      label = "Strong";
      color = "#3b82f6";
    } else {
      label = "Very strong";
      color = "#16a34a";
    }
  }

  return {
    score,
    valid,
    label,
    color,
    width: widthMap[score],
    isStrong: score === 5,
  };
}

export function PasswordStrengthMeter({ value }: { value: string }) {
  const { valid, label, color, width } = getPasswordStrength(value);

  return (
    <div className="mt-2 mb-1 p-4 rounded-2xl bg-cloud border border-mist">
      <div className="flex justify-between items-center gap-3 mb-2.5">
        <span className="text-[12px] font-bold text-slate uppercase tracking-wider">
          Password strength
        </span>
        <span
          className="text-[12px] font-bold uppercase tracking-wider"
          style={{ color: width > 0 ? color : "#7b8499" }}
        >
          {label}
        </span>
      </div>

      <div className="h-2 rounded-full bg-mist overflow-hidden">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${width}%`, background: color }}
        />
      </div>

      <ul className="mt-3 space-y-1.5" role="list">
        {(Object.keys(PASSWORD_RULES) as StrengthRuleKey[]).map((key) => {
          const rule = PASSWORD_RULES[key];
          const ok = valid[key];
          return (
            <li
              key={key}
              className={`text-[12.5px] font-medium flex items-center gap-2 ${
                ok ? "text-emerald-dark" : "text-slate-light"
              }`}
            >
              <span
                aria-hidden="true"
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] ${
                  ok ? "bg-emerald text-white" : "bg-mist text-slate-light"
                }`}
              >
                {ok ? "✓" : "○"}
              </span>
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
