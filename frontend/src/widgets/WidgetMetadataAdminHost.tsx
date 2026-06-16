import { useEffect, useRef, useState } from 'react'
import type { AppTextBundle } from '../i18n/appText'
import {
  formatLocalizedText,
  type SupportedLanguageCode,
} from '../i18n/localization'
import { buildBadgeStyle } from './widgetAppearance'
import type { FamilyMember } from './widgetHostModels'
import {
  widgetPlacementZoneIds,
} from './widgetPlacementZones'
import type {
  RegisteredWidget,
  WidgetPlacementZoneId,
  WidgetScopeMode,
  WidgetSettingsValues,
} from './widgetTypes'
import {
  getLocalizedSettingsDefinition,
  resolveWidgetTitle,
} from './widgetLocalization'

export interface WidgetMetadataDraft {
  title: string
  subwayLetter: string
  subwayColor: string
  sourceLocation: string
  userScopeMode: WidgetScopeMode
  userScopeMemberIds: string[]
  placementZones: Array<{
    zoneId: WidgetPlacementZoneId
    enabled: boolean
    order: number
  }>
}

interface WidgetMetadataAdminHostProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  registeredWidgets: RegisteredWidget[]
  familyMembers: FamilyMember[]
  availableSourceLocations: string[]
  widgetSettingsMap: Record<string, WidgetSettingsValues>
  onSaveWidgetMetadata: (widgetId: string, draft: WidgetMetadataDraft) => Promise<void>
  onSaveWidgetSettings: (
    widgetId: string,
    settings: WidgetSettingsValues,
  ) => Promise<void>
}

const zoneOptions: WidgetPlacementZoneId[] = widgetPlacementZoneIds

const zoneBadgeLabels: Record<WidgetPlacementZoneId, string> = {
  'service-board': 'SB',
  a1: 'A1',
  b1: 'B1',
  a2: 'A2',
  b2: 'B2',
  a3: 'A3',
  b3: 'B3',
}

type SyncState = 'idle' | 'pending' | 'syncing' | 'synced' | 'error'

const getMemberBadgeText = (member: FamilyMember) =>
  member.firstName.trim().charAt(0).toUpperCase() || '?'

const buildOrderedSpecificFields = (
  widgetId: string,
  settingsDefinition: RegisteredWidget['module']['settingsDefinition'],
) => {

  if (!settingsDefinition) {
    return []
  }

  if (widgetId !== 'weather') {
    return settingsDefinition.fields
  }

  const fieldsByKey = new Map(
    settingsDefinition.fields.map((field) => [field.key, field]),
  )
  const orderedFields = []

  const focusField = fieldsByKey.get('focusLocationSlot')
  const refreshIntervalField = fieldsByKey.get('refreshIntervalMinutes')

  if (focusField) {
    orderedFields.push(focusField)
  }

  if (refreshIntervalField) {
    orderedFields.push(refreshIntervalField)
  }

  for (let slotIndex = 1; slotIndex <= 5; slotIndex += 1) {
    const labelField = fieldsByKey.get(`location${slotIndex}Label`)
    const longitudeField = fieldsByKey.get(`location${slotIndex}Longitude`)
    const latitudeField = fieldsByKey.get(`location${slotIndex}Latitude`)

    if (labelField) {
      orderedFields.push(labelField)
    }

    if (longitudeField) {
      orderedFields.push(longitudeField)
    }

    if (latitudeField) {
      orderedFields.push(latitudeField)
    }
  }

  return orderedFields
}

const buildSpecificFieldsByKey = (
  settingsDefinition: RegisteredWidget['module']['settingsDefinition'],
) => {
  return new Map(settingsDefinition?.fields.map((field) => [field.key, field]) ?? [])
}

const buildSettingsDraft = (
  widget: RegisteredWidget,
  settings: WidgetSettingsValues | undefined,
) => {
  const settingsDefinition = widget.module.settingsDefinition

  if (!settingsDefinition) {
    return {}
  }

  return settingsDefinition.normalize(settings ?? settingsDefinition.defaults)
}

const buildMetadataSnapshot = (draft: WidgetMetadataDraft) =>
  JSON.stringify({
    ...draft,
    userScopeMemberIds: [...draft.userScopeMemberIds].sort(),
    placementZones: draft.placementZones.map((placement) => ({
      ...placement,
    })),
  })

const buildSettingsSnapshot = (settings: WidgetSettingsValues) =>
  JSON.stringify(settings)

