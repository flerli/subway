import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AppTextBundle } from '../i18n/appText'
import type {
  AssistantAvailabilityRecord,
  AssistantToolApprovalAction,
  AssistantMessageEventRecord,
  AssistantMessageRecord,
  AssistantThreadDetail,
  AssistantThreadSummary,
} from '../api/assistant'
import {
  formatLocalizedText,
  type SupportedLanguageCode,
} from '../i18n/localization'
import { buildBadgeStyle } from './widgetAppearance'
import { AudioVisualWidget } from './audio-visual/AudioVisualWidget'
import type { AudioVisualWidgetTranslation } from './audio-visual/translations'
import type { ArrivalBoardWidgetTranslation } from './arrival-board/translations'
import type { CalendarWidgetTranslation } from './calendar/translations'
import type {
  AgendaItem,
  Arrival,
  AudienceBadgeRenderer,
  BringWidgetData,
  FamilyMember,
  FilterId,
  FilterOption,
  TodoItem,
  WeatherWidgetData,
} from './widgetHostModels'
import { WeatherIcon } from './weather/WeatherIcon'
import { WeatherForecastPlot } from './weather/WeatherForecastPlot'
import type {
  RegisteredWidget,
  WidgetPlacementAssignment,
  WidgetPlacementZoneId,
  WidgetSettingsValues,
} from './widgetTypes'
import { AssistantCompactCard } from './assistant/AssistantCompactCard'
import {
  resolveWidgetTitle,
} from './widgetLocalization'
import { widgetGridPlacementZones } from './widgetPlacementZones'
import type { TodoWidgetTranslation } from './todo/translations'
import type { BringWidgetTranslation } from './bring/translations'
import { UiBenchmarkPanel } from './ui-benchmark/UiBenchmarkPanel'
import type { UiBenchmarkWidgetTranslation } from './ui-benchmark/translations'
import { YoutubeCompactView } from './youtube/YoutubeCompactView'
import type { YoutubeWidgetTranslation } from './youtube/translations'
import { searchYoutubeVideos, type YoutubeVideo } from './youtube/youtubeApi'
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
  bringData: BringWidgetData
  familyMembers: FamilyMember[]
  homeCountryCode: string
  calendarSettings: WidgetSettingsValues
  widgetSettingsMap: Record<string, WidgetSettingsValues>
  weatherData: WeatherWidgetData
  focusedCalendarEventId: string | null
  focusedCalendarEventDate: string | null
  onBringRefresh: () => Promise<unknown>
  onBringCreateItem: (input: { itemName: string; specification: string }) => Promise<unknown>
  onBringUpdateItem: (input: {
    itemName: string
    specification: string
    itemUuid?: string
  }) => Promise<unknown>
  onBringDeleteItem: (input: { itemName: string; itemUuid?: string }) => Promise<unknown>
  onBringCompleteItem: (input: {
    itemName: string
    specification: string
    itemUuid?: string
  }) => Promise<unknown>
  renderAudienceBadge: AudienceBadgeRenderer
  onToggleTodoDone: (todoItemId: string, done: boolean) => void
  onCalendarDataChanged: () => void
  onOpenCalendarEvent: (selection: { eventId: string; eventDate: string }) => void
  onSaveWidgetSettings: (
    widgetId: string,
    settings: WidgetSettingsValues,
  ) => Promise<void>
  assistantState: {
    availability: AssistantAvailabilityRecord
    threads: AssistantThreadSummary[]
    selectedThreadId: string | null
    selectedThread: AssistantThreadDetail | null
    loading: boolean
    detailLoading: boolean
    creatingThread: boolean
    error: string | null
    draft: string
    turnState: 'idle' | 'sending' | 'streaming' | 'completed' | 'failed'
    turnError: string | null
    pendingUserMessage: AssistantMessageRecord | null
    streamingMessage: AssistantMessageRecord | null
    streamingEvents: AssistantMessageEventRecord[]
    resolvingApprovalRequestId: string | null
    isTurnBusy: boolean
  }
  assistantActions: {
    onCreateThread: () => void
    onDeleteThread: (threadId: string) => void
    onSelectThread: (threadId: string) => void
    onDraftChange: (value: string) => void
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
    onComposerKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
    onResolveToolApproval: (
      approvalRequestId: string,
      action: AssistantToolApprovalAction,
    ) => void
  }
}

