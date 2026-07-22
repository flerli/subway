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
  eventId: string
  eventDate: string
  destination: string
  direction: string
  platform: string
  value: string
  unit: string
  isSameDay: boolean
  cancelled: boolean
}

export interface AgendaItem extends ScopedItem {
  eventId: string
  date: string
  time: string
  title: string
  location: string
  locationCountry: string
  note: string
  isForeign: boolean
  cancelled: boolean
}

export interface TodoItem extends ScopedItem {
  id: string
  task: string
  due: string
  lane: string
  done: boolean
}

export interface BringListItem {
  itemName: string
  specification: string
  uuid: string
  category: string
  recentAt: string
}

export interface BringListData {
  listUuid: string
  listName: string
  openItems: BringListItem[]
  recentItems: BringListItem[]
  openItemCount: number
  recentItemCount: number
  freshness: 'live' | 'stale'
  readOnly: boolean
  refreshedAt: string | null
  staleAt: string | null
}

export interface BringWidgetData {
  status: 'loading' | 'ready' | 'not-configured' | 'error'
  list: BringListData | null
  message: string | null
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
  | 'partly-cloudy'
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
