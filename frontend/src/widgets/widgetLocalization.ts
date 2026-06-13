import {
  getLocalizedBundle,
  type LocalizedBundle,
  type SupportedLanguageCode,
} from '../i18n/localization'
import type {
  WidgetMicroAppContract,
  WidgetSettingsDefinition,
  WidgetTranslationDefinition,
} from './widgetTypes'

export const createWidgetTranslationCatalog = <T extends WidgetTranslationDefinition>(
  catalog: LocalizedBundle<T>,
) => catalog

export const getWidgetTranslationFromCatalog = <T extends WidgetTranslationDefinition>(
  catalog: LocalizedBundle<T>,
  languageCode: SupportedLanguageCode,
) => getLocalizedBundle(catalog, languageCode)

export const createDefaultWidgetTitleMatcher = <T extends WidgetTranslationDefinition>(
  catalog: LocalizedBundle<T>,
) => {
  const defaultTitles = new Set(
    Object.values(catalog).map((entry) => entry.title.trim()),
  )

  return (title: string) => defaultTitles.has(title.trim())
}

export const getLocalizedSettingsDefinition = (
  widgetModule: WidgetMicroAppContract,
  languageCode: SupportedLanguageCode,
): WidgetSettingsDefinition | undefined => {
  const settingsDefinition = widgetModule.settingsDefinition

  if (!settingsDefinition) {
    return settingsDefinition
  }

  const settingsText = widgetModule.getTranslation(languageCode).settings

  if (!settingsText) {
    return settingsDefinition
  }

  return {
    ...settingsDefinition,
    title: settingsText.title,
    description: settingsText.description,
    fields: settingsDefinition.fields.map((field) => ({
      ...field,
      label: settingsText.fields[field.key]?.label ?? field.label,
      placeholder: settingsText.fields[field.key]?.placeholder ?? field.placeholder,
    })),
  }
}

export const resolveWidgetTitle = (
  widget: { entity: { title: string }; module: WidgetMicroAppContract },
  languageCode: SupportedLanguageCode,
) => {
  const normalizedTitle = widget.entity.title.trim()

  return widget.module.matchesDefaultTitle?.(normalizedTitle)
    ? widget.module.getTranslation(languageCode).title
    : widget.entity.title
}

export const getWidgetBoardKicker = (
  widget: { module: WidgetMicroAppContract },
  languageCode: SupportedLanguageCode,
) => widget.module.getTranslation(languageCode).boardKicker