const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyWithCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const number = new Intl.NumberFormat("en-US");

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatCurrency(value: number, cents = false) {
  return cents ? currencyWithCents.format(value || 0) : currency.format(value || 0);
}

export function formatNumber(value: number) {
  return number.format(value || 0);
}

export function formatPercent(value: number) {
  return `${Math.round(value || 0)}%`;
}

export function formatDate(value?: string) {
  if (!value) return "Not scheduled";
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value?: string) {
  if (!value) return "No activity yet";
  return dateTimeFormatter.format(new Date(value));
}

export function statusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
