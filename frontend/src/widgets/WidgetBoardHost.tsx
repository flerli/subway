import { useEffect, type ReactNode } from 'react'
import type { AppTextBundle } from '../i18n/appText'
import {
  formatLocalizedText,
  type SupportedLanguageCode,
} from '../i18n/localization'
import { buildBadgeStyle } from './widgetAppearance'
import type { ArrivalBoardWidgetTranslation } from './arrival-board/translations'
import type { CalendarWidgetTranslation } from './calendar/translations'
import type {
  AgendaItem,
  Arrival,
  AudienceBadgeRenderer,
  FamilyMember,
  FilterId,
  FilterOption,
  TodoItem,
  WeatherWidgetData,
} from './widgetHostModels'
import { widgetGridPlacementZones } from './widgetPlacementZones'
import { WeatherIcon } from './weather/WeatherIcon'
import type {
  RegisteredWidget,
  WidgetPlacementAssignment,
  WidgetPlacementZoneId,
  WidgetSettingsValues,
} from './widgetTypes'
import {
  resolveWidgetTitle,
} from './widgetLocalization'
import type { TodoWidgetTranslation } from './todo/translations'
import { isWidgetVisibleForFilter } from './widgetVisibility'
import type { WeatherWidgetTranslation } from './weather/translations'

interface WidgetBoardHostProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  registeredWidgets: RegisteredWidget[]
  activeFilter: FilterId
  activeProfileLabel?: string
  activeViewMode: 'board' | 'settings'
  expandedWidgetId: string | null
  filterOptions: FilterOption[]
  onFilterChange: (filterId: FilterId) => void
  onViewModeChange: (viewMode: 'board' | 'settings') => void
  onExpandedWidgetChange: (widgetId: string | null) => void
  onLogout: () => void
  authPending: boolean

  visibleArrivals: Arrival[]
  visibleAgenda: AgendaItem[]
  visibleTodos: TodoItem[]
  familyMembers: FamilyMember[]
  homeCountryCode: string
  calendarSettings: WidgetSettingsValues
  weatherData: WeatherWidgetData
  weatherRefreshCountdownLabel: string
  commuteNote: string
  renderAudienceBadge: AudienceBadgeRenderer
  onToggleTodoDone: (todoItemId: string, done: boolean) => void
  onCalendarDataChanged: () => void
}

interface WidgetZoneEntry {
  widget: RegisteredWidget
  placement: WidgetPlacementAssignment
}

type WidgetRenderMode = 'grid' | 'expanded'

const buildWidgetBadgeStyle = (widget: RegisteredWidget) =>
  buildBadgeStyle(widget.entity.subwayColor)

const renderEmptyState = (title: string, copy: string, className?: string) => (
  <div className={`empty-state${className ? ` ${className}` : ''}`}>
    <p className="empty-title">{title}</p>
    <p className="empty-copy">{copy}</p>
  </div>
)

const hasMetaContent = (meta: ReactNode) =>
  meta !== null && meta !== undefined && meta !== false && meta !== ''

const formatForecastDayLabel = (
  day: string,
  languageCode: SupportedLanguageCode,
) => {
  const parsedDay = new Date(`${day}T00:00:00`)

  if (Number.isNaN(parsedDay.getTime())) {
    return day
  }

  return new Intl.DateTimeFormat(languageCode, {
    weekday: 'short',
  }).format(parsedDay)
}

