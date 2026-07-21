import type { ReactNode } from 'react'
import type { AppTextBundle } from '../i18n/appText'
import type { SupportedLanguageCode } from '../i18n/localization'

export type WidgetId = string
export type WidgetCapability = 'read' | 'write'
export type WidgetDataSource = 'database' | 'external-api' | 'system'
export type WidgetRefreshStatus = 'idle' | 'ok' | 'live' | 'cached' | 'static' | 'error'
export type WidgetScopeMode = 'all' | 'member' | 'members'
export type WidgetSettingFieldType = 'text' | 'number' | 'boolean'
export type WidgetMcpToolArgumentType = 'string' | 'number' | 'boolean'
export type WidgetPlacementZoneId =
  | 'service-board'
  | 'a1'
  | 'b1'
  | 'a2'
  | 'b2'
  | 'a3'
  | 'b3'

export type WidgetSettingsValues = Record<string, unknown>

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
  languageCode?: SupportedLanguageCode
}

export interface WidgetMutationContext {
  action: string
  focusedMemberId?: string | null
  payload?: unknown
}

export interface WidgetDetailViewContext {
  widget: RegisteredWidget
  data: unknown
  languageCode: SupportedLanguageCode
  appText: AppTextBundle
}

export interface WidgetSettingsPanelContext {
  widget: RegisteredWidget
  languageCode: SupportedLanguageCode
  appText: AppTextBundle
  initialSettings: WidgetSettingsValues
  onSave: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

export interface WidgetSettingsFieldTextDefinition {
  label: string
  placeholder?: string
}

export interface WidgetSettingsTextDefinition {
  title: string
  description: string
  fields: Record<string, WidgetSettingsFieldTextDefinition>
}

export interface WidgetTranslationDefinition {
  title: string
  boardKicker: string
  copy: Record<string, string>
  settings?: WidgetSettingsTextDefinition
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

export interface WidgetMcpToolArgumentDefinition {
  key: string
  type: WidgetMcpToolArgumentType
  description: string
  required?: boolean
}

export interface WidgetMcpToolDefinition {
  name: string
  description: string
  humanAction: string
  parityScope: WidgetCapability[]
  approvalRequired?: boolean
  redactArguments?: boolean
  redactResults?: boolean
  arguments: WidgetMcpToolArgumentDefinition[]
}

export interface WidgetMcpToolPolicySettings {
  enabled: boolean
  approvalRequired: boolean
}

export interface WidgetMcpConfigurationSettings {
  toolPolicies: Record<string, WidgetMcpToolPolicySettings>
}

export interface WidgetMicroAppContract {
  entityId: WidgetId
  folderName: string
  dataSource: WidgetDataSource
  capabilities: WidgetCapability[]
  hasSettingsPanel: boolean
  mcpTools?: WidgetMcpToolDefinition[]
  settingsDefinition?: WidgetSettingsDefinition
  getTranslation: (languageCode: SupportedLanguageCode) => WidgetTranslationDefinition
  matchesDefaultTitle?: (title: string) => boolean
  loadData: (context: WidgetLoadContext) => unknown | Promise<unknown>
  mutateData?: (context: WidgetMutationContext) => void | Promise<void>
  renderSettingsPanel?: (context: WidgetSettingsPanelContext) => ReactNode
  renderDetailView?: (context: WidgetDetailViewContext) => ReactNode
}

export interface WidgetPresentation {
  widgetNumber: number
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

export interface RegisteredWidgetMcpTool {
  widgetId: WidgetId
  widgetTitle: string
  sourceLocation: string
  toolName: string
  providerToolName: string
  description: string
  humanAction: string
  parityScope: WidgetCapability[]
  approvalRequired: boolean
  redactArguments: boolean
  redactResults: boolean
  arguments: WidgetMcpToolArgumentDefinition[]
}