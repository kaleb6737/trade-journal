/** Shared Tradovate API roots (avoid circular imports between oauth + sync). */
export const TRADOVATE_DEMO_V1 = 'https://demo.tradovateapi.com/v1'
export const TRADOVATE_LIVE_V1 = 'https://live.tradovateapi.com/v1'
export const TRADOVATE_DEMO_ORIGIN = 'https://demo.tradovateapi.com'
export const TRADOVATE_LIVE_ORIGIN = 'https://live.tradovateapi.com'

export function tradovateV1Base(demo) {
  return demo !== false ? TRADOVATE_DEMO_V1 : TRADOVATE_LIVE_V1
}

export function tradovateApiOrigin(demo) {
  return demo !== false ? TRADOVATE_DEMO_ORIGIN : TRADOVATE_LIVE_ORIGIN
}
