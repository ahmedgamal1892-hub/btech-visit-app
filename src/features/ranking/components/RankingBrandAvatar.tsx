import { cn } from '@/lib/utils'

import { getBrandAvatarColorClass } from '../utils/brand-avatar-color'

type RankingBrandAvatarProps = {
  brand: string
  className?: string
}

export function RankingBrandAvatar({ brand, className }: RankingBrandAvatarProps) {
  const initial = brand.trim().charAt(0).toUpperCase() || '?'

  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold md:size-9',
        getBrandAvatarColorClass(brand),
        className,
      )}
      aria-hidden="true"
    >
      {initial}
    </span>
  )
}
