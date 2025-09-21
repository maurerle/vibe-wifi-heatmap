declare module '@cloudflare/speedtest' {
  export interface Summary {
    download: number
    upload: number
    latency?: number
    [k: string]: any
  }

  export interface Results {
    getSummary(): Summary
  }

  export default class SpeedTest {
    constructor(opts?: any)
    onFinish?: (results: Results) => void
    onError?: (err?: any) => void
    remove?: () => void
  }
}
