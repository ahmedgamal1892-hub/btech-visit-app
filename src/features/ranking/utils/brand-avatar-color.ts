const BRAND_AVATAR_COLORS = [
  'bg-[#6C4CF1]/15 text-[#6C4CF1]',
  'bg-emerald-500/15 text-emerald-600',
  'bg-sky-500/15 text-sky-600',
  'bg-orange-500/15 text-orange-600',
  'bg-teal-500/15 text-teal-600',
  'bg-rose-500/15 text-rose-600',
  'bg-amber-500/15 text-amber-600',
  'bg-indigo-500/15 text-indigo-600',
] as const

export function getBrandAvatarColorClass(brand: string): string {
  let hash = 0

  for (let index = 0; index < brand.length; index += 1) {
    hash = brand.charCodeAt(index) + ((hash << 5) - hash)
  }

  const colorIndex = Math.abs(hash) % BRAND_AVATAR_COLORS.length
  return BRAND_AVATAR_COLORS[colorIndex]
}
