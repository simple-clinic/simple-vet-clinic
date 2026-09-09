export function messageDate(value: string | null | undefined) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${Number(day)}-${Number(month)}-${year}` : value;
}

export function cleanOwnerMessage(value: string) {
  return value.replaceAll("�", "").replace(/\uFFFD/g, "").replace(/[🌿🐾💉📅✅⚠️]/gu, "").replace(/ +\n/g, "\n");
}