interface WidgetZoneEntry {
  widget: RegisteredWidget
  placement: WidgetPlacementAssignment
}

type GridZoneId = Exclude<WidgetPlacementZoneId, 'service-board'>

interface GridPlacementAssignment extends WidgetPlacementAssignment {
  zoneId: GridZoneId
}

interface GridCellPosition {
  row: number
  col: number
}

interface WidgetGridBlock {
  widget: RegisteredWidget
  zoneIds: GridZoneId[]
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
  order: number
}

type WidgetRenderMode = 'grid' | 'expanded'

const isGridZoneId = (zoneId: WidgetPlacementZoneId): zoneId is GridZoneId =>
  zoneId !== 'service-board'

const isGridPlacementAssignment = (
  placement: WidgetPlacementAssignment,
): placement is GridPlacementAssignment => isGridZoneId(placement.zoneId)

const getGridCellPosition = (zoneId: GridZoneId): GridCellPosition => ({
  col: zoneId[0] === 'a' ? 1 : 2,
  row: Number(zoneId[1]),
})

const areCellsNeighboring = (leftCell: GridZoneId, rightCell: GridZoneId) => {
  const leftPosition = getGridCellPosition(leftCell)
  const rightPosition = getGridCellPosition(rightCell)

  return (
    Math.abs(leftPosition.row - rightPosition.row) +
      Math.abs(leftPosition.col - rightPosition.col) ===
    1
  )
}

const toZoneKey = (row: number, col: number) => `${row}:${col}`

const buildMergedGridBlocks = (
  widget: RegisteredWidget,
  placements: WidgetPlacementAssignment[],
): WidgetGridBlock[] => {
  const sortedGridPlacements = placements
    .filter(isGridPlacementAssignment)
    .sort((left, right) => left.order - right.order)

  if (sortedGridPlacements.length === 0) {
    return []
  }

  const placementsByZoneId = new Map<GridZoneId, WidgetPlacementAssignment>()
  for (const placement of sortedGridPlacements) {
    placementsByZoneId.set(placement.zoneId, placement)
  }

  const unvisited = new Set<GridZoneId>(
    sortedGridPlacements.map((placement) => placement.zoneId),
  )
  const mergedBlocks: WidgetGridBlock[] = []

  while (unvisited.size > 0) {
    const [seedZoneId] = unvisited

    if (!seedZoneId) {
      break
    }

    const stack: GridZoneId[] = [seedZoneId]
    const componentZoneIds: GridZoneId[] = []
    unvisited.delete(seedZoneId)

    while (stack.length > 0) {
      const currentZoneId = stack.pop()

      if (!currentZoneId) {
        continue
      }

      componentZoneIds.push(currentZoneId)

      for (const candidateZoneId of Array.from(unvisited)) {
        if (areCellsNeighboring(currentZoneId, candidateZoneId)) {
          unvisited.delete(candidateZoneId)
          stack.push(candidateZoneId)
        }
      }
    }

    const componentPositions = componentZoneIds.map((zoneId) =>
      getGridCellPosition(zoneId),
    )
    const minRow = Math.min(...componentPositions.map((position) => position.row))
    const maxRow = Math.max(...componentPositions.map((position) => position.row))
    const minCol = Math.min(...componentPositions.map((position) => position.col))
    const maxCol = Math.max(...componentPositions.map((position) => position.col))
    const componentZoneKeys = new Set(
      componentPositions.map((position) => toZoneKey(position.row, position.col)),
    )

    const rectangleZoneIds: GridZoneId[] = []
    const rectangleZoneKeys: string[] = []

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        rectangleZoneKeys.push(toZoneKey(row, col))
      }
    }

    const isPerfectRectangle = rectangleZoneKeys.every((zoneKey) =>
      componentZoneKeys.has(zoneKey),
    )

    if (!isPerfectRectangle) {
      for (const zoneId of componentZoneIds) {
        const placement = placementsByZoneId.get(zoneId)
        rectangleZoneIds.push(zoneId)
        mergedBlocks.push({
          widget,
          zoneIds: [zoneId],
          rowStart: getGridCellPosition(zoneId).row,
          rowEnd: getGridCellPosition(zoneId).row,
          colStart: getGridCellPosition(zoneId).col,
          colEnd: getGridCellPosition(zoneId).col,
          order: placement?.order ?? 1,
        })
      }
      continue
    }

    const rectangleComponentZoneIds = [...componentZoneIds].sort((left, right) => {
      const leftPosition = getGridCellPosition(left)
      const rightPosition = getGridCellPosition(right)
      return leftPosition.row - rightPosition.row || leftPosition.col - rightPosition.col
    })

    const order = Math.min(
      ...rectangleComponentZoneIds.map(
        (zoneId) => placementsByZoneId.get(zoneId)?.order ?? 1,
      ),
    )

    mergedBlocks.push({
      widget,
      zoneIds: rectangleComponentZoneIds,
      rowStart: minRow,
      rowEnd: maxRow,
      colStart: minCol,
      colEnd: maxCol,
      order,
    })
  }

  return mergedBlocks
}

