import { useEffect, useState } from 'react'
import type { FamilyMember } from './widgetHostModels'
import type {
  RegisteredWidget,
  WidgetPlacementZoneId,
  WidgetScopeMode,
} from './widgetTypes'

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
  registeredWidgets: RegisteredWidget[]
  familyMembers: FamilyMember[]
  availableSourceLocations: string[]
  onSaveWidgetMetadata: (widgetId: string, draft: WidgetMetadataDraft) => Promise<void>
}

const zoneOptions: WidgetPlacementZoneId[] = [
  'hero',
  'triad',
  'bottom-wide',
  'bottom-side',
]

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
  familyMembers,
  availableSourceLocations,
  onSave,
}: {
  widget: RegisteredWidget
  familyMembers: FamilyMember[]
  availableSourceLocations: string[]
  onSave: (widgetId: string, draft: WidgetMetadataDraft) => Promise<void>
}) {
  const [draft, setDraft] = useState<WidgetMetadataDraft>(buildDraftFromWidget(widget))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    setDraft(buildDraftFromWidget(widget))
  }, [widget])

  const toggleMemberId = (memberId: string, checked: boolean) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      userScopeMemberIds: checked
        ? [...new Set([...currentDraft.userScopeMemberIds, memberId])]
        : currentDraft.userScopeMemberIds.filter((currentMemberId) => currentMemberId !== memberId),
    }))
  }

  const updatePlacement = (
    zoneId: WidgetPlacementZoneId,
    field: 'enabled' | 'order',
    value: boolean | number,
  ) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      placementZones: currentDraft.placementZones.map((placement) =>
        placement.zoneId === zoneId ? { ...placement, [field]: value } : placement,
      ),
    }))
  }

  const handleSave = async () => {
    setSaveState('saving')

    try {
      await onSave(widget.entity.id, draft)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <article className="settings-card widget-metadata-card">
      <div className="settings-card-head">
        <p className="widget-kicker">{widget.presentation.boardKicker}</p>
        <h3>{widget.entity.title}</h3>
        <p>Central widget identity, scope, placement, and source metadata.</p>
      </div>

      <div className="widget-settings-fields">
        <label className="settings-label">
          <span>Title</span>
          <input
            className="settings-input"
            type="text"
            value={draft.title}
            onChange={(event) =>
              setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))
            }
          />
        </label>

        <label className="settings-label">
          <span>Subway letter</span>
          <input
            className="settings-input"
            type="text"
            maxLength={1}
            value={draft.subwayLetter}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                subwayLetter: event.target.value.toUpperCase(),
              }))
            }
          />
        </label>

        <label className="settings-label settings-label--color">
          <span>Subway color</span>
          <input
            className="settings-color"
            type="color"
            value={draft.subwayColor}
            onChange={(event) =>
              setDraft((currentDraft) => ({ ...currentDraft, subwayColor: event.target.value }))
            }
          />
        </label>

        <label className="settings-label">
          <span>Source location</span>
          <select
            className="settings-input settings-select"
            value={draft.sourceLocation}
            onChange={(event) =>
              setDraft((currentDraft) => ({ ...currentDraft, sourceLocation: event.target.value }))
            }
          >
            {availableSourceLocations.map((sourceLocation) => (
              <option key={sourceLocation} value={sourceLocation}>
                {sourceLocation}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-label">
          <span>Scope mode</span>
          <select
            className="settings-input settings-select"
            value={draft.userScopeMode}
            onChange={(event) =>
              setDraft((currentDraft) => ({
                ...currentDraft,
                userScopeMode: event.target.value as WidgetScopeMode,
              }))
            }
          >
            <option value="all">All</option>
            <option value="member">One member</option>
            <option value="members">Multiple members</option>
          </select>
        </label>
      </div>

      <div className="metadata-checkbox-group">
        <p className="widget-kicker">Scope members</p>
        <div className="metadata-checkbox-grid">
          {familyMembers.map((member) => (
            <label className="settings-toggle" key={member.id}>
              <span>{member.firstName}</span>
              <input
                type="checkbox"
                checked={draft.userScopeMemberIds.includes(member.id)}
                onChange={(event) => toggleMemberId(member.id, event.target.checked)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="metadata-checkbox-group">
        <p className="widget-kicker">Placement zones</p>
        <div className="placement-grid">
          {draft.placementZones.map((placement) => (
            <div className="placement-row" key={placement.zoneId}>
              <label className="settings-toggle">
                <span>{placement.zoneId}</span>
                <input
                  type="checkbox"
                  checked={placement.enabled}
                  onChange={(event) =>
                    updatePlacement(placement.zoneId, 'enabled', event.target.checked)
                  }
                />
              </label>
              <label className="settings-label">
                <span>Order</span>
                <input
                  className="settings-input"
                  type="number"
                  min={1}
                  value={placement.order}
                  onChange={(event) =>
                    updatePlacement(placement.zoneId, 'order', Number(event.target.value))
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="widget-settings-actions">
        <button className="settings-submit" type="button" onClick={handleSave}>
          Save widget metadata
        </button>
        <p className="settings-note">
          {saveState === 'saving'
            ? 'Saving...'
            : saveState === 'saved'
              ? 'Saved.'
              : saveState === 'error'
                ? 'Save failed.'
                : 'Pending changes.'}
        </p>
      </div>
    </article>
  )
}

export function WidgetMetadataAdminHost({
  registeredWidgets,
  familyMembers,
  availableSourceLocations,
  onSaveWidgetMetadata,
}: WidgetMetadataAdminHostProps) {
  return (
    <section className="widget-metadata-host">
      {registeredWidgets.map((widget) => (
        <WidgetMetadataCard
          key={widget.entity.id}
          widget={widget}
          familyMembers={familyMembers}
          availableSourceLocations={availableSourceLocations}
          onSave={onSaveWidgetMetadata}
        />
      ))}
    </section>
  )
}
