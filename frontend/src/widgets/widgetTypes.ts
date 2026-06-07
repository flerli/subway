export type WidgetId = string
export type WidgetCapability = 'read' | 'write'
export type WidgetDataSource = 'database' | 'external-api' | 'system'
export type WidgetRefreshStatus = 'idle' | 'ok' | 'live' | 'cached' | 'static' | 'error'
export type WidgetScopeMode = 'all' | 'member' | 'members'
export type WidgetSettingFieldType = 'text' | 'number' | 'boolean'
export type WidgetPlacementZoneId =
  | 'hero'
  | 'triad'
  | 'bottom-wide'
  | 'bottom-side'

export type WidgetSettingsValues = Record<string, string | number | boolean>

export interface WidgetUserScope {
  mode: WidgetScopeMode
  memberIds: string[]
}

export interface WidgetPlacementAssignment {
  zoneId: WidgetPlacementZoneId
  order: number
}

export interface WidgetEntityRecord {
  id: WidgetId
  title: string
  subwayLetter: string
  subwayColor: string
  sourceLocation: string
  userScope: WidgetUserScope
  placementZones: WidgetPlacementAssignment[]
}

export interface WidgetLoadContext {
  focusedMemberId?: string | null
  settings?: WidgetSettingsValues
}

export interface WidgetMutationContext {
  action: string
  focusedMemberId?: string | null
  payload?: unknown
}

export interface WidgetSettingFieldDefinition {
  key: string
  label: string
  type: WidgetSettingFieldType
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

export interface WidgetSettingsDefinition {
  title: string
  description: string
  defaults: WidgetSettingsValues
  fields: WidgetSettingFieldDefinition[]
  normalize: (value: unknown) => WidgetSettingsValues
}

export interface WidgetMicroAppContract {
  entityId: WidgetId
  folderName: string
  dataSource: WidgetDataSource
  capabilities: WidgetCapability[]
  hasSettingsPanel: boolean
  settingsDefinition?: WidgetSettingsDefinition
  loadData: (context: WidgetLoadContext) => unknown | Promise<unknown>
  mutateData?: (context: WidgetMutationContext) => void | Promise<void>
}

export interface WidgetPresentation {
  widgetNumber: number
  boardKicker: string
}

export interface WidgetHealthState {
  widgetId: WidgetId
  refreshStatus: WidgetRefreshStatus
  lastRefreshAt?: string
  failureState?: string
  itemCount?: number
}

export interface WidgetPlacementZoneDefinition {
  id: WidgetPlacementZoneId
  label: string
  className: string
}

export interface RegisteredWidget {
  entity: WidgetEntityRecord
  module: WidgetMicroAppContract
  presentation: WidgetPresentation
}