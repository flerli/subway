import type { AppTextBundle } from '../i18n/appText'
import {
  formatLocalizedText,
  type SupportedLanguageCode,
} from '../i18n/localization'
import { buildBadgeStyle } from './widgetAppearance'
import { isWidgetVisibleForFilter } from './widgetVisibility'
import type { FilterId } from './widgetHostModels'
import type { RegisteredWidget, WidgetHealthState } from './widgetTypes'
import { resolveWidgetTitle } from './widgetLocalization'

interface WidgetDebugOverlayProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  registeredWidgets: RegisteredWidget[]
  activeFilter: FilterId
  widgetHealthMap: Record<string, WidgetHealthState>
  performanceState: WidgetDebugPerformanceState
  onClose: () => void
}

export interface WidgetDebugPerformanceState {
  interactionLabel: string | null
  interactionDurationMs: number | null
  interactionMeasuredAt: string | null
  longTaskCount: number
  longestLongTaskMs: number | null
  lastLongTaskAt: string | null
}

const formatScopeLabel = (widget: RegisteredWidget, appText: AppTextBundle) => {
  const { mode, memberIds } = widget.entity.userScope

  if (mode === 'all') {
    return appText.debug.allMembersScope
  }

  if (mode === 'member') {
    return formatLocalizedText(appText.debug.memberScope, {
      memberId: memberIds[0] ?? appText.debug.notAvailableValue,
    })
  }

  return formatLocalizedText(appText.debug.membersScope, {
    memberIds: memberIds.join(', '),
  })
}

const formatRefreshLabel = (
  widgetId: string,
  widgetHealthMap: Record<string, WidgetHealthState>,
  appText: AppTextBundle,
) => {
  const state = widgetHealthMap[widgetId]

  if (!state) {
    return appText.debug.refreshStatusIdle
  }

  switch (state.refreshStatus) {
    case 'ok':
      return appText.debug.refreshStatusOk
    case 'live':
      return appText.debug.refreshStatusLive
    case 'cached':
      return appText.debug.refreshStatusCached
    case 'static':
      return appText.debug.refreshStatusStatic
    case 'error':
      return appText.debug.refreshStatusError
    default:
      return appText.debug.refreshStatusIdle
  }
}

const formatFailureLabel = (
  failureState: string | undefined,
  appText: AppTextBundle,
) => {
  if (!failureState) {
    return appText.debug.noneValue
  }

  return Object.prototype.hasOwnProperty.call(appText.messages, failureState)
    ? appText.messages[failureState as keyof AppTextBundle['messages']]
    : failureState
}

const formatMetricDuration = (
  value: number | null,
  appText: AppTextBundle,
) => (value === null ? appText.debug.notAvailableValue : `${value.toFixed(1)} ms`)

const formatMetricTimestamp = (
  value: string | null,
  languageCode: SupportedLanguageCode,
  appText: AppTextBundle,
) => {
  if (!value) {
    return appText.debug.notAvailableValue
  }

  return new Intl.DateTimeFormat(languageCode, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function WidgetDebugOverlay({
  appText,
  languageCode,
  registeredWidgets,
  activeFilter,
  widgetHealthMap,
  performanceState,
  onClose,
}: WidgetDebugOverlayProps) {
  return (
    <div className="debug-overlay-backdrop" role="dialog" aria-modal="true">
      <section className="debug-overlay-panel">
        <div className="debug-overlay-head">
          <div>
            <p className="widget-kicker">{appText.debug.kicker}</p>
            <h2>{appText.debug.title}</h2>
            <p className="debug-overlay-copy">{appText.debug.copy}</p>
          </div>
          <button className="terminal-button is-active" type="button" onClick={onClose}>
            {appText.debug.closeAction}
          </button>
        </div>

        <div className="debug-overlay-grid">
          <article className="debug-card">
            <div className="debug-card-head">
              <span className="route-bullet" style={buildBadgeStyle('#f97316')}>
                P
              </span>
              <div>
                <h3>{appText.debug.performanceTitle}</h3>
                <p>ui-performance</p>
              </div>
            </div>

            <dl className="debug-list">
              <div>
                <dt>{appText.debug.lastInteractionLabel}</dt>
                <dd>{performanceState.interactionLabel ?? appText.debug.noneValue}</dd>
              </div>
              <div>
                <dt>{appText.debug.interactionDurationLabel}</dt>
                <dd>{formatMetricDuration(performanceState.interactionDurationMs, appText)}</dd>
              </div>
              <div>
                <dt>{appText.debug.interactionMeasuredAtLabel}</dt>
                <dd>
                  {formatMetricTimestamp(
                    performanceState.interactionMeasuredAt,
                    languageCode,
                    appText,
                  )}
                </dd>
              </div>
              <div>
                <dt>{appText.debug.longTaskCountLabel}</dt>
                <dd>{performanceState.longTaskCount}</dd>
              </div>
              <div>
                <dt>{appText.debug.longestLongTaskLabel}</dt>
                <dd>{formatMetricDuration(performanceState.longestLongTaskMs, appText)}</dd>
              </div>
              <div>
                <dt>{appText.debug.lastLongTaskLabel}</dt>
                <dd>
                  {formatMetricTimestamp(
                    performanceState.lastLongTaskAt,
                    languageCode,
                    appText,
                  )}
                </dd>
              </div>
            </dl>
          </article>

          {registeredWidgets.map((widget) => {
            const state = widgetHealthMap[widget.entity.id]
            const visibleInCurrentFocus = isWidgetVisibleForFilter(
              widget.entity,
              activeFilter,
            )

            return (
              <article className="debug-card" key={widget.entity.id}>
                <div className="debug-card-head">
                  <span
                    className="route-bullet"
                    style={buildBadgeStyle(widget.entity.subwayColor)}
                  >
                    {widget.entity.subwayLetter}
                  </span>
                  <div>
                    <h3>{resolveWidgetTitle(widget, languageCode)}</h3>
                    <p>{widget.entity.id}</p>
                  </div>
                </div>

                <dl className="debug-list">
                  <div>
                    <dt>{appText.debug.sourceLabel}</dt>
                    <dd>
                      {widget.module.dataSource} / {widget.entity.sourceLocation}
                    </dd>
                  </div>
                  <div>
                    <dt>{appText.debug.scopeLabel}</dt>
                    <dd>{formatScopeLabel(widget, appText)}</dd>
                  </div>
                  <div>
                    <dt>{appText.debug.visibleNowLabel}</dt>
                    <dd>{visibleInCurrentFocus ? appText.debug.yesValue : appText.debug.noValue}</dd>
                  </div>
                  <div>
                    <dt>{appText.debug.placementLabel}</dt>
                    <dd>
                      {widget.entity.placementZones
                        .map((placement) => `${placement.zoneId}#${placement.order}`)
                        .join(', ')}
                    </dd>
                  </div>
                  <div>
                    <dt>{appText.debug.refreshLabel}</dt>
                    <dd>{formatRefreshLabel(widget.entity.id, widgetHealthMap, appText)}</dd>
                  </div>
                  <div>
                    <dt>{appText.debug.lastRefreshLabel}</dt>
                    <dd>{state?.lastRefreshAt ?? appText.debug.notAvailableValue}</dd>
                  </div>
                  <div>
                    <dt>{appText.debug.itemsLabel}</dt>
                    <dd>{state?.itemCount ?? appText.debug.notAvailableValue}</dd>
                  </div>
                  <div>
                    <dt>{appText.debug.failureLabel}</dt>
                    <dd>{formatFailureLabel(state?.failureState, appText)}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
