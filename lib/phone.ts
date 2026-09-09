export function normalizeIraqiPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `964${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 10) digits = `964${digits}`;
  return digits;
}

export function whatsappNumber(value: string): string {
  return normalizeIraqiPhone(value);
}

