// SLA calculation using Brazilian business hours (Mon–Fri, 09:00–18:00, UTC-3).

const SLA_HOURS: Record<string, number> = {
  URGENTE: 2,
  ALTA:    4,
  MEDIA:   8,
  BAIXA:   24,
}

const TZ_OFFSET_MS  = -3 * 60 * 60_000  // UTC-3
const BH_START_H    = 9
const BH_END_H      = 18
const BH_HOURS_DAY  = BH_END_H - BH_START_H  // 9 hours

/** Returns the slaDueAt date for a ticket, based on priority. */
export function calcSlaDueAt(priority: string, from: Date = new Date()): Date {
  const hours = SLA_HOURS[priority] ?? SLA_HOURS.MEDIA
  return addBusinessHours(from, hours)
}

/** Advance `from` by `hours` business hours (Brazil timezone). */
export function addBusinessHours(from: Date, hours: number): Date {
  let remaining = hours
  let current   = snapToNextBusinessStart(from)

  while (remaining > 0) {
    const localH        = toLocalHour(current)
    const hoursLeftToday = BH_END_H - localH

    if (remaining <= hoursLeftToday) {
      current = new Date(current.getTime() + remaining * 3_600_000)
      remaining = 0
    } else {
      remaining -= hoursLeftToday
      current = nextBusinessDayStart(current)
    }
  }

  return current
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function toLocalHour(utc: Date): number {
  return ((utc.getUTCHours() * 60 + utc.getUTCMinutes()) * 60_000 + TZ_OFFSET_MS) / 3_600_000
}

function localDayOfWeek(utc: Date): number {
  return new Date(utc.getTime() + TZ_OFFSET_MS).getUTCDay() // 0=Sun 6=Sat
}

/** If `d` is outside business hours, advance to the next business-hour start. */
function snapToNextBusinessStart(d: Date): Date {
  let result = new Date(d)

  // Skip weekends
  while (localDayOfWeek(result) === 0 || localDayOfWeek(result) === 6) {
    result = nextBusinessDayStart(result)
  }

  const localH = toLocalHour(result)
  if (localH < BH_START_H) {
    // Before business hours today — jump to 09:00 today
    const localMidnight = new Date(result.getTime() + TZ_OFFSET_MS)
    localMidnight.setUTCHours(0, 0, 0, 0)
    result = new Date(localMidnight.getTime() - TZ_OFFSET_MS + BH_START_H * 3_600_000)
  } else if (localH >= BH_END_H) {
    // After business hours — jump to next business day
    result = nextBusinessDayStart(result)
  }

  return result
}

/** Returns 09:00 local time of the next business day (Mon–Fri). */
function nextBusinessDayStart(d: Date): Date {
  // Advance to midnight local time of next day, then to BH_START_H
  const localMidnight = new Date(d.getTime() + TZ_OFFSET_MS)
  localMidnight.setUTCHours(0, 0, 0, 0)
  localMidnight.setUTCDate(localMidnight.getUTCDate() + 1)

  // Skip weekends
  while (localMidnight.getUTCDay() === 0 || localMidnight.getUTCDay() === 6) {
    localMidnight.setUTCDate(localMidnight.getUTCDate() + 1)
  }

  return new Date(localMidnight.getTime() - TZ_OFFSET_MS + BH_START_H * 3_600_000)
}

// ── SLA status helpers (for display) ──────────────────────────────────────────

export type SlaStatus = 'ok' | 'warning' | 'overdue'

export function getSlaStatus(slaDueAt: Date | string | null, status: string): SlaStatus | null {
  if (!slaDueAt) return null
  if (status === 'FECHADO') return null

  const due  = new Date(slaDueAt)
  const now  = new Date()
  const diffMs = due.getTime() - now.getTime()

  if (diffMs < 0)         return 'overdue'
  if (diffMs < 2 * 3_600_000) return 'warning'  // less than 2h remaining
  return 'ok'
}

export function formatSlaRemaining(slaDueAt: Date | string): string {
  const due   = new Date(slaDueAt)
  const now   = new Date()
  const diffMs = due.getTime() - now.getTime()

  if (diffMs < 0) {
    const h = Math.floor(-diffMs / 3_600_000)
    const m = Math.floor((-diffMs % 3_600_000) / 60_000)
    return `Vencido há ${h > 0 ? `${h}h ` : ''}${m}min`
  }

  const h = Math.floor(diffMs / 3_600_000)
  const m = Math.floor((diffMs % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m}min`
}
