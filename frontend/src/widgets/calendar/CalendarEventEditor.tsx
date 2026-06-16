import { useEffect, useState, type FormEvent } from 'react'
import { formatLocalizedText } from '../../i18n/localization'
import type { FamilyMember } from '../widgetHostModels'
import type { CalendarEventRecord } from './calendarApi'
import type { CalendarWidgetTranslation } from './translations'
import {
  buildCalendarEventInputFromDraft,
  calendarWeekdayOptions,
  createCalendarEventDraftFromRecord,
  createEmptyCalendarEventDraft,
  type CalendarEventDraft,
  validateCalendarEventDraft,
} from './calendarEditor'

interface CalendarEventEditorProps {
  widgetText: CalendarWidgetTranslation
  familyMembers: FamilyMember[]
  calendarEvents: CalendarEventRecord[]
  onCreateCalendarEvent: (
    draft: ReturnType<typeof buildCalendarEventInputFromDraft>,
  ) => Promise<CalendarEventRecord>
  onUpdateCalendarEvent: (
    calendarEventId: string,
    draft: ReturnType<typeof buildCalendarEventInputFromDraft>,
  ) => Promise<CalendarEventRecord>
  onDeleteCalendarEvent: (calendarEventId: string) => Promise<void>
}

const formatCalendarEventScope = (
  calendarEvent: CalendarEventRecord,
  familyMembersById: Map<string, FamilyMember>,
  widgetText: CalendarWidgetTranslation,
) => {
  if (calendarEvent.scope.mode === 'all') {
    return widgetText.detail.householdScopeLabel
  }

  return calendarEvent.scope.memberIds
    .map((memberId) => familyMembersById.get(memberId)?.firstName ?? memberId)
    .join(', ')
}

const formatRecurrenceSummary = (
  calendarEvent: CalendarEventRecord,
  widgetText: CalendarWidgetTranslation,
) => {
  if (calendarEvent.recurrence.frequency === 'none') {
    return widgetText.detail.recurrenceOneOffSummary
  }
  
  switch (calendarEvent.recurrence.frequency) {
    case 'daily':
      return formatLocalizedText(widgetText.detail.recurrenceDailySummary, {
        interval: calendarEvent.recurrence.interval,
      })
    case 'weekly':
      return formatLocalizedText(widgetText.detail.recurrenceWeeklySummary, {
        interval: calendarEvent.recurrence.interval,
      })
    case 'monthly':
      return formatLocalizedText(widgetText.detail.recurrenceMonthlySummary, {
        interval: calendarEvent.recurrence.interval,
      })
    case 'yearly':
      return formatLocalizedText(widgetText.detail.recurrenceYearlySummary, {
        interval: calendarEvent.recurrence.interval,
      })
    default:
      return widgetText.detail.recurrenceOneOffSummary
  }
}

