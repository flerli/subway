import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { BringWidgetTranslation } from './translations'
import { formatLocalizedText, type SupportedLanguageCode } from '../../i18n/localization'
import type { BringWidgetData, BringListItem } from '../widgetHostModels'

export interface BringDetailViewData {
  bringData: BringWidgetData
  onRefresh: () => Promise<void>
  onCreateItem: (input: { itemName: string; specification: string }) => Promise<void>
  onUpdateItem: (input: {
    itemName: string
    specification: string
    itemUuid?: string
  }) => Promise<void>
  onDeleteItem: (input: { itemName: string; itemUuid?: string }) => Promise<void>
  onCompleteItem: (input: {
    itemName: string
    specification: string
    itemUuid?: string
  }) => Promise<void>
  onOpenSettings: () => void
}

interface BringDetailViewProps {
  data: BringDetailViewData
  languageCode: SupportedLanguageCode
  widgetText: BringWidgetTranslation
}

const isBringDetailViewData = (value: unknown): value is BringDetailViewData => {
  const candidate = value as Record<string, unknown>

  return (
    !!candidate &&
    typeof candidate === 'object' &&
    typeof candidate.onRefresh === 'function' &&
    typeof candidate.onCreateItem === 'function' &&
    typeof candidate.onUpdateItem === 'function' &&
    typeof candidate.onDeleteItem === 'function' &&
    typeof candidate.onCompleteItem === 'function' &&
    typeof candidate.onOpenSettings === 'function' &&
    typeof candidate.bringData === 'object'
  )
}

