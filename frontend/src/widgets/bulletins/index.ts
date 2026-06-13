import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getBulletinsWidgetTranslation,
  matchesBulletinsWidgetTitle,
} from './translations'

export const bulletinsWidget: WidgetMicroAppContract = {
  entityId: 'bulletins',
  folderName: 'bulletins',
  dataSource: 'database',
  capabilities: ['read'],
  hasSettingsPanel: false,
  getTranslation: getBulletinsWidgetTranslation,
  matchesDefaultTitle: matchesBulletinsWidgetTitle,
  loadData: () => null,
}

export const widgetModule = bulletinsWidget