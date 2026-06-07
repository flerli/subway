import { useEffect, useState, type ReactNode } from 'react'
import { buildBadgeStyle } from './widgetAppearance'
import type {
  AgendaItem,
  Arrival,
  AudienceBadgeRenderer,
  FilterId,
  FilterOption,
  NewsItem,
  TodoItem,
  WeatherWidgetData,
} from './widgetHostModels'
import {
  widgetGridPlacementZones,
  widgetPlacementZones,
} from './widgetPlacementZones'
import type {
  RegisteredWidget,
  WidgetPlacementAssignment,
  WidgetPlacementZoneId,
} from './widgetTypes'
import { isWidgetVisibleForFilter } from './widgetVisibility'

interface WidgetBoardHostProps {
  registeredWidgets: RegisteredWidget[]
  activeFilter: FilterId
  activeProfileLabel?: string
  filterOptions: FilterOption[]
  onFilterChange: (filterId: FilterId) => void
  visibleArrivals: Arrival[]
  visibleAgenda: AgendaItem[]
  visibleTodos: TodoItem[]
  visibleNews: NewsItem[]
  weatherData: WeatherWidgetData
  currentAgenda: AgendaItem
  currentAlert: NewsItem
  nextTodo: TodoItem
  commuteNote: string
  renderAudienceBadge: AudienceBadgeRenderer
  onToggleTodoDone: (todoItemId: string, done: boolean) => void
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

export function WidgetBoardHost({
  registeredWidgets,
  activeFilter,
  activeProfileLabel,
  filterOptions,
  onFilterChange,
  visibleArrivals,
  visibleAgenda,
  visibleTodos,
  visibleNews,
  weatherData,
  currentAgenda,
  currentAlert,
  nextTodo,
  commuteNote,
  renderAudienceBadge,
  onToggleTodoDone,
}: WidgetBoardHostProps) {
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null)

  const visibleWidgets = registeredWidgets.filter((widget) =>
    isWidgetVisibleForFilter(widget.entity, activeFilter),
  )

  useEffect(() => {
    if (
      expandedWidgetId &&
      !visibleWidgets.some((widget) => widget.entity.id === expandedWidgetId)
    ) {
      setExpandedWidgetId(null)
    }
  }, [expandedWidgetId, visibleWidgets])

  const zoneEntries = new Map<WidgetPlacementZoneId, WidgetZoneEntry[]>()

  for (const widget of visibleWidgets) {
    for (const placement of widget.entity.placementZones) {
      const entries = zoneEntries.get(placement.zoneId) ?? []
      entries.push({ widget, placement })
      zoneEntries.set(placement.zoneId, entries)
    }
  }

  const toggleExpandedWidget = (widgetId: string) => {
    setExpandedWidgetId((currentWidgetId) =>
      currentWidgetId === widgetId ? null : widgetId,
    )
  }

