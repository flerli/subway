import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface AssistantWidgetTranslation extends WidgetTranslationDefinition {
  copy: Record<string, string>
}

const assistantWidgetTranslationCatalog = createWidgetTranslationCatalog<AssistantWidgetTranslation>({
  en: {
    title: 'Assistant',
    boardKicker: 'Assistant',
    copy: {},
    settings: {
      title: 'Assistant widget settings',
      description:
        'Review the active assistant route and runtime capabilities for this account. Provider selection remains admin-managed.',
      fields: {},
    },
  },
  de: {
    title: 'Assistent',
    boardKicker: 'Assistent',
    copy: {},
    settings: {
      title: 'Assistent Widget Einstellungen',
      description:
        'Prufe die aktive Assistent Route und die Laufzeitfahigkeiten fur dieses Konto. Die Providerauswahl bleibt adminverwaltet.',
      fields: {},
    },
  },
  fr: {
    title: 'Assistant',
    boardKicker: 'Assistant',
    copy: {},
    settings: {
      title: 'Reglages du widget assistant',
      description:
        'Consultez la route assistant active et les capacites du runtime pour ce compte. La selection du provider reste geree par les admins.',
      fields: {},
    },
  },
  es: {
    title: 'Asistente',
    boardKicker: 'Asistente',
    copy: {},
    settings: {
      title: 'Ajustes del widget asistente',
      description:
        'Revisa la ruta activa del asistente y las capacidades del runtime para esta cuenta. La seleccion del proveedor sigue siendo administrada por admins.',
      fields: {},
    },
  },
})

export const getAssistantWidgetTranslation = (languageCode: SupportedLanguageCode) =>
  getWidgetTranslationFromCatalog(assistantWidgetTranslationCatalog, languageCode)

export const matchesAssistantWidgetTitle = createDefaultWidgetTitleMatcher(
  assistantWidgetTranslationCatalog,
)
