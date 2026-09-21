import {
  DetailDialog,
  SectionHeader,
  SoftCard,
  StatePanel,
  formatDate,
} from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { projectService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import type { Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Check, ExternalLink, MessageSquare, Send, Video, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'

const CONNECT_LIVE_MS = 3_000

type Row = Record<string, unknown>

function toLocalInputValue(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ProjectConnectPage() {
  const { id } = useParams<{ id: string }>()
  const outlet = useOutletContext<{ project?: Project } | null>()
  const project = outlet?.project
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const myId = profile?.id ? String(profile.id) : ''

  const [draft, setDraft] = useState('')
  const [subject, setSubject] = useState('')
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(new Date(Date.now() + 86400000)))
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Row | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const messagesQuery = useQuery({
    queryKey: ['connect-messages', id],
    queryFn: () => projectService.listConnectMessages(id!),
    enabled: !!id,
    refetchInterval: CONNECT_LIVE_MS,
  })

  const meetingsQuery = useQuery({
    queryKey: ['connect-meetings', id],
    queryFn: () => projectService.listMeetings(id!),
    enabled: !!id,
    refetchInterval: CONNECT_LIVE_MS,
  })

  const messages = messagesQuery.data ?? []
  const meetings = meetingsQuery.data ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['connect-messages', id] }),
      queryClient.invalidateQueries({ queryKey: ['connect-meetings', id] }),
      queryClient.invalidateQueries({ queryKey: ['calendar', id] }),
    ])
  }

  const sendMut = useMutation({
    mutationFn: () => projectService.sendConnectMessage(id!, draft.trim()),
    onSuccess: async () => {
      setDraft('')
      setError(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const scheduleMut = useMutation({
    mutationFn: () =>
      projectService.scheduleMeeting(id!, {
        subject: subject.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: duration,
        notes: notes.trim() || undefined,
        meeting_type: 'client_freelancer',
      }),
    onSuccess: async () => {
      setSubject('')
      setNotes('')
      setError(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const approveMut = useMutation({
    mutationFn: (meetingId: string) => projectService.approveMeeting(meetingId),
    onSuccess: async () => {
      setError(null)
      setSelectedMeeting(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const rejectMut = useMutation({
    mutationFn: (meetingId: string) => projectService.rejectMeeting(meetingId, 'Declined from Connect'),
    onSuccess: async () => {
      setError(null)
      setSelectedMeeting(null)
      await invalidate()
    },
    onError: (err: Error) => setError(err.message),
  })

  const pendingForMe = useMemo(
    () =>
      meetings.filter(
        (m) =>
          String(m.status) === 'pending_approval' &&
          String(m.requires_approval_from || '') === myId,
      ),
    [meetings, myId],
  )

  const freelancerAssigned = Boolean(project?.assigned_freelancer_id)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Connect"
        description="Realtime chat with your collaborator, plus Google Meet scheduling with mutual approval and calendar sync."
      />

      {error && <Alert variant="destructive">{error}</Alert>}

      {!freelancerAssigned && (
        <Alert>
          Assign a freelancer from Matching before chat and meetings can reach both sides.
        </Alert>
      )}

      {pendingForMe.length > 0 && (
        <Alert>
          You have {pendingForMe.length} meeting request(s) waiting for your approval.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <SoftCard
          title="Live chat"
          subtitle="Messages refresh every few seconds"
          action={<Badge variant="outline"><MessageSquare className="mr-1 h-3.5 w-3.5" />Realtime</Badge>}
        >
          <StatePanel
            isLoading={messagesQuery.isLoading && messages.length === 0}
            isError={messagesQuery.isError}
            error={messagesQuery.error as Error | null}
            isEmpty={false}
          >
            <div className="flex h-[420px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-[#f7faf9] p-3">
                {messages.length === 0 ? (
                  <p className="py-16 text-center text-sm text-[#6b7c78]">
                    No messages yet. Say hello to start the conversation.
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = String(m.sender_id) === myId
                    return (
                      <div key={String(m.id)} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                            mine
                              ? 'bg-[#0d2a28] text-white'
                              : String(m.message_type) === 'meeting_share'
                                ? 'border border-[#d7e4e0] bg-white text-[#0d2a28]'
                                : 'bg-white text-[#0d2a28] shadow-sm'
                          }`}
                        >
                          {!mine && (
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6b7c78]">
                              {String(m.sender_name || 'Collaborator')}
                            </p>
                          )}
                          <p className="whitespace-pre-wrap leading-relaxed">{String(m.body)}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-[#8a9a96]'}`}>
                            {formatDate(m.created_at ? String(m.created_at) : null)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (!draft.trim() || sendMut.isPending) return
                  sendMut.mutate()
                }}
              >
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  className="min-h-[52px] resize-none rounded-2xl"
                />
                <Button type="submit" className="h-[52px] rounded-2xl px-4" disabled={!draft.trim() || sendMut.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </StatePanel>
        </SoftCard>

        <div className="space-y-6">
          <SoftCard
            title="Schedule Google Meet"
            subtitle="Creates a Meet link, emails both parties, and waits for approval"
            action={<Video className="h-4 w-4 text-[var(--color-primary)]" />}
          >
            <div className="space-y-3">
              <div>
                <p className="mb-1 text-xs text-[#6b7c78]">Subject</p>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Kickoff / progress review / demo"
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Date & time</p>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-[#6b7c78]">Duration (minutes)</p>
                  <Input
                    type="number"
                    min={15}
                    max={480}
                    step={15}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value) || 60)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-[#6b7c78]">Notes (optional)</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agenda or prep notes"
                  className="min-h-[72px] rounded-xl"
                />
              </div>
              <Button
                className="w-full rounded-xl"
                disabled={!subject.trim() || !scheduledAt || scheduleMut.isPending || !freelancerAssigned}
                onClick={() => scheduleMut.mutate()}
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                {scheduleMut.isPending ? 'Scheduling…' : 'Schedule & notify'}
              </Button>
              <p className="text-xs text-[#6b7c78]">
                Both registered emails get the Meet link automatically. The other party must approve before it is confirmed on the calendar.
              </p>
            </div>
          </SoftCard>

          <SoftCard title="Meetings" subtitle="Approve, reject, or open the Meet link">
            <StatePanel
              isLoading={meetingsQuery.isLoading && meetings.length === 0}
              isError={meetingsQuery.isError}
              error={meetingsQuery.error as Error | null}
              isEmpty={meetings.length === 0}
              emptyTitle="No meetings yet"
              emptyDescription="Schedule a Google Meet to collaborate live."
            >
              <div className="space-y-3">
                {meetings.map((m) => {
                  const status = String(m.status || 'pending_approval')
                  const canAct =
                    status === 'pending_approval' && String(m.requires_approval_from || '') === myId
                  return (
                    <button
                      key={String(m.id)}
                      type="button"
                      onClick={() => setSelectedMeeting(m)}
                      className="w-full rounded-2xl border border-[#e7efec] bg-[#fbfcfb] p-3 text-left transition hover:border-[var(--color-primary)]/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-[#0d2a28]">
                            {String(m.subject || m.title || 'Meeting')}
                          </p>
                          <p className="mt-1 text-xs text-[#6b7c78]">
                            {formatDate(m.scheduled_at ? String(m.scheduled_at) : null)} ·{' '}
                            {String(m.duration_minutes || 60)} min
                          </p>
                        </div>
                        <Badge
                          variant={
                            status === 'approved' || status === 'scheduled'
                              ? 'success'
                              : status === 'rejected' || status === 'cancelled'
                                ? 'destructive'
                                : 'warning'
                          }
                        >
                          {status.replaceAll('_', ' ')}
                        </Badge>
                      </div>
                      {canAct && (
                        <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={approveMut.isPending}
                            onClick={() => approveMut.mutate(String(m.id))}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={rejectMut.isPending}
                            onClick={() => rejectMut.mutate(String(m.id))}
                          >
                            <X className="mr-1 h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </StatePanel>
          </SoftCard>

          <p className="text-center text-xs text-[#6b7c78]">
            Confirmed meetings also appear on{' '}
            <Link className="text-[var(--color-primary)] underline" to={`/projects/${id}/calendar`}>
              Calendar
            </Link>
            .
          </p>
        </div>
      </div>

      <DetailDialog
        open={!!selectedMeeting}
        onOpenChange={(open) => !open && setSelectedMeeting(null)}
        title={String(selectedMeeting?.subject || selectedMeeting?.title || 'Meeting')}
        description="Meeting details and Google Meet access"
      >
        {selectedMeeting && (
          <div className="space-y-3 text-sm">
            <Badge variant="outline">{String(selectedMeeting.status).replaceAll('_', ' ')}</Badge>
            <p>
              <span className="text-[#6b7c78]">When:</span>{' '}
              {formatDate(selectedMeeting.scheduled_at ? String(selectedMeeting.scheduled_at) : null)}
            </p>
            <p>
              <span className="text-[#6b7c78]">Duration:</span> {String(selectedMeeting.duration_minutes || 60)} minutes
            </p>
            {selectedMeeting.notes ? (
              <p className="leading-relaxed text-[#4d615c]">{String(selectedMeeting.notes)}</p>
            ) : null}
            {selectedMeeting.meeting_url ? (
              <a
                href={String(selectedMeeting.meeting_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0d2a28] px-4 py-2 text-white"
              >
                Open Google Meet <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <p className="text-[#6b7c78]">Meet link will appear once generated.</p>
            )}
            {String(selectedMeeting.status) === 'pending_approval' &&
              String(selectedMeeting.requires_approval_from || '') === myId && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="rounded-xl"
                    disabled={approveMut.isPending}
                    onClick={() => approveMut.mutate(String(selectedMeeting.id))}
                  >
                    Approve meeting
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={rejectMut.isPending}
                    onClick={() => rejectMut.mutate(String(selectedMeeting.id))}
                  >
                    Reject
                  </Button>
                </div>
              )}
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
