export type SeasonPrice = {
  name: string
  start_md: string
  end_md: string
  price_per_night: number
  min_nights?: number
}

export type PricingTier = {
  min_guests: number
  max_guests: number
  price_per_night: number
}

function isDateInSeason(date: Date, season: SeasonPrice): boolean {
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const md = `${mm}-${dd}`

  const { start_md, end_md } = season

  if (start_md <= end_md) {
    return md >= start_md && md <= end_md
  } else {
    // crosses year boundary (e.g. 12-15 to 03-15)
    return md >= start_md || md <= end_md
  }
}

function getSeasonForNight(date: Date, seasons: SeasonPrice[]): SeasonPrice | null {
  for (const season of seasons) {
    if (isDateInSeason(date, season)) return season
  }
  return null
}

function getPriceForGuests(
  tiers: PricingTier[] | null | undefined,
  guests: number,
  basePriceNight: number
): number {
  if (!tiers || tiers.length === 0) return basePriceNight
  const tier = tiers.find(t => guests >= t.min_guests && guests <= t.max_guests)
  return tier ? tier.price_per_night : basePriceNight
}

export type PriceBreakdownItem = {
  date: string
  price: number
  season_name: string | null
}

export type PriceResult = {
  total: number
  breakdown: PriceBreakdownItem[]
  min_nights_required: number
  active_season_name: string | null
}

export function getPriceForDates(params: {
  cabin: {
    base_price_night: number
    season_prices?: SeasonPrice[] | null
    pricing_tiers?: PricingTier[] | null
  }
  checkIn: string
  checkOut: string
  guests: number
  tenantMinNights: number
}): PriceResult {
  const { cabin, checkIn, checkOut, guests, tenantMinNights } = params
  const seasons = cabin.season_prices ?? []
  const tiers = cabin.pricing_tiers ?? []

  const breakdown: PriceBreakdownItem[] = []
  let maxSeasonMinNights = 0
  let firstSeasonName: string | null = null

  const start = new Date(checkIn + "T12:00:00")
  const end = new Date(checkOut + "T12:00:00")

  const cursor = new Date(start)
  while (cursor < end) {
    const season = getSeasonForNight(cursor, seasons)
    const basePriceNight = season ? season.price_per_night : cabin.base_price_night

    // pricing_tiers override the base/season price when a guest-count match exists
    const nightPrice = getPriceForGuests(tiers, guests, basePriceNight)

    const dateStr = cursor.toISOString().slice(0, 10)
    breakdown.push({
      date: dateStr,
      price: nightPrice,
      season_name: season?.name ?? null,
    })

    if (season) {
      if (!firstSeasonName) firstSeasonName = season.name
      if (season.min_nights && season.min_nights > maxSeasonMinNights) {
        maxSeasonMinNights = season.min_nights
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  const total = breakdown.reduce((s, n) => s + n.price, 0)
  const min_nights_required = Math.max(tenantMinNights, maxSeasonMinNights)

  return { total, breakdown, min_nights_required, active_season_name: firstSeasonName }
}
