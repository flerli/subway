import type { CSSProperties, ReactNode } from 'react'

export type MemberId = string
export type FilterId = string
export type AudienceId = string

export interface FamilyMember {
  id: MemberId
  firstName: string
  color: string
}

export interface FilterOption {
  id: FilterId
  label: string
  caption: string
  badgeText: string
  style: CSSProperties
}

export interface ScopedItem {
  line: string
  members: readonly AudienceId[]
}

export interface Arrival extends ScopedItem {
  destination: string
  direction: string
  platform: string
  value: string
  unit: string
}

export interface AgendaItem extends ScopedItem {
  date: string
  time: string
  title: string
  location: string
  locationCountry: string
  note: string
  isForeign: boolean
}

export interface TodoItem extends ScopedItem {
  id: string
  task: string
  due: string
  lane: string
  done: boolean
}

export interface NewsItem extends ScopedItem {
  source: string
  headline: string
  summary: string
  eta: string
}

export interface ForecastDay {
  day: string
  high: number
  low: number
  condition: string
  visualState: WeatherVisualState
}

export type WeatherVisualState =
  | 'sun'
  | 'cloudy'
  | 'rain'
  | 'thunderstorm'
  | 'wind'
  | 'fallback'

export interface WeatherLocationData {
  id: string
  location: string
  source: string
  stale: boolean
  updatedAt: string
  currentTemperature: string
  condition: string
  visualState: WeatherVisualState
  rangeSummary: string
  forecast: ForecastDay[]
}

export interface WeatherWidgetData extends WeatherLocationData {
  focusLocationId: string
  locations: WeatherLocationData[]
}

export interface MeasureItem {
  label: string
  value: string
}

export interface AudienceBadgeRenderer {
  (audience: readonly AudienceId[], sizeClassName?: string): ReactNode
}
