import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface UiBenchmarkWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    benchmarkMeta: string
    targetLabel: string
    animationsLabel: string
    heavyPaintLabel: string
    liveLoopLabel: string
    runAction: string
    runningAction: string
    resetAction: string
    reactionPanelLabel: string
    reactionPanelHint: string
    reactionLatencyLabel: string
    colorBlueAction: string
    colorOrangeAction: string
    colorGreenAction: string
    colorRedAction: string
    latencyLabel: string
    smoothnessLabel: string
    interactionsLabel: string
    idleValue: string
  }
}

const uiBenchmarkWidgetTranslationCatalog =
  createWidgetTranslationCatalog<UiBenchmarkWidgetTranslation>({
    en: {
      title: 'UI Benchmark',
      boardKicker: 'Performance',
      copy: {
        benchmarkMeta: 'Touch response probe',
        targetLabel: 'Load target',
        animationsLabel: 'Animate probe',
        heavyPaintLabel: 'Heavy paint pass',
        liveLoopLabel: 'Keep live updates',
        runAction: 'Run benchmark',
        runningAction: 'Running...',
        resetAction: 'Reset',
        reactionPanelLabel: 'Button reaction panel',
        reactionPanelHint: 'Tap a color button and watch repaint speed.',
        reactionLatencyLabel: 'Color reaction',
        colorBlueAction: 'Blue',
        colorOrangeAction: 'Orange',
        colorGreenAction: 'Green',
        colorRedAction: 'Red',
        latencyLabel: 'Latency',
        smoothnessLabel: 'Smoothness',
        interactionsLabel: 'Runs',
        idleValue: 'Idle',
      },
      settings: {
        title: 'UI benchmark settings',
        description: 'Tune the benchmark defaults used when this widget starts.',
        fields: {
          defaultLoadTarget: {
            label: 'Default load target',
          },
          defaultAnimationsEnabled: {
            label: 'Animate probe by default',
          },
          defaultHeavyPaintEnabled: {
            label: 'Enable heavy paint pass by default',
          },
          defaultLiveLoopEnabled: {
            label: 'Enable live updates by default',
          },
        },
      },
    },
    de: {
      title: 'UI-Benchmark',
      boardKicker: 'Performance',
      copy: {
        benchmarkMeta: 'Touch-Reaktionsprobe',
        targetLabel: 'Lastziel',
        animationsLabel: 'Probe animieren',
        heavyPaintLabel: 'Schwerer Renderdurchlauf',
        liveLoopLabel: 'Live-Updates aktiv halten',
        runAction: 'Benchmark starten',
        runningAction: 'Laeuft...',
        resetAction: 'Zuruecksetzen',
        reactionPanelLabel: 'Reaktionspanel fuer Buttons',
        reactionPanelHint: 'Tippe eine Farbtaste und beobachte die Rendergeschwindigkeit.',
        reactionLatencyLabel: 'Farbreaktion',
        colorBlueAction: 'Blau',
        colorOrangeAction: 'Orange',
        colorGreenAction: 'Gruen',
        colorRedAction: 'Rot',
        latencyLabel: 'Latenz',
        smoothnessLabel: 'Geschmeidigkeit',
        interactionsLabel: 'Laeufe',
        idleValue: 'Leerlauf',
      },
      settings: {
        title: 'UI-Benchmark-Einstellungen',
        description: 'Lege die Benchmark-Standardwerte fuer dieses Widget fest.',
        fields: {
          defaultLoadTarget: {
            label: 'Standard-Lastziel',
          },
          defaultAnimationsEnabled: {
            label: 'Probe standardmaessig animieren',
          },
          defaultHeavyPaintEnabled: {
            label: 'Schweren Renderdurchlauf standardmaessig aktivieren',
          },
          defaultLiveLoopEnabled: {
            label: 'Live-Updates standardmaessig aktivieren',
          },
        },
      },
    },
    fr: {
      title: 'Benchmark UI',
      boardKicker: 'Performance',
      copy: {
        benchmarkMeta: 'Sonde de reactivite tactile',
        targetLabel: 'Charge cible',
        animationsLabel: 'Animer la sonde',
        heavyPaintLabel: 'Passage de rendu lourd',
        liveLoopLabel: 'Maintenir les mises a jour en direct',
        runAction: 'Lancer le benchmark',
        runningAction: 'Execution...',
        resetAction: 'Reinitialiser',
        reactionPanelLabel: 'Panneau de reaction des boutons',
        reactionPanelHint: 'Touchez une couleur et observez la vitesse de rendu.',
        reactionLatencyLabel: 'Reaction couleur',
        colorBlueAction: 'Bleu',
        colorOrangeAction: 'Orange',
        colorGreenAction: 'Vert',
        colorRedAction: 'Rouge',
        latencyLabel: 'Latence',
        smoothnessLabel: 'Fluidite',
        interactionsLabel: 'Executions',
        idleValue: 'Inactif',
      },
      settings: {
        title: 'Parametres du benchmark UI',
        description: 'Ajustez les valeurs par defaut utilisees au demarrage du widget.',
        fields: {
          defaultLoadTarget: {
            label: 'Charge cible par defaut',
          },
          defaultAnimationsEnabled: {
            label: 'Animer la sonde par defaut',
          },
          defaultHeavyPaintEnabled: {
            label: 'Activer le rendu lourd par defaut',
          },
          defaultLiveLoopEnabled: {
            label: 'Activer les mises a jour en direct par defaut',
          },
        },
      },
    },
    es: {
      title: 'Benchmark UI',
      boardKicker: 'Rendimiento',
      copy: {
        benchmarkMeta: 'Prueba de respuesta tactil',
        targetLabel: 'Carga objetivo',
        animationsLabel: 'Animar sonda',
        heavyPaintLabel: 'Paso de render pesado',
        liveLoopLabel: 'Mantener actualizaciones en vivo',
        runAction: 'Ejecutar benchmark',
        runningAction: 'Ejecutando...',
        resetAction: 'Restablecer',
        reactionPanelLabel: 'Panel de reaccion de botones',
        reactionPanelHint: 'Pulsa un color y observa la velocidad de repintado.',
        reactionLatencyLabel: 'Reaccion de color',
        colorBlueAction: 'Azul',
        colorOrangeAction: 'Naranja',
        colorGreenAction: 'Verde',
        colorRedAction: 'Rojo',
        latencyLabel: 'Latencia',
        smoothnessLabel: 'Suavidad',
        interactionsLabel: 'Ejecuciones',
        idleValue: 'Inactivo',
      },
      settings: {
        title: 'Configuracion del benchmark UI',
        description: 'Ajusta los valores predeterminados usados al iniciar este widget.',
        fields: {
          defaultLoadTarget: {
            label: 'Carga objetivo predeterminada',
          },
          defaultAnimationsEnabled: {
            label: 'Animar sonda de forma predeterminada',
          },
          defaultHeavyPaintEnabled: {
            label: 'Activar render pesado de forma predeterminada',
          },
          defaultLiveLoopEnabled: {
            label: 'Activar actualizaciones en vivo de forma predeterminada',
          },
        },
      },
    },
  })

export const getUiBenchmarkWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(uiBenchmarkWidgetTranslationCatalog, languageCode)

export const matchesUiBenchmarkWidgetTitle = createDefaultWidgetTitleMatcher(
  uiBenchmarkWidgetTranslationCatalog,
)
