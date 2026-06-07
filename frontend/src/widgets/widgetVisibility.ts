import type { FilterId } from './widgetHostModels'
import type { WidgetEntityRecord } from './widgetTypes'

const ALL_FILTER_ID = 'all'

export const isWidgetVisibleForFilter = (
  widgetEntity: WidgetEntityRecord,
  activeFilter: FilterId,
) => {
  if (activeFilter === ALL_FILTER_ID) {
    return true
  }

  if (widgetEntity.userScope.mode === 'all') {
    return true
  }

  if (widgetEntity.userScope.mode === 'member') {
    return widgetEntity.userScope.memberIds[0] === activeFilter
  }

  return widgetEntity.userScope.memberIds.includes(activeFilter)
}