const buildDraftFromWidget = (widget: RegisteredWidget): WidgetMetadataDraft => ({
  title: widget.entity.title,
  subwayLetter: widget.entity.subwayLetter,
  subwayColor: widget.entity.subwayColor,
  sourceLocation: widget.entity.sourceLocation,
  userScopeMode: widget.entity.userScope.mode,
  userScopeMemberIds: widget.entity.userScope.memberIds,
  placementZones: zoneOptions.map((zoneId) => {
    const placement = widget.entity.placementZones.find((entry) => entry.zoneId === zoneId)
    return {
      zoneId,
      enabled: Boolean(placement),
      order: placement?.order ?? 1,
    }
  }),
})

function WidgetMetadataCard({
  widget,
  appText,
  languageCode,
  familyMembers,
  availableSourceLocations,
  widgetSettings,
  onSave,
  onSaveSettings,
}: {
  widget: RegisteredWidget
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  familyMembers: FamilyMember[]
  availableSourceLocations: string[]
  widgetSettings: WidgetSettingsValues | undefined
  onSave: (widgetId: string, draft: WidgetMetadataDraft) => Promise<void>
  onSaveSettings: (
    widgetId: string,
    settings: WidgetSettingsValues,
  ) => Promise<void>
}) {
  const [draft, setDraft] = useState<WidgetMetadataDraft>(buildDraftFromWidget(widget))
  const [settingsDraft, setSettingsDraft] = useState<WidgetSettingsValues>(
    buildSettingsDraft(widget, widgetSettings),
  )
  const [syncState, setSyncState] = useState<SyncState>('idle')

  const syncTimerRef = useRef<number | null>(null)
  const metadataDraftRef = useRef<WidgetMetadataDraft>(buildDraftFromWidget(widget))
  const settingsDraftRef = useRef<WidgetSettingsValues>(
    buildSettingsDraft(widget, widgetSettings),
  )
  const lastSavedMetadataRef = useRef(buildMetadataSnapshot(buildDraftFromWidget(widget)))
  const lastSavedSettingsRef = useRef(
    buildSettingsSnapshot(buildSettingsDraft(widget, widgetSettings)),
  )

  const settingsDefinition = widget.module.settingsDefinition
  const localizedSettingsDefinition = getLocalizedSettingsDefinition(
    widget.module,
    languageCode,
  )
  const orderedSpecificFields = buildOrderedSpecificFields(
    widget.entity.id,
    localizedSettingsDefinition,
  )
  const specificFieldsByKey = buildSpecificFieldsByKey(localizedSettingsDefinition)

  const isAllScope = draft.userScopeMode === 'all'

  const queueSync = (
    nextMetadataDraft: WidgetMetadataDraft,
    nextSettingsDraft: WidgetSettingsValues,
  ) => {
    metadataDraftRef.current = nextMetadataDraft
    settingsDraftRef.current = nextSettingsDraft

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
    }

    setSyncState('pending')

    syncTimerRef.current = window.setTimeout(async () => {
      const normalizedSettings = settingsDefinition
        ? settingsDefinition.normalize(settingsDraftRef.current)
        : {}
      const metadataSnapshot = buildMetadataSnapshot(metadataDraftRef.current)
      const settingsSnapshot = buildSettingsSnapshot(normalizedSettings)
      const saveTasks: Promise<void>[] = []

      if (metadataSnapshot !== lastSavedMetadataRef.current) {
        saveTasks.push(
          onSave(widget.entity.id, metadataDraftRef.current).then(() => {
            lastSavedMetadataRef.current = metadataSnapshot
          }),
        )
      }

      if (
        settingsDefinition &&
        settingsSnapshot !== lastSavedSettingsRef.current
      ) {
        saveTasks.push(
          onSaveSettings(widget.entity.id, normalizedSettings).then(() => {
            lastSavedSettingsRef.current = settingsSnapshot
          }),
        )
      }

      if (saveTasks.length === 0) {
        setSyncState('idle')
        return
      }

      setSyncState('syncing')

      try {
        await Promise.all(saveTasks)
        setSyncState('synced')
      } catch {
        setSyncState('error')
      }
    }, 320)
  }

  useEffect(() => {
    const nextMetadataDraft = buildDraftFromWidget(widget)
    const nextSettingsDraft = buildSettingsDraft(widget, widgetSettings)

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
    }

    setDraft(nextMetadataDraft)
    setSettingsDraft(nextSettingsDraft)
    metadataDraftRef.current = nextMetadataDraft
    settingsDraftRef.current = nextSettingsDraft
    lastSavedMetadataRef.current = buildMetadataSnapshot(nextMetadataDraft)
    lastSavedSettingsRef.current = buildSettingsSnapshot(nextSettingsDraft)
    setSyncState('idle')
  }, [widget, widgetSettings])

  useEffect(
    () => () => {
      if (syncTimerRef.current !== null) {
        window.clearTimeout(syncTimerRef.current)
      }
    },
    [],
  )

  const updateMetadataDraft = (
    updater: (currentDraft: WidgetMetadataDraft) => WidgetMetadataDraft,
  ) => {
    setDraft((currentDraft) => {
      const nextDraft = updater(currentDraft)

      queueSync(nextDraft, settingsDraftRef.current)

      return nextDraft
    })
  }

  const updateSettingsDraft = (
    updater: (currentSettings: WidgetSettingsValues) => WidgetSettingsValues,
  ) => {
    setSettingsDraft((currentSettings: WidgetSettingsValues) => {
      const nextSettings = updater(currentSettings)

      queueSync(metadataDraftRef.current, nextSettings)

      return nextSettings
    })
  }

  const toggleMemberId = (memberId: string, checked: boolean) => {
    updateMetadataDraft((currentDraft) => {
      const nextMemberIds = checked
        ? [...new Set([...currentDraft.userScopeMemberIds, memberId])]
        : currentDraft.userScopeMemberIds.filter(
            (currentMemberId) => currentMemberId !== memberId,
          )

      if (nextMemberIds.length === 0) {
        return {
          ...currentDraft,
          userScopeMode: 'all',
          userScopeMemberIds: [],
        }
      }

      return {
        ...currentDraft,
        userScopeMode: nextMemberIds.length === 1 ? 'member' : 'members',
        userScopeMemberIds: nextMemberIds,
      }
    })
  }

  const toggleAllScope = () => {
    updateMetadataDraft((currentDraft) => ({
      ...currentDraft,
      userScopeMode: 'all',
      userScopeMemberIds: [],
    }))
  }

  const togglePlacement = (zoneId: WidgetPlacementZoneId) => {
    updateMetadataDraft((currentDraft) => {
      return {
        ...currentDraft,
        placementZones: currentDraft.placementZones.map((placement, index) =>
          placement.zoneId === zoneId
            ? {
                ...placement,
                enabled: !placement.enabled,
                order: placement.order || index + 1,
              }
            : placement,
        ),
      }
    })
  }

  const syncStateLabel =
    syncState === 'pending'
      ? appText.widgetAdmin.pendingSync
      : syncState === 'syncing'
        ? appText.widgetAdmin.syncing
        : syncState === 'synced'
          ? appText.widgetAdmin.synced
          : syncState === 'error'
            ? appText.widgetAdmin.syncFailed
            : appText.widgetAdmin.idle


  const renderSpecificField = (
    fieldKey: string,
    className = 'settings-label',
  ) => {
    const field = specificFieldsByKey.get(fieldKey)

    if (!field) {
      return null
    }

    const fieldValue = settingsDraft[field.key]

    if (field.type === 'boolean') {
      return (
        <label className="settings-toggle" key={field.key}>
          <span>{field.label}</span>
          <input
            type="checkbox"
            checked={Boolean(fieldValue)}
            onChange={(event) =>
              updateSettingsDraft((currentSettings) => ({
                ...currentSettings,
                [field.key]: event.target.checked,
              }))
            }
          />
        </label>
      )
    }

    return (
      <label className={className} key={field.key}>
        <span>{field.label}</span>
        <input
          className="settings-input"
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(fieldValue ?? '')}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          onChange={(event) =>
            updateSettingsDraft((currentSettings) => ({
              ...currentSettings,
              [field.key]:
                field.type === 'number'
                  ? Number(event.target.value)
                  : event.target.value,
            }))
          }
        />
      </label>
    )
  }

  return (
    <article className="settings-card widget-config-row">
      <div className="widget-config-header">
        <div className="widget-config-title">
          <span
            className="route-bullet route-bullet--large"
            style={buildBadgeStyle(widget.entity.subwayColor)}
          >
            {widget.entity.subwayLetter}
          </span>
          <div>
            <h3>{resolveWidgetTitle(widget, languageCode)}</h3>
          </div>
        </div>

        <p className={`widget-sync-state widget-sync-state--${syncState}`}>
          {syncStateLabel}
        </p>
      </div>

      <div className="widget-config-body">
        {settingsDefinition ? (
          <div className="widget-config-section widget-config-section--specific">
            <div
              className={`widget-config-fields widget-config-fields--specific${
                widget.entity.id === 'weather' ? ' widget-config-fields--weather' : ''
              }`}
            >
              {widget.entity.id === 'weather' ? (
                <>
                  {renderSpecificField(
                    'focusLocationSlot',
                    'settings-label settings-label--span-full',
                  )}
                  {renderSpecificField(
                    'refreshIntervalMinutes',
                    'settings-label settings-label--span-full',
                  )}
                  {Array.from({ length: 5 }, (_, index) => {
                    const slotNumber = index + 1

                    return (
                      <div className="weather-location-settings-row" key={slotNumber}>
                        {renderSpecificField(`location${slotNumber}Label`)}
                        {renderSpecificField(`location${slotNumber}Longitude`)}
                        {renderSpecificField(`location${slotNumber}Latitude`)}
                      </div>
                    )
                  })}
                </>
              ) : (
                orderedSpecificFields.map((field) => renderSpecificField(field.key))
              )}
            </div>
          </div>
        ) : null}

        <div className="widget-config-section widget-config-section--standard">
          <div className="widget-config-fields widget-config-fields--meta">
            <label className="settings-label">
              <span>{appText.widgetAdmin.titleLabel}</span>
              <input
                className="settings-input"
                type="text"
                value={draft.title}
                onChange={(event) =>
                  updateMetadataDraft((currentDraft) => ({
                    ...currentDraft,
                    title: event.target.value,
                  }))
                }
              />
            </label>

            <label className="settings-label">
              <span>{appText.widgetAdmin.letterLabel}</span>
              <input
                className="settings-input"
                type="text"
                maxLength={1}
                value={draft.subwayLetter}
                onChange={(event) =>
                  updateMetadataDraft((currentDraft) => ({
                    ...currentDraft,
                    subwayLetter: event.target.value.toUpperCase(),
                  }))
                }
              />
            </label>

            <label className="settings-label settings-label--color">
              <span>{appText.widgetAdmin.colorLabel}</span>
              <input
                className="settings-color"
                type="color"
                value={draft.subwayColor}
                onChange={(event) =>
                  updateMetadataDraft((currentDraft) => ({
                    ...currentDraft,
                    subwayColor: event.target.value,
                  }))
                }
              />
            </label>

            <label className="settings-label">
              <span>{appText.widgetAdmin.sourceLabel}</span>
              <select
                className="settings-input settings-select"
                value={draft.sourceLocation}
                onChange={(event) =>
                  updateMetadataDraft((currentDraft) => ({
                    ...currentDraft,
                    sourceLocation: event.target.value,
                  }))
                }
              >
                {availableSourceLocations.map((sourceLocation) => (
                  <option key={sourceLocation} value={sourceLocation}>
                    {sourceLocation}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="widget-config-section widget-config-section--scope">
          <p className="widget-kicker">{appText.widgetAdmin.scopeHeading}</p>
          <div className="settings-chip-row">
            <button
              type="button"
              className={`settings-scope-chip settings-scope-chip--all${
                isAllScope ? ' is-active' : ''
              }`}
              aria-pressed={isAllScope}
              aria-label={appText.widgetAdmin.allScopeAriaLabel}
              onClick={toggleAllScope}
            >
              {appText.widgetAdmin.allScopeAction}
            </button>

            {familyMembers.map((member) => {
              const isActive =
                !isAllScope && draft.userScopeMemberIds.includes(member.id)

              return (
                <button
                  key={member.id}
                  type="button"
                  className={`settings-scope-chip route-bullet route-bullet--small${
                    isActive ? ' is-active' : ''
                  }`}
                  style={buildBadgeStyle(member.color)}
                  aria-pressed={isActive}
                  aria-label={member.firstName}
                  onClick={() => toggleMemberId(member.id, !isActive)}
                >
                  {getMemberBadgeText(member)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="widget-config-section widget-config-section--layout">
          <p className="widget-kicker">{appText.widgetAdmin.cellsHeading}</p>
          <div className="settings-cell-layout">
            {draft.placementZones.map((placement) => (
              <button
                key={placement.zoneId}
                type="button"
                className={`settings-cell-chip settings-cell-chip--${placement.zoneId}${placement.enabled ? ' is-active' : ''}`}
                data-zone-id={placement.zoneId}
                aria-pressed={placement.enabled}
                aria-label={formatLocalizedText(
                  appText.widgetAdmin.toggleCellAriaLabel,
                  {
                    zoneLabel: zoneBadgeLabels[placement.zoneId],
                  },
                )}
                onClick={() => togglePlacement(placement.zoneId)}
              >
                {zoneBadgeLabels[placement.zoneId]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export function WidgetMetadataAdminHost({
  appText,
  languageCode,
  registeredWidgets,
  familyMembers,
  availableSourceLocations,
  widgetSettingsMap,
  onSaveWidgetMetadata,
  onSaveWidgetSettings,
}: WidgetMetadataAdminHostProps) {
  return (
    <section className="widget-metadata-host">
      {registeredWidgets.map((widget) => (
        <WidgetMetadataCard
          key={widget.entity.id}
          widget={widget}
          appText={appText}
          languageCode={languageCode}
          familyMembers={familyMembers}
          availableSourceLocations={availableSourceLocations}
          widgetSettings={widgetSettingsMap[widget.entity.id]}
          onSave={onSaveWidgetMetadata}
          onSaveSettings={onSaveWidgetSettings}
        />
      ))}
    </section>
  )
}