export function BringDetailView({ data, widgetText }: BringDetailViewProps) {
  const itemNameInputRef = useRef<HTMLInputElement | null>(null)
  const autoRefreshKeyRef = useRef<string | null>(null)
  const [draftItemName, setDraftItemName] = useState('')
  const [draftSpecification, setDraftSpecification] = useState('')
  const [requestState, setRequestState] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  if (!isBringDetailViewData(data)) {
    return null
  }

  const bringList = data.bringData.list
  const isReady = data.bringData.status === 'ready' && bringList !== null
  const isReadOnly = Boolean(bringList?.readOnly)

  const normalizeItemNameKey = (item: BringListItem) => item.itemName.trim().toLowerCase()

  const sortByRecentness = (items: BringListItem[]) => {
    const itemsWithIndex = items.map((item, index) => ({
      item,
      index,
      timestamp: Date.parse(item.recentAt),
    }))
    const hasAnyTimestamp = itemsWithIndex.some(({ timestamp }) => !Number.isNaN(timestamp))

    if (!hasAnyTimestamp) {
      return [...items].reverse()
    }

    return itemsWithIndex
      .sort((left, right) => {
        const leftHasTimestamp = !Number.isNaN(left.timestamp)
        const rightHasTimestamp = !Number.isNaN(right.timestamp)

        if (leftHasTimestamp && rightHasTimestamp && left.timestamp !== right.timestamp) {
          return right.timestamp - left.timestamp
        }

        if (rightHasTimestamp !== leftHasTimestamp) {
          return rightHasTimestamp ? 1 : -1
        }

        return right.index - left.index
      })
      .map(({ item }) => item)
  }

  const openItemNameSet = new Set((bringList?.openItems ?? []).map(normalizeItemNameKey))
  const filteredRecentItems = bringList
    ? sortByRecentness(bringList.recentItems).filter((item) => !openItemNameSet.has(normalizeItemNameKey(item)))
    : []

  const openItemGroups = (() => {
    if (!bringList) {
      return [] as Array<{ category: string; items: BringListItem[] }>
    }

    const sortedOpenItems = sortByRecentness(bringList.openItems)

    const hasAnyCategory = sortedOpenItems.some((item) => item.category.trim().length > 0)

    if (!hasAnyCategory) {
      return [{ category: '', items: sortedOpenItems }]
    }

    const groupedItems = new Map<string, BringListItem[]>()

    for (const item of sortedOpenItems) {
      const categoryKey = item.category.trim()
      const items = groupedItems.get(categoryKey) ?? []
      items.push(item)
      groupedItems.set(categoryKey, items)
    }

    return Array.from(groupedItems.entries()).map(([category, items]) => ({ category, items }))
  })()

  const runAction = async (actionState: string, action: () => Promise<void>, fallbackMessage: string) => {
    setRequestState(actionState)
    setStatusMessage(widgetText.detail.workingState)

    try {
      await action()
      setStatusMessage(null)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : fallbackMessage)
    } finally {
      setRequestState(null)
    }
  }

  const handleRefresh = async () => {
    await runAction(
      'refresh',
      async () => {
        await data.onRefresh()
      },
      widgetText.detail.refreshFailedFallback,
    )
  }

  useEffect(() => {
    const autoRefreshKey =
      data.bringData.status === 'ready' && bringList
        ? bringList.listUuid
        : data.bringData.status === 'error'
          ? 'error'
          : null

    if (!autoRefreshKey || autoRefreshKeyRef.current === autoRefreshKey || requestState !== null) {
      return
    }

    autoRefreshKeyRef.current = autoRefreshKey
    void handleRefresh()
  }, [bringList, data.bringData.status, requestState])

  const handleAddItem = async (event: FormEvent) => {
    event.preventDefault()

    const itemName = draftItemName.trim()
    if (!itemName || isReadOnly) {
      return
    }

    await runAction(
      'add',
      async () => {
        await data.onCreateItem({
          itemName,
          specification: draftSpecification.trim(),
        })
        setDraftItemName('')
        setDraftSpecification('')
        setStatusMessage(null)
        window.setTimeout(() => {
          itemNameInputRef.current?.focus()
        }, 0)
      },
      widgetText.detail.updateFailedFallback,
    )
  }

  const handleCompleteItem = async (item: BringListItem) => {
    await runAction(
      `complete:${item.uuid}`,
      async () => {
        await data.onCompleteItem({
          itemName: item.itemName,
          specification: item.specification,
          itemUuid: item.uuid || undefined,
        })
      },
      widgetText.detail.completeFailedFallback,
    )
  }

  const handleReopenItem = async (item: BringListItem) => {
    await runAction(
      `reopen:${item.uuid}`,
      async () => {
        await data.onCreateItem({
          itemName: item.itemName,
          specification: item.specification,
        })
      },
      widgetText.detail.reopenFailedFallback,
    )
  }

  const handleDeleteItem = async (item: BringListItem) => {
    const confirmed = window.confirm(
      formatLocalizedText(widgetText.detail.deleteConfirm, { name: item.itemName }),
    )

    if (!confirmed) {
      return
    }

    await runAction(
      `delete:${item.uuid}`,
      async () => {
        await data.onDeleteItem({
          itemName: item.itemName,
          itemUuid: item.uuid || undefined,
        })
      },
      widgetText.detail.deleteFailedFallback,
    )
  }

  if (data.bringData.status === 'loading') {
    return (
      <div className="bring-detail-view">
        <div className="empty-state empty-state--expanded">
          <p className="empty-title">{widgetText.copy.loadingTitle}</p>
          <p className="empty-copy">{widgetText.copy.loadingCopy}</p>
        </div>
      </div>
    )
  }

  if (data.bringData.status === 'not-configured' || data.bringData.status === 'error') {
    return (
      <div className="bring-detail-view">
        <div className="bring-detail-card bring-detail-card--guidance">
          <div className="bring-detail-header-copy">
            <p className="bring-detail-title">{widgetText.detail.reconnectTitle}</p>
            <p className="bring-detail-copy">
              {data.bringData.message ?? widgetText.detail.reconnectCopy}
            </p>
          </div>
          <button
            type="button"
            className="bring-detail-action"
            onClick={data.onOpenSettings}
          >
            {widgetText.detail.openSettingsAction}
          </button>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return null
  }

  return (
    <div className="bring-detail-view">
      <div className="bring-detail-main-column">
        <div className="bring-detail-header">
          <div className="bring-detail-header-copy">
            <p className="bring-detail-title">{bringList.listName}</p>
            <p className="bring-detail-copy">
              {formatLocalizedText(widgetText.copy.openItemsMeta, {
                count: bringList.openItemCount,
              })}
            </p>
          </div>
          <button
            type="button"
            className="bring-detail-action"
            onClick={handleRefresh}
            disabled={requestState !== null}
          >
            {requestState === 'refresh'
              ? widgetText.detail.refreshingState
              : widgetText.detail.refreshAction}
          </button>
        </div>

        {bringList.freshness === 'stale' ? (
          <p className="bring-detail-banner">{widgetText.detail.staleBanner}</p>
        ) : null}

        {isReadOnly ? (
          <p className="bring-detail-banner bring-detail-banner--muted">
            {widgetText.detail.readOnlyNotice}
          </p>
        ) : null}

        <section className="bring-detail-card">
          <div className="bring-detail-header-copy">
            <p className="bring-detail-section-title">{widgetText.detail.openItemsTitle}</p>
          </div>
          {bringList.openItems.length > 0 ? (
            <ul className="bring-detail-list">
              {openItemGroups.map((group) => (
                <li className="bring-detail-group" key={group.category || 'uncategorized'}>
                  {group.category ? (
                    <p className="bring-detail-group-title">{group.category}</p>
                  ) : null}

                  <div className="bring-detail-matrix">
                    {group.items.map((item) => {
                      const itemKey = item.uuid || `${item.itemName}-${item.specification}`

                      return (
                        <button
                          type="button"
                          className="bring-detail-item-card bring-detail-item-card--interactive"
                          key={itemKey}
                          disabled={isReadOnly || requestState !== null}
                          onClick={() => void handleCompleteItem(item)}
                        >
                          <div className="bring-detail-row-copy">
                            <p className="bring-item-name">{item.itemName}</p>
                            {item.category ? (
                              <p className="bring-item-category">{item.category}</p>
                            ) : null}
                            {item.specification ? (
                              <p className="bring-item-specification">{item.specification}</p>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state empty-state--expanded">
              <p className="empty-title">{widgetText.copy.emptyTitle}</p>
              <p className="empty-copy">{widgetText.copy.emptyCopy}</p>
            </div>
          )}
        </section>
      </div>

      <aside className="bring-detail-side-column">
        <form className="bring-detail-card bring-detail-add-form" onSubmit={handleAddItem}>
          <div className="bring-detail-header-copy">
            <p className="bring-detail-section-title">{widgetText.detail.addSectionTitle}</p>
          </div>
          <label className="settings-label">
            <span>{widgetText.detail.itemNameLabel}</span>
            <input
              ref={itemNameInputRef}
              className="settings-input"
              type="text"
              value={draftItemName}
              placeholder={widgetText.detail.itemNamePlaceholder}
              disabled={isReadOnly || requestState !== null}
              onChange={(event) => setDraftItemName(event.target.value)}
            />
          </label>
          <label className="settings-label">
            <span>{widgetText.detail.specificationLabel}</span>
            <input
              className="settings-input"
              type="text"
              value={draftSpecification}
              placeholder={widgetText.detail.specificationPlaceholder}
              disabled={isReadOnly || requestState !== null}
              onChange={(event) => setDraftSpecification(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="bring-detail-action"
            disabled={isReadOnly || requestState !== null || draftItemName.trim().length === 0}
          >
            {requestState === 'add'
              ? widgetText.detail.addingItemState
              : widgetText.detail.addItemAction}
          </button>
        </form>

        <section className="bring-detail-card">
          <div className="bring-detail-header-copy">
            <p className="bring-detail-section-title">{widgetText.detail.recentItemsTitle}</p>
          </div>
          {filteredRecentItems.length > 0 ? (
            <ul className="bring-detail-list">
              {filteredRecentItems.map((item) => {
                const itemKey = item.uuid || `${item.itemName}-${item.specification}`
                return (
                  <li className="bring-detail-row" key={`recent-${itemKey}`}>
                    <div className="bring-detail-row-copy">
                      <p className="bring-item-name">{item.itemName}</p>
                      {item.specification ? (
                        <p className="bring-item-specification">{item.specification}</p>
                      ) : null}
                    </div>
                    <div className="bring-detail-actions">
                      <button
                        type="button"
                        className="bring-detail-action"
                        disabled={isReadOnly || requestState !== null}
                        onClick={() => void handleReopenItem(item)}
                      >
                        {widgetText.detail.reopenAction}
                      </button>
                      <button
                        type="button"
                        className="bring-detail-action bring-detail-action--danger"
                        disabled={isReadOnly || requestState !== null}
                        onClick={() => void handleDeleteItem(item)}
                      >
                        {widgetText.detail.deleteAction}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="bring-detail-copy">{widgetText.detail.recentItemsEmpty}</p>
          )}
        </section>

        {statusMessage ? (
          <section className="bring-detail-card bring-detail-card--status">
            <p className="bring-detail-copy">{statusMessage}</p>
          </section>
        ) : null}
      </aside>
    </div>
  )
}
