export const INVENTORY_CATEGORIES = [
  { value: "dry_food", label: "دراي فود" },
  { value: "wet_food_pouch", label: "ويت فود - مغلفات" },
  { value: "wet_food_can", label: "ويت فود - معلبات" },
  { value: "treats", label: "سناكات ومكافآت" },
  { value: "shampoo", label: "شامبوهات وعناية" },
  { value: "accessories", label: "إكسسوارات" },
  { value: "medications", label: "أدوية" },
  { value: "vaccines", label: "لقاحات" },
  { value: "medical_supplies", label: "مستلزمات طبية" },
  { value: "disinfectants", label: "مطهرات وتنظيف" },
  { value: "other", label: "أخرى" },
] as const;

export function inventoryCategoryLabel(value: string) {
  return INVENTORY_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}
