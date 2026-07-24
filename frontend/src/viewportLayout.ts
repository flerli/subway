import { useEffect, useState } from 'react'

export type ViewportLayoutMode = 'desktop' | 'mobile'
export type ViewportOrientation = 'portrait' | 'landscape'

export interface ViewportLayoutState {
  layoutMode: ViewportLayoutMode
  width: number
  height: number
  shortestSide: number
  longestSide: number
  orientation: ViewportOrientation
}

const MOBILE_MAX_SHORTEST_SIDE = 900
const MOBILE_MAX_LONGEST_SIDE = 1400

const defaultViewportLayoutState: ViewportLayoutState = {
  layoutMode: 'desktop',
  width: 0,
  height: 0,
  shortestSide: 0,
  longestSide: 0,
  orientation: 'portrait',
}

const roundViewportValue = (value: number | undefined) =>
  Number.isFinite(value) ? Math.max(0, Math.round(value ?? 0)) : 0

const readViewportDimensions = () => {
  const visualViewport = window.visualViewport
  const documentElement = document.documentElement

  const width = roundViewportValue(
    visualViewport?.width ?? documentElement.clientWidth ?? window.innerWidth,
  )
  const height = roundViewportValue(
    visualViewport?.height ?? documentElement.clientHeight ?? window.innerHeight,
  )

  return { width, height }
}

const resolveViewportLayoutMode = (
  width: number,
  height: number,
): ViewportLayoutMode => {
  const shortestSide = Math.min(width, height)
  const longestSide = Math.max(width, height)

  return shortestSide <= MOBILE_MAX_SHORTEST_SIDE && longestSide <= MOBILE_MAX_LONGEST_SIDE
    ? 'mobile'
    : 'desktop'
}

const measureViewportLayoutState = (): ViewportLayoutState => {
  if (typeof window === 'undefined') {
    return defaultViewportLayoutState
  }

  const { width, height } = readViewportDimensions()
  const shortestSide = Math.min(width, height)
  const longestSide = Math.max(width, height)

  return {
    layoutMode: resolveViewportLayoutMode(width, height),
    width,
    height,
    shortestSide,
    longestSide,
    orientation: width > height ? 'landscape' : 'portrait',
  }
}

const isSameViewportLayoutState = (
  left: ViewportLayoutState,
  right: ViewportLayoutState,
) =>
  left.layoutMode === right.layoutMode &&
  left.width === right.width &&
  left.height === right.height &&
  left.shortestSide === right.shortestSide &&
  left.longestSide === right.longestSide &&
  left.orientation === right.orientation

export const useViewportLayoutState = () => {
  const [viewportLayoutState, setViewportLayoutState] = useState<ViewportLayoutState>(
    () => measureViewportLayoutState(),
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const updateViewportLayoutState = () => {
      setViewportLayoutState((currentState) => {
        const nextState = measureViewportLayoutState()
        return isSameViewportLayoutState(currentState, nextState)
          ? currentState
          : nextState
      })
    }

    updateViewportLayoutState()

    const visualViewport = window.visualViewport
    window.addEventListener('resize', updateViewportLayoutState)
    window.addEventListener('orientationchange', updateViewportLayoutState)
    visualViewport?.addEventListener('resize', updateViewportLayoutState)

    return () => {
      window.removeEventListener('resize', updateViewportLayoutState)
      window.removeEventListener('orientationchange', updateViewportLayoutState)
      visualViewport?.removeEventListener('resize', updateViewportLayoutState)
    }
  }, [])

  return viewportLayoutState
}