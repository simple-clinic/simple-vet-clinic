export function ageFromBirthDate(value: string, now = new Date()) {
  if (!value) return null;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || birth > now) return null;
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  months = Math.max(0, months);
  if (months < 1) return { value: Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000)), unit: "يوم" };
  if (months < 24) return { value: months, unit: "شهر" };
  return { value: Math.floor(months / 12), unit: "سنة" };
}
