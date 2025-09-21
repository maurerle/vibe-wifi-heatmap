declare module 'heatmap.js/plugins/leaflet-heatmap' {
  import type * as L from 'leaflet'

  export interface HeatmapDataPoint {
    lat: number
    lng: number
    value: number
  }

  export interface HeatmapData {
    min?: number
    max?: number
    data: HeatmapDataPoint[]
  }

  export interface HeatmapConfig {
    radius?: number
    minOpacity?: number
    maxOpacity?: number
    blur?: number
    scaleRadius?: boolean
    useLocalExtrema?: boolean
    valueField?: string
    [k: string]: any
  }

  export default class HeatmapOverlay extends (L.Layer as any) {
    constructor(cfg?: HeatmapConfig)
    setData(data: HeatmapData): void
  }
}
