const currency =
  (import.meta.env.VITE_CURRENCY as string | undefined) ?? "USD";
const divisor = Number(
  (import.meta.env.VITE_CURRENCY_DIVISOR as string | undefined) ?? "100",
);

export function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: divisor === 1 ? 0 : 2,
  }).format(value / (Number.isFinite(divisor) && divisor > 0 ? divisor : 100));
}

export function toMinorUnits(value: number): number {
  return Math.round(value * (Number.isFinite(divisor) && divisor > 0 ? divisor : 100));
}

export const currencyCode = currency;

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
