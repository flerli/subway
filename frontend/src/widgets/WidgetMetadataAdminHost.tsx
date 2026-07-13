import { useEffect, useRef, useState } from 'react'
import type { AppTextBundle } from '../i18n/appText'
import {
  formatLocalizedText,
  type SupportedLanguageCode,
} from '../i18n/localization'
import { buildBadgeStyle } from './widgetAppearance'
import type { FamilyMember } from './widgetHostModels'
import { widgetPlacementZoneIds } from './widgetPlacementZones'
import type {
  RegisteredWidget,
  WidgetPlacementZoneId,
  WidgetScopeMode,
} from './widgetTypes'
import { resolveWidgetTitle } from './widgetLocalization'

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
  expandedWidgetId: string | null
  onExpandedWidgetChange: (widgetId: string | null) => void
  onSaveWidgetMetadata: (widgetId: string, draft: WidgetMetadataDraft) => Promise<void>
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

const buildMetadataSnapshot = (draft: WidgetMetadataDraft) =>
  JSON.stringify({
    ...draft,
    userScopeMemberIds: [...draft.userScopeMemberIds].sort(),
    placementZones: draft.placementZones.map((placement) => ({
      ...placement,
    })),
  })

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
  isSettingsOpen,
  onToggleSettings,
  onSave,
}: {
  widget: RegisteredWidget
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  familyMembers: FamilyMember[]
  availableSourceLocations: string[]
  isSettingsOpen: boolean
  onToggleSettings: (widgetId: string) => void
  onSave: (widgetId: string, draft: WidgetMetadataDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<WidgetMetadataDraft>(buildDraftFromWidget(widget))
  const [syncState, setSyncState] = useState<SyncState>('idle')

  const syncTimerRef = useRef<number | null>(null)
  const metadataDraftRef = useRef<WidgetMetadataDraft>(buildDraftFromWidget(widget))
  const lastSavedMetadataRef = useRef(buildMetadataSnapshot(buildDraftFromWidget(widget)))

  const isAllScope = draft.userScopeMode === 'all'

  const queueSync = (nextMetadataDraft: WidgetMetadataDraft) => {
    metadataDraftRef.current = nextMetadataDraft

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
    }

    setSyncState('pending')

    syncTimerRef.current = window.setTimeout(async () => {
      const metadataSnapshot = buildMetadataSnapshot(metadataDraftRef.current)

      if (metadataSnapshot === lastSavedMetadataRef.current) {
        setSyncState('idle')
        return
      }

      setSyncState('syncing')

      try {
        await onSave(widget.entity.id, metadataDraftRef.current)
        lastSavedMetadataRef.current = metadataSnapshot
        setSyncState('synced')
      } catch {
        setSyncState('error')
      }
    }, 320)
  }

  useEffect(() => {
    const nextMetadataDraft = buildDraftFromWidget(widget)

    if (syncTimerRef.current !== null) {
      window.clearTimeout(syncTimerRef.current)
    }

    setDraft(nextMetadataDraft)
    metadataDraftRef.current = nextMetadataDraft
    lastSavedMetadataRef.current = buildMetadataSnapshot(nextMetadataDraft)
    setSyncState('idle')
  }, [widget])

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

      queueSync(nextDraft)

      return nextDraft
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

        <div className="widget-config-header-actions">
          {syncState !== 'idle' ? (
            <p className={`widget-sync-state widget-sync-state--${syncState}`}>
              {syncStateLabel}
            </p>
          ) : null}

          {widget.module.hasSettingsPanel ? (
            <button
              type="button"
              className={`widget-action-button${isSettingsOpen ? ' is-active' : ''}`}
              aria-label={
                isSettingsOpen
                  ? formatLocalizedText(appText.boardHost.collapseAriaLabel, {
                      title: resolveWidgetTitle(widget, languageCode),
                    })
                  : formatLocalizedText(appText.boardHost.expandAriaLabel, {
                      title: resolveWidgetTitle(widget, languageCode),
                    })
              }
              aria-pressed={isSettingsOpen}
              onClick={() => onToggleSettings(widget.entity.id)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M4 8V4h4M12 4h4v4M4 12v4h4M16 12v4h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                />
              </svg>
              <span>
                {isSettingsOpen
                  ? appText.boardHost.collapseAction
                  : appText.widgetAdmin.openSettingsAction}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="widget-config-body">
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
  expandedWidgetId,
  onExpandedWidgetChange,
  onSaveWidgetMetadata,
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
          isSettingsOpen={expandedWidgetId === widget.entity.id}
          onToggleSettings={(widgetId) =>
            onExpandedWidgetChange(
              expandedWidgetId === widgetId ? null : widgetId,
            )
          }
          onSave={onSaveWidgetMetadata}
        />
      ))}
    </section>
  )
}