export function CalendarEventEditor({
  widgetText,
  familyMembers,
  calendarEvents,
  onCreateCalendarEvent,
  onUpdateCalendarEvent,
  onDeleteCalendarEvent,
}: CalendarEventEditorProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CalendarEventDraft>(() => createEmptyCalendarEventDraft())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const familyMembersById = new Map(familyMembers.map((member) => [member.id, member]))
  const selectedEvent = selectedEventId
    ? calendarEvents.find((calendarEvent) => calendarEvent.seriesId === selectedEventId) ?? null
    : null

  useEffect(() => {
    if (!selectedEventId) {
      return
    }

    if (!selectedEvent) {
      setSelectedEventId(null)
      setDraft(createEmptyCalendarEventDraft())
      return
    }

    setDraft(createCalendarEventDraftFromRecord(selectedEvent))
  }, [selectedEvent, selectedEventId])

  const beginCreate = () => {
    setSelectedEventId(null)
    setDraft(createEmptyCalendarEventDraft())
    setSubmitError(null)
    setSubmitNotice(null)
  }

  const beginEdit = (calendarEvent: CalendarEventRecord) => {
    setSelectedEventId(calendarEvent.seriesId)
    setDraft(createCalendarEventDraftFromRecord(calendarEvent))
    setSubmitError(null)
    setSubmitNotice(null)
  }

  const toggleScopeMember = (memberId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      scopeMemberIds: currentDraft.scopeMemberIds.includes(memberId)
        ? currentDraft.scopeMemberIds.filter((value) => value !== memberId)
        : [...currentDraft.scopeMemberIds, memberId],
    }))
  }

  const toggleWeekday = (weekday: number) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      recurrenceByWeekdays: currentDraft.recurrenceByWeekdays.includes(weekday)
        ? currentDraft.recurrenceByWeekdays.filter((value) => value !== weekday)
        : [...currentDraft.recurrenceByWeekdays, weekday],
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateCalendarEventDraft(draft)

    if (validationError) {
      setSubmitError(validationError)
      setSubmitNotice(null)
      return
    }

    setPending(true)
    setSubmitError(null)
    setSubmitNotice(null)

    try {
      const payload = buildCalendarEventInputFromDraft(draft)
      const persistedCalendarEvent = selectedEventId
        ? await onUpdateCalendarEvent(selectedEventId, payload)
        : await onCreateCalendarEvent(payload)

      beginEdit(persistedCalendarEvent)
      setSubmitNotice(
        selectedEventId
          ? widgetText.detail.updatedNotice
          : widgetText.detail.createdNotice,
      )
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : widgetText.detail.saveFailedFallback,
      )
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async (calendarEvent: CalendarEventRecord) => {
    const confirmed = window.confirm(
      formatLocalizedText(widgetText.detail.deleteConfirm, {
        title: calendarEvent.title,
      }),
    )

    if (!confirmed) {
      return
    }

    setPending(true)
    setSubmitError(null)
    setSubmitNotice(null)

    try {
      await onDeleteCalendarEvent(calendarEvent.seriesId)

      if (selectedEventId === calendarEvent.seriesId) {
        setSelectedEventId(null)
        setDraft(createEmptyCalendarEventDraft())
      }

      setSubmitNotice(widgetText.detail.deletedNotice)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : widgetText.detail.deleteFailedFallback,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <article className="settings-card calendar-events-card">
      <div className="settings-card-head">
        <p className="widget-kicker">{widgetText.detail.seriesTitle}</p>
        <h3>{widgetText.detail.editorTitle}</h3>
      </div>

      <p className="settings-copy">{widgetText.detail.editorCopy}</p>

      {submitError ? <p className="settings-note settings-note--warning">{submitError}</p> : null}
      {submitNotice ? <p className="settings-note">{submitNotice}</p> : null}

      <div className="calendar-events-layout">
        <div className="calendar-event-list-wrap">
          <div className="calendar-event-list-head">
            <p className="widget-kicker">{widgetText.detail.seriesTitle}</p>
            <button
              className="settings-submit settings-submit--secondary"
              type="button"
              onClick={beginCreate}
              disabled={pending}
            >
              {widgetText.detail.newEventAction}
            </button>
          </div>

          <div className="calendar-event-list">
            {calendarEvents.length > 0 ? (
              calendarEvents.map((calendarEvent) => {
                const isSelected = selectedEventId === calendarEvent.seriesId

                return (
                  <article
                    className={`calendar-event-row${isSelected ? ' is-active' : ''}`}
                    key={calendarEvent.seriesId}
                  >
                    <div className="calendar-event-row-copy">
                      <p className="calendar-event-row-title">{calendarEvent.title}</p>
                      <p className="calendar-event-row-meta">
                        {calendarEvent.date} · {calendarEvent.time} · {calendarEvent.location}
                      </p>
                      <p className="calendar-event-row-meta">
                        {formatCalendarEventScope(calendarEvent, familyMembersById, widgetText)} · {formatRecurrenceSummary(calendarEvent, widgetText)}
                      </p>
                    </div>
                    <div className="calendar-event-row-actions">
                      <button
                        className="settings-submit settings-submit--secondary"
                        type="button"
                        onClick={() => beginEdit(calendarEvent)}
                        disabled={pending}
                      >
                        {widgetText.detail.editAction}
                      </button>
                      <button
                        className="settings-submit settings-submit--secondary settings-submit--danger"
                        type="button"
                        onClick={() => void handleDelete(calendarEvent)}
                        disabled={pending}
                      >
                        {widgetText.detail.deleteAction}
                      </button>
                    </div>
                  </article>
                )
              })
            ) : (
              <div className="empty-state">
                <p className="empty-title">{widgetText.detail.emptySeriesTitle}</p>
                <p className="empty-copy">{widgetText.detail.emptySeriesCopy}</p>
              </div>
            )}
          </div>
        </div>

        <form className="calendar-event-form" onSubmit={handleSubmit}>
          <div className="calendar-event-form-head">
            <div className="settings-card-head">
              <p className="widget-kicker">{widgetText.detail.editorTitle}</p>
              <h3>{selectedEventId ? widgetText.detail.editTitle : widgetText.detail.createTitle}</h3>
            </div>

            {selectedEventId ? (
              <button
                className="settings-submit settings-submit--secondary"
                type="button"
                onClick={beginCreate}
                disabled={pending}
              >
                {widgetText.detail.switchToCreateAction}
              </button>
            ) : null}
          </div>

          <div className="calendar-event-form-grid">
            <label className="settings-label">
              <span>{widgetText.detail.titleLabel}</span>
              <input
                className="settings-input"
                type="text"
                value={draft.title}
                onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, title: event.target.value }))}
                placeholder={widgetText.detail.titlePlaceholder}
                disabled={pending}
              />
            </label>

            <div className="calendar-event-inline-fields">
              <label className="settings-label">
                <span>{widgetText.detail.dateLabel}</span>
                <input
                  className="settings-input"
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, date: event.target.value }))}
                  disabled={pending}
                />
              </label>

              <label className="settings-label">
                <span>{widgetText.detail.timeLabel}</span>
                <input
                  className="settings-input"
                  type="time"
                  value={draft.time}
                  onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, time: event.target.value }))}
                  disabled={pending}
                />
              </label>
            </div>

            <div className="calendar-event-inline-fields">
              <label className="settings-label">
                <span>{widgetText.detail.cityLabel}</span>
                <input
                  className="settings-input"
                  type="text"
                  value={draft.locationCity}
                  onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, locationCity: event.target.value }))}
                  placeholder={widgetText.detail.cityPlaceholder}
                  disabled={pending}
                />
              </label>

              <label className="settings-label">
                <span>{widgetText.detail.countryLabel}</span>
                <input
                  className="settings-input"
                  type="text"
                  maxLength={2}
                  value={draft.locationCountry}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      locationCountry: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                    }))
                  }
                  placeholder={widgetText.detail.countryPlaceholder}
                  disabled={pending}
                />
              </label>
            </div>

            <label className="settings-label">
              <span>{widgetText.detail.descriptionLabel}</span>
              <textarea
                className="settings-input settings-textarea"
                value={draft.description}
                onChange={(event) => setDraft((currentDraft) => ({ ...currentDraft, description: event.target.value }))}
                placeholder={widgetText.detail.descriptionPlaceholder}
                disabled={pending}
              />
            </label>

            <label className="settings-label">
              <span>{widgetText.detail.scopeLabel}</span>
              <select
                className="settings-input settings-select"
                value={draft.scopeMode}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    scopeMode: event.target.value === 'members' ? 'members' : 'all',
                  }))
                }
                disabled={pending}
              >
                <option value="all">{widgetText.detail.scopeHouseholdOption}</option>
                <option value="members">{widgetText.detail.scopeMembersOption}</option>
              </select>
            </label>

            {draft.scopeMode === 'members' ? (
              <div className="calendar-chip-grid">
                {familyMembers.map((member) => (
                  <label className="calendar-chip" key={member.id}>
                    <input
                      type="checkbox"
                      checked={draft.scopeMemberIds.includes(member.id)}
                      onChange={() => toggleScopeMember(member.id)}
                      disabled={pending}
                    />
                    <span>{member.firstName}</span>
                  </label>
                ))}
              </div>
            ) : null}

            <label className="settings-label">
              <span>{widgetText.detail.recurrenceLabel}</span>
              <select
                className="settings-input settings-select"
                value={draft.recurrenceFrequency}
                onChange={(event) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    recurrenceFrequency: event.target.value as CalendarEventDraft['recurrenceFrequency'],
                  }))
                }
                disabled={pending}
              >
                <option value="none">{widgetText.detail.recurrenceOneOffOption}</option>
                <option value="daily">{widgetText.detail.recurrenceDailyOption}</option>
                <option value="weekly">{widgetText.detail.recurrenceWeeklyOption}</option>
                <option value="monthly">{widgetText.detail.recurrenceMonthlyOption}</option>
                <option value="yearly">{widgetText.detail.recurrenceYearlyOption}</option>
              </select>
            </label>

            <div className="calendar-event-inline-fields">
              <label className="settings-label">
                <span>{widgetText.detail.intervalLabel}</span>
                <input
                  className="settings-input"
                  type="number"
                  min={1}
                  step={1}
                  value={draft.recurrenceInterval}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      recurrenceInterval: event.target.value,
                    }))
                  }
                  disabled={pending}
                />
              </label>

              <label className="settings-label">
                <span>{widgetText.detail.countLabel}</span>
                <input
                  className="settings-input"
                  type="number"
                  min={1}
                  step={1}
                  value={draft.recurrenceCount}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      recurrenceCount: event.target.value,
                    }))
                  }
                  placeholder={widgetText.detail.countPlaceholder}
                  disabled={pending}
                />
              </label>

              <label className="settings-label">
                <span>{widgetText.detail.untilLabel}</span>
                <input
                  className="settings-input"
                  type="date"
                  value={draft.recurrenceUntil}
                  onChange={(event) =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      recurrenceUntil: event.target.value,
                    }))
                  }
                  disabled={pending}
                />
              </label>
            </div>

            {draft.recurrenceFrequency === 'weekly' ? (
              <div className="calendar-weekday-grid">
                {calendarWeekdayOptions.map((weekday) => (
                  <label className="calendar-chip" key={weekday.value}>
                    <input
                      type="checkbox"
                      checked={draft.recurrenceByWeekdays.includes(weekday.value)}
                      onChange={() => toggleWeekday(weekday.value)}
                      disabled={pending}
                    />
                    <span>{weekday.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="calendar-event-form-actions">
            <button className="settings-submit" type="submit" disabled={pending}>
              {pending
                ? selectedEventId
                  ? widgetText.detail.savingSeriesAction
                  : widgetText.detail.creatingSeriesAction
                : selectedEventId
                  ? widgetText.detail.saveSeriesAction
                  : widgetText.detail.createSeriesAction}
            </button>
          </div>
        </form>
      </div>
    </article>
  )
}