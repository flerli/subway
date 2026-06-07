import { buildBadgeStyle } from './widgetAppearance'
import { isWidgetVisibleForFilter } from './widgetVisibility'
import type { FilterId } from './widgetHostModels'
import type { RegisteredWidget, WidgetHealthState } from './widgetTypes'

interface WidgetDebugOverlayProps {
  registeredWidgets: RegisteredWidget[]
  activeFilter: FilterId
  widgetHealthMap: Record<string, WidgetHealthState>
  onClose: () => void
}

const formatScopeLabel = (widget: RegisteredWidget) => {
  const { mode, memberIds } = widget.entity.userScope

  if (mode === 'all') {
    return 'All members'
  }

  if (mode === 'member') {
    return `Member: ${memberIds[0] ?? 'n/a'}`
  }

  return `Members: ${memberIds.join(', ')}`
}

const formatRefreshLabel = (widgetId: string, widgetHealthMap: Record<string, WidgetHealthState>) => {
  const state = widgetHealthMap[widgetId]

  if (!state) {
    return 'idle'
  }

  return state.refreshStatus
}

export function WidgetDebugOverlay({
  registeredWidgets,
  activeFilter,
  widgetHealthMap,
  onClose,
}: WidgetDebugOverlayProps) {
  return (
    <div className="debug-overlay-backdrop" role="dialog" aria-modal="true">
      <section className="debug-overlay-panel">
        <div className="debug-overlay-head">
          <div>
            <p className="widget-kicker">Maintenance</p>
            <h2>Widget diagnostics</h2>
            <p className="debug-overlay-copy">
              Hidden overlay for source, scope, refresh status, and failure inspection.
            </p>
          </div>
          <button className="terminal-button is-active" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="debug-overlay-grid">
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
                    <h3>{widget.entity.title}</h3>
                    <p>{widget.entity.id}</p>
                  </div>
                </div>

                <dl className="debug-list">
                  <div>
                    <dt>Source</dt>
                    <dd>
                      {widget.module.dataSource} / {widget.entity.sourceLocation}
                    </dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>{formatScopeLabel(widget)}</dd>
                  </div>
                  <div>
                    <dt>Visible now</dt>
                    <dd>{visibleInCurrentFocus ? 'yes' : 'no'}</dd>
                  </div>
                  <div>
                    <dt>Placement</dt>
                    <dd>
                      {widget.entity.placementZones
                        .map((placement) => `${placement.zoneId}#${placement.order}`)
                        .join(', ')}
                    </dd>
                  </div>
                  <div>
                    <dt>Refresh</dt>
                    <dd>{formatRefreshLabel(widget.entity.id, widgetHealthMap)}</dd>
                  </div>
                  <div>
                    <dt>Last refresh</dt>
                    <dd>{state?.lastRefreshAt ?? 'n/a'}</dd>
                  </div>
                  <div>
                    <dt>Items</dt>
                    <dd>{state?.itemCount ?? 'n/a'}</dd>
                  </div>
                  <div>
                    <dt>Failure</dt>
                    <dd>{state?.failureState ?? 'none'}</dd>
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
