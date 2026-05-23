export function formatINR(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

export function formatPriceRange(min: number, max?: number | null): string {
  if (!max || max === min) return formatINR(min);
  return `${formatINR(min)} – ${formatINR(max)}`;
}