  const renderExpandControl = (widget: RegisteredWidget) => {
    const isExpanded = expandedWidgetId === widget.entity.id

    return (
      <button
        type="button"
        className={`widget-action-button${isExpanded ? ' is-active' : ''}`}
        aria-label={
          isExpanded
            ? `Collapse ${widget.entity.title} expanded view`
            : `Expand ${widget.entity.title} into the lower panel`
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
        <span>{isExpanded ? 'Close' : 'Expand'}</span>
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
            <h2>{widget.entity.title}</h2>
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
      case 'arrival-board':
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
                  <p className="widget-kicker">{widget.presentation.boardKicker}</p>
                  <h2>
                    {activeProfileLabel
                      ? `${activeProfileLabel} arrivals`
                      : 'All household arrivals'}
                  </h2>
                </div>
              </div>
              <div className="board-head-side">
                <p className="board-side-label">Ready next</p>
                <p className="board-side-value">{nextTodo.task}</p>
                <p className="board-side-detail">{nextTodo.due}</p>
                {renderExpandControl(widget)}
              </div>
            </div>

            <div className="arrival-board">
              {visibleArrivals.length > 0
                ? visibleArrivals.map((item) => (
                    <article
                      className="arrival-strip"
                      key={`${item.line}-${item.destination}`}
                    >
                      <div className="arrival-route">
                        {renderAudienceBadge(item.members, 'route-bullet--large')}
                        <div className="arrival-destination">
                          <h3>{item.destination}</h3>
                          <p>
                            {item.direction} · {item.platform}
                          </p>
                        </div>
                      </div>
                      <div className="arrival-minute-stack">
                        <p className="arrival-count">{item.minutes}</p>
                        <p className="arrival-unit">MIN</p>
                      </div>
                    </article>
                  ))
                : renderEmptyState(
                    'No personal arrivals yet',
                    'Add household data sources or switch back to the All filter.',
                    'empty-state--board',
                  )}
            </div>

            <div className="board-footer">
              <div className="happening-now">
                <p className="board-side-label">Happening now</p>
                <p className="happening-copy">
                  {currentAgenda.time} · {currentAgenda.title} · {currentAgenda.location}
                </p>
              </div>

              <div className="alert-inline">
                <span className="alert-dot" aria-hidden="true"></span>
                <p>{currentAlert.headline}</p>
              </div>
            </div>
          </article>
        )
      case 'weather':
        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: `${weatherData.source} · ${weatherData.location} · ${
            weatherData.stale ? 'cached' : 'live'
          }`,
          mode,
          children: (
            <>
              <div className="weather-summary">
                <p className="weather-temp">{weatherData.currentTemperature}</p>
                <div className="weather-copy">
                  <p className="weather-condition">{weatherData.condition}</p>
                  <p className="weather-range">{weatherData.rangeSummary}</p>
                  <p className="weather-note">{commuteNote}</p>
                  <p className="weather-updated">
                    Updated{' '}
                    {new Date(weatherData.updatedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="forecast-grid">
                {weatherData.forecast.map((day) => (
                  <div className="forecast-card" key={day.day}>
                    <p className="forecast-day">{day.day}</p>
                    <p className="forecast-condition">{day.condition}</p>
                    <p className="forecast-range">
                      {day.high}° / {day.low}°
                    </p>
                  </div>
                ))}
              </div>
            </>
          ),
        })
      case 'calendar':
        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: `${visibleAgenda.length} active stops`,
          mode,
          children: (
            <ul className="agenda-list">
              {visibleAgenda.length > 0
                ? visibleAgenda.map((item) => (
                    <li className="agenda-row" key={`${item.time}-${item.title}`}>
                      <p className="agenda-time">{item.time}</p>
                      <div className="agenda-copy">
                        <p className="agenda-title">{item.title}</p>
                        <p className="agenda-location">{item.location}</p>
                        <p className="agenda-note">{item.note}</p>
                      </div>
                      {renderAudienceBadge(item.members)}
                    </li>
                  ))
                : renderEmptyState(
                    'No calendar items',
                    'This widget is hidden until its scope matches the active focused member.',
                  )}
            </ul>
          ),
        })
      case 'todo':
        const openTodoCount = visibleTodos.filter((todoItem) => !todoItem.done).length

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: `${openTodoCount} open items`,
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
                          {item.done ? 'Reopen' : 'Done'}
                        </button>
                        <p className="todo-due">{item.due}</p>
                      </div>
                    </li>
                  ))
                : renderEmptyState(
                    'No tasks in scope',
                    'This widget is assigned to another focused member in the current sample setup.',
                  )}
            </ul>
          ),
        })
      case 'bulletins':
        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: 'Filtered by member color and initial',
          mode,
          children: (
            <div className="news-list">
              {visibleNews.length > 0
                ? visibleNews.map((item) => (
                    <article className="news-card" key={`${item.source}-${item.headline}`}>
                      <div className="news-meta">
                        {renderAudienceBadge(item.members)}
                        <p>{item.source}</p>
                        <p>{item.eta}</p>
                      </div>
                      <h3>{item.headline}</h3>
                      <p>{item.summary}</p>
                    </article>
                  ))
                : renderEmptyState(
                    'No bulletins in scope',
                    'This zone hides widgets whose configured member scope does not include the active focus.',
                  )}
            </div>
          ),
        })
      default:
        return null
    }
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
      <section className="widget-zone widget-zone--filters" aria-label="Household filters">
        <div className="filter-row filter-row--board" role="group" aria-label="Household filters">
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
      </section>

      <section
        className="widget-zone widget-zone--service-board"
        aria-label={widgetPlacementZones[0].label}
      >
        {serviceBoardEntries.length > 0
          ? serviceBoardEntries.map((entry) => renderWidget(entry.widget))
          : renderEmptyState(
              'Family service board is empty',
              'Assign the arrival board to the Family service board zone in settings.',
              'empty-state--board',
            )}
      </section>

      {populatedGridZones.length > 0 ? (
        <section className="widget-grid" aria-label="Two-column widget grid">
          {populatedGridZones.map(({ zone, widgetsInZone }) => (
            <section className={zone.className} key={zone.id} aria-label={zone.label}>
              {widgetsInZone.map((entry) => renderWidget(entry.widget))}
            </section>
          ))}
        </section>
      ) : null}

      <section className="widget-zone widget-zone--expanded-stage" aria-label="Expanded widget view">
        <div className="widget-stage-head">
          <div>
            <p className="widget-kicker">Extended view</p>
            <h2>{expandedWidget ? expandedWidget.entity.title : 'Lower focus stage'}</h2>
          </div>
        </div>

        {expandedWidget
          ? renderWidget(expandedWidget, 'expanded')
          : renderEmptyState(
              'No widget selected',
              'The lower section stays reserved for an expanded widget view.',
              'empty-state--expanded',
            )}
      </section>
    </section>
  )
}