const buildWidgetBadgeStyle = (widget: RegisteredWidget) =>
  buildBadgeStyle(widget.entity.subwayColor)

const renderEmptyState = (title: string, copy: string, className?: string) => (
  <div className={`empty-state${className ? ` ${className}` : ''}`}>
    <p className="empty-title">{title}</p>
    <p className="empty-copy">{copy}</p>
  </div>
)

export function WidgetBoardHost({
  appText,
  languageCode,
  registeredWidgets,
  activeFilter,
  activeProfileLabel,
  activeViewMode: _activeViewMode,
  expandedWidgetId,
  filterOptions: _filterOptions,
  onFilterChange: _onFilterChange,
  onViewModeChange,
  onExpandedWidgetChange,
  onLogout: _onLogout,
  authPending: _authPending,
  visibleArrivals,
  visibleAgenda,
  visibleTodos,
  bringData,
  familyMembers,
  homeCountryCode,
  calendarSettings,
  widgetSettingsMap,
  weatherData,
  focusedCalendarEventId,
  focusedCalendarEventDate,
  onBringRefresh,
  onBringCreateItem,
  onBringUpdateItem,
  onBringDeleteItem,
  onBringCompleteItem,
  renderAudienceBadge,
  onToggleTodoDone,
  onCalendarDataChanged,
  onOpenCalendarEvent,
  onSaveWidgetSettings,
  assistantState,
  assistantActions,
}: WidgetBoardHostProps) {
  const [bringMiniRefreshPending, setBringMiniRefreshPending] = useState(false)
  const [youtubeQuery, setYoutubeQuery] = useState('')
  const [youtubeResults, setYoutubeResults] = useState<YoutubeVideo[]>([])
  const [youtubeSelectedVideoId, setYoutubeSelectedVideoId] = useState<string | null>(null)
  const [youtubeSearchPanelOpen, setYoutubeSearchPanelOpen] = useState(false)
  const [youtubeIsSearching, setYoutubeIsSearching] = useState(false)
  const [youtubeIsFullscreen, setYoutubeIsFullscreen] = useState(false)

  const selectedYoutubeIndex = useMemo(
    () =>
      youtubeSelectedVideoId
        ? youtubeResults.findIndex((video) => video.id === youtubeSelectedVideoId)
        : -1,
    [youtubeResults, youtubeSelectedVideoId],
  )

  const handleYoutubeSearch = useCallback(async () => {
    const normalizedQuery = youtubeQuery.trim()

    if (!normalizedQuery) {
      setYoutubeResults([])
      setYoutubeSelectedVideoId(null)
      return
    }

    setYoutubeIsSearching(true)
    try {
      const result = await searchYoutubeVideos(normalizedQuery)
      setYoutubeResults(result.videos)

      if (result.videos.length > 0) {
        setYoutubeSelectedVideoId((currentSelectedVideoId) => {
          const currentStillExists = result.videos.some(
            (video) => video.id === currentSelectedVideoId,
          )
          return currentStillExists ? currentSelectedVideoId : result.videos[0]?.id ?? null
        })
      } else {
        setYoutubeSelectedVideoId(null)
      }
      setYoutubeSearchPanelOpen(true)
    } catch {
      setYoutubeResults([])
      setYoutubeSelectedVideoId(null)
    } finally {
      setYoutubeIsSearching(false)
    }
  }, [youtubeQuery])

  const selectYoutubeResultAt = useCallback(
    (index: number) => {
      const candidate = youtubeResults[index]
      if (!candidate) return
      setYoutubeSelectedVideoId(candidate.id)
      setYoutubeSearchPanelOpen(false)
    },
    [youtubeResults],
  )

  const handleSelectPreviousYoutubeResult = useCallback(() => {
    if (selectedYoutubeIndex > 0) {
      selectYoutubeResultAt(selectedYoutubeIndex - 1)
    }
  }, [selectedYoutubeIndex, selectYoutubeResultAt])

  const handleSelectNextYoutubeResult = useCallback(() => {
    if (selectedYoutubeIndex >= 0 && selectedYoutubeIndex < youtubeResults.length - 1) {
      selectYoutubeResultAt(selectedYoutubeIndex + 1)
    }
  }, [selectedYoutubeIndex, selectYoutubeResultAt, youtubeResults.length])

  const toggleYoutubeFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Ignore fullscreen errors
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setYoutubeIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

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
        className={`widget-action-button widget-action-button--icon-only${isExpanded ? ' is-active' : ''}`}
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
      </button>
    )
  }

  const renderWidgetFrame = ({
    widget,
    badgeStyle,
    meta: _meta,
    mode,
    children,
  }: {
    widget: RegisteredWidget
    badgeStyle: ReturnType<typeof buildWidgetBadgeStyle>
    meta?: ReactNode
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
                          className={`arrival-strip${item.isSameDay ? ' arrival-strip--same-day' : ''}${item.cancelled ? ' is-cancelled' : ''}`}
                          key={`${item.line}-${item.destination}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            onOpenCalendarEvent({
                              eventId: item.eventId,
                              eventDate: item.eventDate,
                            })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onOpenCalendarEvent({
                                eventId: item.eventId,
                                eventDate: item.eventDate,
                              })
                            }
                          }}
                        >
                          <div className="arrival-route">
                            {renderAudienceBadge(item.members, 'route-bullet--large')}
                            <div className="arrival-destination">
                              <h3>{item.destination}</h3>
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
                  <p className="weather-updated">
                    {weatherWidgetText.copy.updatedPrefix}{' '}
                    {new Intl.DateTimeFormat(languageCode, {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(weatherData.updatedAt))}
                  </p>
                </div>
              </div>

              <WeatherForecastPlot
                currentTemperature={weatherData.currentTemperature}
                forecast={weatherData.forecast}
                languageCode={languageCode}
                size={mode === 'expanded' ? 'detail' : 'compact'}
              />
            </>
          ),
        })
      }
      case 'calendar': {
        const calendarWidgetText = widget.module.getTranslation(
          languageCode,
        ) as CalendarWidgetTranslation
        const groupedAgendaItems = groupAgendaItemsByDate(visibleAgenda)
        const familyMembersById = new Map(familyMembers.map((member) => [member.id, member]))
        
        const getMemberColorStyle = (memberIds: readonly string[]): React.CSSProperties => {
          const validMembers = memberIds.filter(
            (m) => m !== '*' && familyMembersById.has(m),
          )
          
          if (validMembers.length === 0) return {}
          if (validMembers.length === 1) {
            const member = familyMembersById.get(validMembers[0])
            if (!member) return {}
            const hex = member.color.slice(1)
            const r = parseInt(hex.slice(0, 2), 16)
            const g = parseInt(hex.slice(2, 4), 16)
            const b = parseInt(hex.slice(4, 6), 16)
            return { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)` }
          }

          // Multiple members: create gradient
          const colors = validMembers
            .slice(0, 3)
            .map((memberId) => {
              const member = familyMembersById.get(memberId)
              if (!member) return null
              return member.color
            })
            .filter((color): color is string => color !== null)

          if (colors.length === 0) return {}

          const gradientStops = colors
            .map((color, index) => {
              const hex = color.slice(1)
              const r = parseInt(hex.slice(0, 2), 16)
              const g = parseInt(hex.slice(2, 4), 16)
              const b = parseInt(hex.slice(4, 6), 16)
              const percentage = (index / (colors.length - 1)) * 100
              return `rgba(${r}, ${g}, ${b}, 0.15) ${percentage}%`
            })
            .join(', ')

          return { background: `linear-gradient(135deg, ${gradientStops})` }
        }

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
                          <li 
                            className={`agenda-row agenda-row--clickable${item.cancelled ? ' is-cancelled' : ''}`}
                            key={`${item.date}-${item.time}-${item.title}`}
                            style={getMemberColorStyle(item.members)}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              onOpenCalendarEvent({
                                eventId: item.eventId,
                                eventDate: item.date,
                              })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                onOpenCalendarEvent({
                                  eventId: item.eventId,
                                  eventDate: item.date,
                                })
                              }
                            }}
                          >
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
      case 'bring': {
        const bringWidgetText = widget.module.getTranslation(
          languageCode,
        ) as BringWidgetTranslation
        const bringList = bringData.list
        const handleBringMiniRefresh = async () => {
          setBringMiniRefreshPending(true)

          try {
            await onBringRefresh()
          } finally {
            setBringMiniRefreshPending(false)
          }
        }
        const bringMeta =
          bringData.status === 'ready' && bringList
            ? `${formatLocalizedText(bringWidgetText.copy.openItemsMeta, {
                count: bringList.openItemCount,
              })}${bringList.freshness === 'stale' ? ` · ${bringWidgetText.copy.staleMeta}` : ''}`
            : bringData.status === 'not-configured'
              ? bringWidgetText.copy.notConfiguredTitle
              : null

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: bringMeta,
          mode,
          children:
            bringData.status === 'loading' ? (
              renderEmptyState(
                bringWidgetText.copy.loadingTitle,
                bringWidgetText.copy.loadingCopy,
              )
            ) : bringData.status === 'not-configured' ? (
              renderEmptyState(
                bringWidgetText.copy.notConfiguredTitle,
                bringData.message ?? bringWidgetText.copy.notConfiguredCopy,
              )
            ) : bringData.status === 'error' ? (
              renderEmptyState(
                bringWidgetText.copy.unavailableTitle,
                bringData.message ?? bringWidgetText.copy.unavailableCopy,
              )
            ) : !bringList || bringList.openItems.length === 0 ? (
              renderEmptyState(
                bringWidgetText.copy.emptyTitle,
                bringWidgetText.copy.emptyCopy,
              )
            ) : (
              <div className="bring-widget-shell">
                <div className="bring-widget-toolbar">
                  {bringList.freshness === 'stale' ? (
                    <p className="bring-state-banner">{bringWidgetText.copy.staleMeta}</p>
                  ) : <span />}
                  <button
                    type="button"
                    className="bring-detail-action bring-mini-refresh-action"
                    disabled={bringMiniRefreshPending}
                    onClick={() => {
                      void handleBringMiniRefresh()
                    }}
                  >
                    {bringMiniRefreshPending
                      ? bringWidgetText.detail.refreshingState
                      : bringWidgetText.detail.refreshAction}
                  </button>
                </div>

                <ul className="bring-list">
                  {[...bringList.openItems]
                    .sort((left, right) => {
                      const leftTimestamp = Date.parse(left.recentAt)
                      const rightTimestamp = Date.parse(right.recentAt)

                      if (!Number.isNaN(leftTimestamp) && !Number.isNaN(rightTimestamp)) {
                        return rightTimestamp - leftTimestamp
                      }

                      if (!Number.isNaN(rightTimestamp)) {
                        return 1
                      }

                      if (!Number.isNaN(leftTimestamp)) {
                        return -1
                      }

                      return 0
                    })
                    .map((item) => (
                    <li
                      className="bring-row"
                      key={item.uuid || `${item.itemName}-${item.specification}`}
                    >
                      <div className="bring-copy">
                        <p className="bring-item-name">{item.itemName}</p>
                        {item.category ? (
                          <p className="bring-item-category">{item.category}</p>
                        ) : null}
                        {item.specification ? (
                          <p className="bring-item-specification">{item.specification}</p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="bring-recent-hint">{bringWidgetText.copy.recentHint}</p>
              </div>
            ),
        })
      }
      case 'ui-benchmark': {
        const uiBenchmarkWidgetText = widget.module.getTranslation(
          languageCode,
        ) as UiBenchmarkWidgetTranslation

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: uiBenchmarkWidgetText.copy.benchmarkMeta,
          mode,
          children: (
            <UiBenchmarkPanel mode={mode} widgetText={uiBenchmarkWidgetText} />
          ),
        })
      }
      case 'audio-visual': {
        const audioVisualWidgetText = widget.module.getTranslation(
          languageCode,
        ) as AudioVisualWidgetTranslation

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: audioVisualWidgetText.copy.history,
          mode,
          children: (
            <AudioVisualWidget
              mode={mode}
              languageCode={languageCode}
              widgetText={audioVisualWidgetText}
              initialSettings={widgetSettingsMap['audio-visual'] ?? {}}
              onSaveSettings={onSaveWidgetSettings}
            />
          ),
        })
      }
      case 'assistant': {
        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta:
            assistantState.availability.status === 'available'
              ? assistantState.availability.activeRoute?.label ?? null
              : assistantState.error,
          mode,
          children: (
            <AssistantCompactCard
              appText={appText}
              threads={assistantState.threads}
              selectedThread={assistantState.selectedThread}
            />
          ),
        })
      }
      case 'youtube': {
        const youtubeWidgetText = widget.module.getTranslation(
          languageCode,
        ) as YoutubeWidgetTranslation
        const selectedYoutubeTitle =
          youtubeResults.find((video) => video.id === youtubeSelectedVideoId)?.title ??
          ''

        return renderWidgetFrame({
          widget,
          badgeStyle,
          meta: null,
          mode,
          children: (
            <YoutubeCompactView
              query={youtubeQuery}
              selectedVideoId={youtubeSelectedVideoId}
              selectedVideoTitle={selectedYoutubeTitle}
              searchPanelOpen={youtubeSearchPanelOpen}
              isSearching={youtubeIsSearching}
              canSelectPrevious={selectedYoutubeIndex > 0}
              canSelectNext={
                selectedYoutubeIndex >= 0 &&
                selectedYoutubeIndex < youtubeResults.length - 1
              }
              onQueryChange={setYoutubeQuery}
              onSearch={handleYoutubeSearch}
              onToggleSearchPanel={() =>
                setYoutubeSearchPanelOpen((currentValue) => !currentValue)
              }
              onSelectPrevious={handleSelectPreviousYoutubeResult}
              onSelectNext={handleSelectNextYoutubeResult}
              onToggleFullscreen={toggleYoutubeFullscreen}
              searchResults={youtubeResults}
              widgetText={youtubeWidgetText}
            />
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
            }
          : widget.entity.id === 'calendar'
            ? {
                focusedMemberId: activeFilter === 'all' ? null : activeFilter,
                familyMembers,
                homeCountryCode,
                includeHouseholdEvents: Boolean(calendarSettings.includeHouseholdEvents ?? true),
                onCalendarDataChanged,
                focusedEventId: focusedCalendarEventId,
                focusedEventDate: focusedCalendarEventDate,
              }
            : widget.entity.id === 'bring'
              ? {
                  bringData,
                  onRefresh: onBringRefresh,
                  onCreateItem: onBringCreateItem,
                  onUpdateItem: onBringUpdateItem,
                  onDeleteItem: onBringDeleteItem,
                  onCompleteItem: onBringCompleteItem,
                  onOpenSettings: () => onViewModeChange('settings'),
                }
            : widget.entity.id === 'youtube'
              ? {
                  query: youtubeQuery,
                  results: youtubeResults,
                  selectedVideoId: youtubeSelectedVideoId,
                  searchPanelOpen: youtubeSearchPanelOpen,
                  isSearching: youtubeIsSearching,
                  isFullscreen: youtubeIsFullscreen,
                  canSelectPrevious: selectedYoutubeIndex > 0,
                  canSelectNext:
                    selectedYoutubeIndex >= 0 &&
                    selectedYoutubeIndex < youtubeResults.length - 1,
                  onQueryChange: setYoutubeQuery,
                  onSearch: handleYoutubeSearch,
                  onToggleSearchPanel: () =>
                    setYoutubeSearchPanelOpen((currentValue) => !currentValue),
                  onSelectVideo: (videoId: string) => {
                    setYoutubeSelectedVideoId(videoId)
                    setYoutubeSearchPanelOpen(false)
                  },
                  onSelectPrevious: handleSelectPreviousYoutubeResult,
                  onSelectNext: handleSelectNextYoutubeResult,
                  onToggleFullscreen: toggleYoutubeFullscreen,
                }
              : widget.entity.id === 'assistant'
                ? {
                    appText,
                    availability: assistantState.availability,
                    threads: assistantState.threads,
                    selectedThreadId: assistantState.selectedThreadId,
                    selectedThread: assistantState.selectedThread,
                    loading: assistantState.loading,
                    detailLoading: assistantState.detailLoading,
                    creatingThread: assistantState.creatingThread,
                    error: assistantState.error,
                    draft: assistantState.draft,
                    turnState: assistantState.turnState,
                    turnError: assistantState.turnError,
                    pendingUserMessage: assistantState.pendingUserMessage,
                    streamingMessage: assistantState.streamingMessage,
                    streamingEvents: assistantState.streamingEvents,
                    resolvingApprovalRequestId: assistantState.resolvingApprovalRequestId,
                    isTurnBusy: assistantState.isTurnBusy,
                    onCreateThread: assistantActions.onCreateThread,
                    onDeleteThread: assistantActions.onDeleteThread,
                    onSelectThread: assistantActions.onSelectThread,
                    onDraftChange: assistantActions.onDraftChange,
                    onSubmit: assistantActions.onSubmit,
                    onComposerKeyDown: assistantActions.onComposerKeyDown,
                    onResolveToolApproval: assistantActions.onResolveToolApproval,
                  }
              : null

      if (!detailData) {
        return renderWidget(widget, 'expanded')
      }

      const detailContent = widget.module.renderDetailView({
        appText,
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
        const bringWidgetText = widget.module.getTranslation?.(
          languageCode,
        ) as BringWidgetTranslation | undefined
        const assistantWidgetText = widget.module.getTranslation?.(
          languageCode,
        ) as { title: string } | undefined

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
                : widget.entity.id === 'bring'
                  ? bringData.list
                    ? `${formatLocalizedText(
                        bringWidgetText?.copy.openItemsMeta ?? '{count} open shopping items',
                        { count: bringData.list.openItemCount },
                      )}${bringData.list.freshness === 'stale' ? ` · ${bringWidgetText?.copy.staleMeta ?? 'cached'}` : ''}`
                    : bringData.status === 'not-configured'
                      ? bringWidgetText?.copy.notConfiguredTitle ?? null
                      : null
                : widget.entity.id === 'assistant'
                  ? assistantState.selectedThread?.title || assistantWidgetText?.title || null
                : widget.entity.id === 'youtube'
                  ? null
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

  const populatedGridBlocks = visibleWidgets
    .flatMap((widget) => buildMergedGridBlocks(widget, widget.entity.placementZones))
    .sort((leftBlock, rightBlock) =>
      leftBlock.rowStart - rightBlock.rowStart ||
      leftBlock.colStart - rightBlock.colStart ||
      leftBlock.order - rightBlock.order,
    )

  const occupiedGridZoneIds = new Set<GridZoneId>(
    populatedGridBlocks.flatMap((gridBlock) => gridBlock.zoneIds),
  )

  const emptyGridZones = widgetGridPlacementZones.filter((zone) => {
    if (!isGridZoneId(zone.id)) {
      return false
    }

    return !occupiedGridZoneIds.has(zone.id)
  }) as Array<typeof widgetGridPlacementZones[number] & { id: GridZoneId }>

  return (
    <section className="dashboard-grid">
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

      <section className="widget-grid" aria-label={appText.boardHost.widgetGridAriaLabel}>
        {populatedGridBlocks.map((gridBlock) => (
          <section
            className="widget-zone widget-zone--cell"
            key={`${gridBlock.widget.entity.id}-${gridBlock.zoneIds.join('-')}`}
            style={{
              gridColumn: `${gridBlock.colStart} / ${gridBlock.colEnd + 1}`,
              gridRow: `${gridBlock.rowStart} / ${gridBlock.rowEnd + 1}`,
            }}
            aria-label={formatLocalizedText(appText.boardHost.cellZoneLabel, {
              cellId: gridBlock.zoneIds
                .map((zoneId) => zoneId.toUpperCase())
                .join(' + '),
            })}
          >
            {renderWidget(gridBlock.widget)}
          </section>
        ))}

        {emptyGridZones.map((zone) => {
          const cellPosition = getGridCellPosition(zone.id)

          return (
            <section
              className="widget-zone widget-zone--cell widget-zone--cell-empty"
              key={`empty-${zone.id}`}
              style={{
                gridColumn: `${cellPosition.col} / ${cellPosition.col + 1}`,
                gridRow: `${cellPosition.row} / ${cellPosition.row + 1}`,
              }}
              aria-label={formatLocalizedText(appText.boardHost.cellZoneLabel, {
                cellId: zone.id.toUpperCase(),
              })}
            />
          )
        })}
      </section>

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
