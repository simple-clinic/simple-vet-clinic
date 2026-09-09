export const PET_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function petPhotoObjectKey(token: string) { return `pet-photos/${token}`; }
export function inventoryPhotoObjectKey(token: string) { return `inventory-photos/${token}`; }
export function diagnosticImageObjectKey(token: string) { return `diagnostic-images/${token}`; }

function mediaUrl(prefix: string, token: unknown) {
  return typeof token === "string" && token ? `/api/${prefix}/${encodeURIComponent(token)}` : null;
}

export function petPhotoUrl(token: unknown) { return mediaUrl("pet-photo", token); }
export function inventoryPhotoUrl(token: unknown) { return mediaUrl("inventory-photo", token); }
export function diagnosticImageUrl(token: unknown) { return mediaUrl("diagnostic-image", token); }
