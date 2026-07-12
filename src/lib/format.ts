const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

const currencyWithCents = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
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

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
});

export function formatCurrency(value: number, cents = false) {
  return cents ? currencyWithCents.format(value || 0) : currency.format(value || 0);
}

export function formatCompactCurrency(value: number) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1_000_000) return `PHP ${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `PHP ${(amount / 1_000).toFixed(0)}K`;
  return `PHP ${Math.round(amount)}`;
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

export function formatMonth(value?: string) {
  if (!value) return "Not scheduled";
  return monthFormatter.format(new Date(value));
}

export function statusLabel(status: string) {
  if (status === "upcoming") return "Due Soon";
  if (status === "completed") return "Paid";

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
