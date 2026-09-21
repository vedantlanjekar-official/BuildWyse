import { SoftCard, formatDate } from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CalendarEvent } from '@/types'
import { cn } from '@/utils/cn'
import { ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'review', label: 'Review' },
  { value: 'submission', label: 'Submission' },
  { value: 'payment', label: 'Payment' },
  { value: 'other', label: 'Other' },
]

export type CreateCalendarEventInput = {
  title: string
  description?: string
  event_type: string
  starts_at: string
  dateKey: string
  project_id?: string
}

function toDateKey(value: Date | string): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function eventDateKey(event: CalendarEvent): string {
  return toDateKey(event.starts_at)
}

function eventTypeLabel(type?: string | null) {
  if (!type) return 'schedule'
  return type.replaceAll('_', ' ')
}

export function CalendarMonthView({
  events,
  projectTitle,
  showProject = false,
  onSelectEvent,
  canAddEvent = false,
  projects = [],
  defaultProjectId,
  onCreateEvent,
  createPending = false,
  createError = null,
}: {
  events: CalendarEvent[]
  projectTitle?: string
  showProject?: boolean
  onSelectEvent?: (event: CalendarEvent) => void
  canAddEvent?: boolean
  projects?: Array<{ id: string; title: string }>
  defaultProjectId?: string
  onCreateEvent?: (input: CreateCalendarEventInput) => Promise<void> | void
  createPending?: boolean
  createError?: string | null
}) {
  const todayKey = toDateKey(new Date())
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedKey, setSelectedKey] = useState<string>(todayKey)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState('meeting')
  const [time, setTime] = useState('10:00')
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '')

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      const key = eventDateKey(event)
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    }
    return map
  }, [events])

  const cells = useMemo(() => {
    const first = startOfMonth(month)
    const startPad = first.getDay()
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const total = Math.ceil((startPad + daysInMonth) / 7) * 7
    const result: Array<{ date: Date; inMonth: boolean; key: string }> = []
    for (let i = 0; i < total; i++) {
      const date = new Date(month.getFullYear(), month.getMonth(), i - startPad + 1)
      result.push({
        date,
        inMonth: date.getMonth() === month.getMonth(),
        key: toDateKey(date),
      })
    }
    return result
  }, [month])

  const selectedEvents = eventsByDay.get(selectedKey) ?? []
  const selectedDate = selectedKey ? new Date(`${selectedKey}T12:00:00`) : null
  const selectedDayLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Select a date'

  function resetForm() {
    setTitle('')
    setDescription('')
    setEventType('meeting')
    setTime('10:00')
    setShowForm(false)
  }

  async function submitEvent() {
    if (!onCreateEvent || !selectedKey || title.trim().length < 1) return
    const startsAt = new Date(`${selectedKey}T${time || '10:00'}:00`)
    await onCreateEvent({
      title: title.trim(),
      description: description.trim() || undefined,
      event_type: eventType,
      starts_at: startsAt.toISOString(),
      dateKey: selectedKey,
      project_id: defaultProjectId ?? (projectId || undefined),
    })
    resetForm()
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
      <SoftCard
        title={month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        subtitle="Select a date to view details or add your own event"
        action={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-xl px-2 text-xs"
              onClick={() => {
                const now = startOfMonth(new Date())
                setMonth(now)
                setSelectedKey(todayKey)
              }}
            >
              Today
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-xl p-0"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a9a96]">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const dayEvents = eventsByDay.get(cell.key) ?? []
            const selected = cell.key === selectedKey
            const isToday = cell.key === todayKey
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => {
                  setSelectedKey(cell.key)
                  setShowForm(false)
                }}
                className={cn(
                  'relative flex min-h-[72px] flex-col items-start rounded-2xl border p-1.5 text-left transition',
                  cell.inMonth ? 'border-[#e8eeec] bg-white' : 'border-transparent bg-[#f7faf9] text-[#a3b0ac]',
                  selected && 'border-[#0d2a28] bg-[#eef8f6] shadow-[0_8px_20px_rgba(13,42,40,0.08)]',
                  !selected && cell.inMonth && 'hover:border-[#0d2a28]/30 hover:bg-[#f4fbf9]',
                  isToday && !selected && 'ring-1 ring-[var(--color-primary)]/40',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                    selected && 'bg-[#0d2a28] text-white',
                    isToday && !selected && 'text-[var(--color-primary)]',
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="mt-auto flex w-full flex-col gap-0.5 pt-1">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <span
                        key={ev.id}
                        className="truncate rounded-md bg-[#d8f0ea] px-1 py-0.5 text-[10px] font-medium leading-tight text-[#0f6b5c]"
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] font-medium text-[#5a6d68]">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                )}
                {dayEvents.length === 0 && cell.inMonth && (
                  <span className="mt-auto h-1.5 w-1.5 rounded-full bg-transparent" />
                )}
              </button>
            )
          })}
        </div>
      </SoftCard>

      <SoftCard
        title="Day details"
        subtitle={selectedDayLabel}
        accent
        action={
          canAddEvent ? (
            <Button
              type="button"
              size="sm"
              className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
              onClick={() => setShowForm((v) => !v)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {showForm ? 'Close' : 'Add event'}
            </Button>
          ) : null
        }
      >
        {showForm && canAddEvent ? (
          <div className="mb-4 space-y-3 rounded-2xl border border-[#dce6e3] bg-white p-3.5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a9a96]">
              New event · {selectedDayLabel}
            </p>
            {!defaultProjectId && projects.length > 0 && (
              <select
                className="h-10 w-full rounded-md border border-[var(--color-input)] bg-white px-3 text-sm"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            )}
            <Input placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded-md border border-[var(--color-input)] bg-white px-3 text-sm"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <Textarea
              placeholder="Notes (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {createError ? <Alert variant="destructive">{createError}</Alert> : null}
            <Button
              type="button"
              className="w-full rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
              disabled={createPending || title.trim().length < 1 || (!defaultProjectId && !projectId)}
              onClick={() => void submitEvent()}
            >
              {createPending ? 'Saving…' : 'Save event'}
            </Button>
          </div>
        ) : null}

        {selectedEvents.length === 0 && !showForm ? (
          <div className="rounded-2xl border border-dashed border-[#dce6e3] bg-[#f7faf9] px-4 py-8 text-center">
            <p className="text-sm font-medium text-[#0d2a28]">No events on this day</p>
            <p className="mt-1 text-xs text-[#6b7c78]">
              {canAddEvent
                ? 'Select this date and click Add event to schedule something.'
                : 'Planned phase deadlines and milestones will appear here when scheduled.'}
            </p>
            {canAddEvent ? (
              <Button
                type="button"
                className="mt-4 rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
                onClick={() => setShowForm(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add event
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-3">
            {selectedEvents.map((event) => {
              const projectName = event.projectTitle ?? projectTitle
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-[#e2ebe8] bg-white p-3.5 text-left transition hover:border-[#0d2a28]/25 hover:shadow-[0_10px_24px_rgba(13,42,40,0.08)]"
                    onClick={() => onSelectEvent?.(event)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-[#0d2a28]">{event.title}</p>
                      <Badge variant="outline" className="shrink-0 capitalize">
                        {eventTypeLabel(event.event_type)}
                      </Badge>
                    </div>
                    {(showProject || projectName) && (
                      <p className="mt-1.5 text-xs font-medium text-[var(--color-primary)]">
                        Project: {projectName ?? '—'}
                      </p>
                    )}
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[#6b7c78]">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDate(event.starts_at)}
                    </p>
                    {event.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#5a6d68]">{event.description}</p>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </SoftCard>
    </div>
  )
}
