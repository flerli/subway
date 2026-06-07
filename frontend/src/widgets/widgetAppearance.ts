import type { CSSProperties } from 'react'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

const normalizeColor = (value: string) =>
  HEX_COLOR_PATTERN.test(value) ? value : '#4aa8ff'

export const getContrastColor = (hexColor: string) => {
  const color = normalizeColor(hexColor)
  const red = Number.parseInt(color.slice(1, 3), 16)
  const green = Number.parseInt(color.slice(3, 5), 16)
  const blue = Number.parseInt(color.slice(5, 7), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return luminance > 0.65 ? '#08111d' : '#f8fbff'
}

export const buildBadgeStyle = (color: string) =>
  ({
    '--route-color': normalizeColor(color),
    '--route-ink': getContrastColor(color),
  }) as CSSProperties