export function WidgetBoardHost({
  appText,
  languageCode,
  registeredWidgets,
  activeFilter,
  activeProfileLabel,
  activeViewMode,
  expandedWidgetId,
  filterOptions,
  onFilterChange,
  onViewModeChange,
  onExpandedWidgetChange,
  onLogout,
  authPending,
  visibleArrivals,
  visibleAgenda,
  visibleTodos,
  familyMembers,
  homeCountryCode,
  calendarSettings,
  weatherData,
  weatherRefreshCountdownLabel,
  commuteNote,
  renderAudienceBadge,
  onToggleTodoDone,
  onCalendarDataChanged,
}: WidgetBoardHostProps) {
  const visibleWidgets = registeredWidgets.filter((widget) =>
    isWidgetVisibleForFilter(widget.entity, activeFilter),
  )

  const buildCountryFlag = (countryCode: string) => {
    const normalizedCountryCode = countryCode.trim().toUpperCase()

    if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
      return ''
    }

    return Array.from(normalizedCountryCode)
      .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
      .join('')
  }

  const formatCalendarDayLabel = (date: string) =>
    new Intl.DateTimeFormat(languageCode, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
      .format(new Date(`${date}T00:00:00`))
      .replace(',', '')

  const groupAgendaItemsByDate = (agendaItems: AgendaItem[]) => {
    const dayGroups = new Map<string, AgendaItem[]>()

    for (const agendaItem of agendaItems) {
      const existingItems = dayGroups.get(agendaItem.date) ?? []
      existingItems.push(agendaItem)
      dayGroups.set(agendaItem.date, existingItems)
    }

    return Array.from(dayGroups.entries()).map(([date, items]) => ({
      date,
      items,
    }))
  }

  useEffect(() => {
    if (
      expandedWidgetId &&
      !visibleWidgets.some((widget) => widget.entity.id === expandedWidgetId)
    ) {
      onExpandedWidgetChange(null)
    }
  }, [expandedWidgetId, onExpandedWidgetChange, visibleWidgets])

  const zoneEntries = new Map<WidgetPlacementZoneId, WidgetZoneEntry[]>()

  for (const widget of visibleWidgets) {
    for (const placement of widget.entity.placementZones) {
      const entries = zoneEntries.get(placement.zoneId) ?? []
      entries.push({ widget, placement })
      zoneEntries.set(placement.zoneId, entries)
    }
  }

  const toggleExpandedWidget = (widgetId: string) => {
    onExpandedWidgetChange(expandedWidgetId === widgetId ? null : widgetId)
  }

  const renderExpandControl = (widget: RegisteredWidget) => {
    const isExpanded = expandedWidgetId === widget.entity.id

    return (
      <button
        type="button"
        className={`widget-action-button${isExpanded ? ' is-active' : ''}`}
        aria-label={
          isExpanded
            ? formatLocalizedText(appText.boardHost.collapseAriaLabel, {
                title: resolveWidgetTitle(widget, languageCode),
              })
            : formatLocalizedText(appText.boardHost.expandAriaLabel, {
                title: resolveWidgetTitle(widget, languageCode),
              })
        }
        aria-pressed={isExpanded}
        onClick={() => toggleExpandedWidget(widget.entity.id)}
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
          {isExpanded
            ? appText.boardHost.collapseAction
            : appText.boardHost.expandAction}
        </span>
      </button>
    )
  }

  const renderWidgetFrame = ({
    widget,
    badgeStyle,
    meta,
    mode,
    children,
  }: {
    widget: RegisteredWidget
    badgeStyle: ReturnType<typeof buildWidgetBadgeStyle>
    meta: ReactNode
    mode: WidgetRenderMode
    children: ReactNode
  }) => (
    <article
      className={`widget${mode === 'expanded' ? ' widget--expanded' : ''}${
        expandedWidgetId === widget.entity.id ? ' widget--active' : ''
      }`}
      key={`${widget.entity.id}-${mode}`}
    >
      <div className="widget-head">
        <div className="widget-flag">
          <span className="route-bullet route-bullet--large" style={badgeStyle}>
            {widget.entity.subwayLetter}
          </span>
          <div className="widget-title-stack">
            <h2>{resolveWidgetTitle(widget, languageCode)}</h2>
            {hasMetaContent(meta) ? <p className="widget-meta">{meta}</p> : null}
          </div>
        </div>
        <div className="widget-head-side">{renderExpandControl(widget)}</div>
      </div>

      {children}
    </article>
  )

  const renderWidget = (
    widget: RegisteredWidget,
    mode: WidgetRenderMode = 'grid',
  ) => {
    const badgeStyle = buildWidgetBadgeStyle(widget)

    switch (widget.entity.id) {
      case 'arrival-board': {
        const arrivalBoardWidgetText = widget.module.getTranslation(
          languageCode,
        ) as ArrivalBoardWidgetTranslation
        const arrivalColumnRowCount = Math.ceil(visibleArrivals.length / 2)
        const arrivalColumns = [
          visibleArrivals.slice(0, arrivalColumnRowCount),
          visibleArrivals.slice(arrivalColumnRowCount),
        ].filter((column) => column.length > 0)

        return (
          <article
            className={`widget widget--board${mode === 'expanded' ? ' widget--expanded' : ''}${
              expandedWidgetId === widget.entity.id ? ' widget--active' : ''
            }`}
            key={`${widget.entity.id}-${mode}`}
          >
            <div className="board-head">
              <div className="board-title-group">
                <span className="route-bullet route-bullet--large" style={badgeStyle}>
                  {widget.entity.subwayLetter}
                </span>
                <div>
                  <h2>
                    {activeProfileLabel
                      ? formatLocalizedText(
                          arrivalBoardWidgetText.copy.focusedArrivalsTitle,
                          { name: activeProfileLabel },
                        )
                      : arrivalBoardWidgetText.copy.allArrivalsTitle}
                  </h2>
                </div>
              </div>
              <div className="widget-head-side">
                {renderExpandControl(widget)}
              </div>
            </div>

            <div className="arrival-board">
              {visibleArrivals.length > 0
                ? arrivalColumns.map((column, columnIndex) => (
                    <div className="arrival-board-column" key={`arrival-column-${columnIndex}`}>
                      {column.map((item) => (
                        <article
                          className="arrival-strip"
                          key={`${item.line}-${item.destination}`}
                        >
                          <div className="arrival-route">
                            {renderAudienceBadge(item.members, 'route-bullet--large')}
                            <div className="arrival-destination">
                              <h3>{item.destination}</h3>
                              <p>{`${item.direction} ${item.platform}`.trim()}</p>
                            </div>
                          </div>
                          <div className="arrival-minute-stack">
                            <p className="arrival-count">{item.value}</p>
                            <p className="arrival-unit">{item.unit}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ))
                : renderEmptyState(
                    arrivalBoardWidgetText.copy.noArrivalsTitle,
                    arrivalBoardWidgetText.copy.noArrivalsCopy,
                    'empty-state--board',
                  )}
            </div>
          </article>
        )
      }
      case 'weather': {
        const weatherWidgetText = widget.module.getTranslation(
          languageCode,
        ) as WeatherWidgetTranslation

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: `${weatherData.source} · ${weatherData.location} · ${
            weatherData.stale
              ? weatherWidgetText.copy.statusCached
              : weatherWidgetText.copy.statusLive
          }`,
          mode,
          children: (
            <>
              <div className="weather-summary">
                <div className="weather-hero-stack">
                  <WeatherIcon state={weatherData.visualState} size="hero" />
                  <p className="weather-temp">{weatherData.currentTemperature}</p>
                </div>
                <div className="weather-copy">
                  <p className="weather-note">{commuteNote}</p>
                  <p className="weather-refresh-countdown">{weatherRefreshCountdownLabel}</p>
                  <p className="weather-updated">
                    {weatherWidgetText.copy.updatedPrefix}{' '}
                    {new Intl.DateTimeFormat(languageCode, {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(weatherData.updatedAt))}
                  </p>
                </div>
              </div>

              <div className={`forecast-grid${mode === 'expanded' ? ' forecast-grid--expanded' : ''}`}>
                {weatherData.forecast.map((day) => (
                  <div
                    className={`forecast-card${mode === 'expanded' ? ' forecast-card--expanded' : ''}`}
                    key={day.day}
                  >
                    <div className="forecast-copy-stack">
                      <p className="forecast-day">{formatForecastDayLabel(day.day, languageCode)}</p>
                      <div className="forecast-range" aria-label={`High ${day.high} degrees, low ${day.low} degrees`}>
                        <span>{day.high}°</span>
                        <span className="forecast-range-divider" aria-hidden="true"></span>
                        <span>{day.low}°</span>
                      </div>
                    </div>
                    <div className="forecast-icon-wrap">
                      <WeatherIcon
                        state={day.visualState}
                        size={mode === 'expanded' ? 'forecast-expanded' : 'forecast'}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ),
        })
      }
      case 'calendar': {
        const calendarWidgetText = widget.module.getTranslation(
          languageCode,
        ) as CalendarWidgetTranslation
        const groupedAgendaItems = groupAgendaItemsByDate(visibleAgenda)

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: formatLocalizedText(
            calendarWidgetText.copy.upcomingEventsMeta,
            {
            count: visibleAgenda.length,
            },
          ),
          mode,
          children: (
            <div className="calendar-mini-week">
              {groupedAgendaItems.length > 0
                ? groupedAgendaItems.map((dayGroup) => (
                    <section className="calendar-day-group" key={dayGroup.date}>
                      <p className="calendar-day-heading">{formatCalendarDayLabel(dayGroup.date)}</p>

                      <ul className="agenda-list agenda-list--grouped">
                        {dayGroup.items.map((item) => (
                          <li className="agenda-row" key={`${item.date}-${item.time}-${item.title}`}>
                            <p className="agenda-time">{item.time}</p>
                            <div className="agenda-copy">
                              <p className="agenda-title">{item.title}</p>
                              <p className="agenda-location">
                                {item.isForeign ? (
                                  <span className="agenda-flag" aria-hidden="true">
                                    {buildCountryFlag(item.locationCountry)}
                                  </span>
                                ) : null}
                                <span>{item.location}</span>
                              </p>
                              <p className="agenda-note">{item.note}</p>
                            </div>
                            {renderAudienceBadge(item.members)}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))
                : renderEmptyState(
                    calendarWidgetText.copy.emptyTitle,
                    calendarWidgetText.copy.emptyCopy,
                  )}
            </div>
          ),
        })
      }
      case 'todo': {
        const todoWidgetText = widget.module.getTranslation(
          languageCode,
        ) as TodoWidgetTranslation
        const openTodoCount = visibleTodos.filter((todoItem) => !todoItem.done).length

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: formatLocalizedText(
            todoWidgetText.copy.openItemsMeta,
            {
              count: openTodoCount,
            },
          ),
          mode,
          children: (
            <ul className="todo-list">
              {visibleTodos.length > 0
                ? visibleTodos.map((item) => (
                    <li
                      className={`todo-row${item.done ? ' todo-row--done' : ''}`}
                      key={item.id}
                    >
                      <span
                        className={`todo-status${item.done ? ' todo-status--done' : ''}`}
                        aria-hidden="true"
                      ></span>
                      <div className="todo-copy">
                        <p className={`todo-task${item.done ? ' todo-task--done' : ''}`}>
                          {item.task}
                        </p>
                        <p className="todo-lane">{item.lane}</p>
                      </div>
                      <div className="todo-side">
                        {renderAudienceBadge(item.members)}
                        <button
                          type="button"
                          className="todo-action"
                          onClick={() => onToggleTodoDone(item.id, !item.done)}
                        >
                          {item.done
                            ? todoWidgetText.copy.reopenAction
                            : todoWidgetText.copy.doneAction}
                        </button>
                        <p className="todo-due">{item.due}</p>
                      </div>
                    </li>
                  ))
                : renderEmptyState(
                    todoWidgetText.copy.emptyTitle,
                    todoWidgetText.copy.emptyCopy,
                  )}
            </ul>
          ),
        })
      }
      default:
        return null
    }
  }

  const renderExpandedWidget = (widget: RegisteredWidget) => {
    if (widget.module.renderDetailView) {
      const badgeStyle = buildWidgetBadgeStyle(widget)
      const detailData =
        widget.entity.id === 'weather'
          ? {
              weatherData,
              commuteNote,
              weatherRefreshCountdownLabel,
            }
          : widget.entity.id === 'calendar'
            ? {
                focusedMemberId: activeFilter === 'all' ? null : activeFilter,
                familyMembers,
                homeCountryCode,
                includeHouseholdEvents: Boolean(calendarSettings.includeHouseholdEvents ?? true),
                onCalendarDataChanged,
              }
            : null

      if (!detailData) {
        return renderWidget(widget, 'expanded')
      }

      const detailContent = widget.module.renderDetailView({
        widget,
        data: detailData,
        languageCode,
      })

      if (detailContent) {
        const weatherWidgetText = widget.module.getTranslation?.(
          languageCode,
        ) as WeatherWidgetTranslation | undefined
        const calendarWidgetText = widget.module.getTranslation?.(
          languageCode,
        ) as CalendarWidgetTranslation | undefined

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta:
            widget.entity.id === 'weather'
              ? `${weatherData.source} · ${weatherData.location} · ${
                  weatherData.stale
                    ? weatherWidgetText?.copy.statusCached ?? 'cached'
                    : weatherWidgetText?.copy.statusLive ?? 'live'
                }`
              : widget.entity.id === 'calendar'
                ? formatLocalizedText(
                    calendarWidgetText?.detail.rangeEventCountMeta ?? '{count} events in range',
                    { count: visibleAgenda.length },
                  )
                : null,
          mode: 'expanded',
          children: detailContent,
        })
      }
    }

    return renderWidget(widget, 'expanded')
  }

  const expandedWidget = expandedWidgetId
    ? visibleWidgets.find((widget) => widget.entity.id === expandedWidgetId)
    : undefined

  const serviceBoardEntries = (zoneEntries.get('service-board') ?? []).sort(
    (leftEntry, rightEntry) => leftEntry.placement.order - rightEntry.placement.order,
  )

  const populatedGridZones = widgetGridPlacementZones.flatMap((zone) => {
    const widgetsInZone = (zoneEntries.get(zone.id) ?? []).sort(
      (leftEntry, rightEntry) =>
        leftEntry.placement.order - rightEntry.placement.order,
    )

    return widgetsInZone.length > 0 ? [{ zone, widgetsInZone }] : []
  })

  return (
    <section className="dashboard-grid">
      <section
        className="widget-zone widget-zone--filters"
        aria-label={appText.boardHost.filtersAriaLabel}
      >
        <div className="filter-bar">
          <div
            className="filter-row filter-row--board"
            role="group"
            aria-label={appText.boardHost.filtersAriaLabel}
          >
            {filterOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`filter-pill${option.id === activeFilter ? ' is-active' : ''}`}
                aria-pressed={option.id === activeFilter}
                onClick={() => onFilterChange(option.id)}
              >
                <span className="route-bullet" style={option.style}>
                  {option.badgeText}
                </span>
                <span className="filter-copy">
                  <span className="filter-label">{option.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="filter-actions">
            <button
              type="button"
              className={`terminal-button${activeViewMode === 'board' ? ' is-active' : ''}`}
              onClick={() => onViewModeChange('board')}
            >
              {appText.shell.boardTab}
            </button>
            <button
              type="button"
              className={`terminal-button${activeViewMode === 'settings' ? ' is-active' : ''}`}
              onClick={() => onViewModeChange('settings')}
            >
              {appText.shell.settingsTab}
            </button>
            <button
              type="button"
              className="terminal-button terminal-button--quiet"
              onClick={onLogout}
              disabled={authPending}
            >
              {authPending ? appText.shell.signingOutAction : appText.shell.signOutAction}
            </button>
          </div>
        </div>
      </section>

      <section
        className="widget-zone widget-zone--service-board"
        aria-label={appText.boardHost.serviceBoardZoneLabel}
      >
        {serviceBoardEntries.length > 0
          ? serviceBoardEntries.map((entry) => renderWidget(entry.widget))
          : renderEmptyState(
              appText.boardHost.serviceBoardEmptyTitle,
              appText.boardHost.serviceBoardEmptyCopy,
              'empty-state--board',
            )}
      </section>

      {populatedGridZones.length > 0 ? (
        <section className="widget-grid" aria-label={appText.boardHost.widgetGridAriaLabel}>
          {populatedGridZones.map(({ zone, widgetsInZone }) => (
            <section
              className={zone.className}
              key={zone.id}
              aria-label={formatLocalizedText(appText.boardHost.cellZoneLabel, {
                cellId: zone.id.toUpperCase(),
              })}
            >
              {widgetsInZone.map((entry) => renderWidget(entry.widget))}
            </section>
          ))}
        </section>
      ) : null}

      <section
        className="widget-zone widget-zone--expanded-stage"
        aria-label={appText.boardHost.expandedWidgetViewAriaLabel}
      >
        {expandedWidget
          ? renderExpandedWidget(expandedWidget)
          : renderEmptyState(
              appText.boardHost.noExpandedWidgetTitle,
              appText.boardHost.noExpandedWidgetCopy,
              'empty-state--expanded',
            )}
      </section>
    </section>
  )
}
