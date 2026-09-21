import { SectionHeader, StatePanel } from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { projectService } from '@/services/projectService'
import type { AIMessage, Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText, MessageSquareText, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'

export function ProjectRequirementsPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()

  const conversationsQuery = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => projectService.listConversations(id!, 'requirement_discovery'),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const activeConversationId = conversationId ?? (conversationsQuery.data?.[0]?.id as string | undefined)

  const messagesQuery = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => projectService.listMessages(activeConversationId!),
    enabled: !!activeConversationId,
    refetchInterval: PROJECT_LIVE_MS,
  })

  useEffect(() => {
    if (!conversationId && conversationsQuery.data?.[0]?.id) {
      setConversationId(String(conversationsQuery.data[0].id))
    }
  }, [conversationsQuery.data, conversationId])

  const chatMutation = useMutation({
    mutationFn: (msg: string) => projectService.requirementChat(id!, msg, activeConversationId),
    onSuccess: (res) => {
      setConversationId(res.conversation_id)
      setMessage('')
      void queryClient.invalidateQueries({ queryKey: ['conversations', id] })
      void queryClient.invalidateQueries({ queryKey: ['messages', res.conversation_id] })
    },
  })

  const generateDocsMutation = useMutation({
    mutationFn: () => projectService.generateDocument({ project_id: id!, document_type: 'all' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', id, 'documents'] })
      navigate(`/projects/${id}/documents`)
    },
  })

  const messages: AIMessage[] = messagesQuery.data ?? []
  const hasHistory = (conversationsQuery.data?.length ?? 0) > 0 || messages.length > 0

  return (
    <div className="space-y-6">
      <SectionHeader
        live
        title="Requirements workspace"
        description="AI discovery conversation for this project. When ready, generate the full document package."
        saved={hasHistory}
        actions={
          <Button
            className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
            onClick={() => generateDocsMutation.mutate()}
            disabled={generateDocsMutation.isPending}
          >
            <FileText className="mr-2 h-4 w-4" />
            {generateDocsMutation.isPending ? 'Generating documents…' : 'Generate Documents'}
          </Button>
        }
      />

      {generateDocsMutation.isError && (
        <Alert variant="destructive">{(generateDocsMutation.error as Error).message}</Alert>
      )}
      {generateDocsMutation.isSuccess && (
        <Alert>
          Documents generated. Opening the Documents workspace…{' '}
          <Link to={`/projects/${id}/documents`} className="font-semibold underline">
            View documents
          </Link>
        </Alert>
      )}

      <Card className="overflow-hidden rounded-[22px] border-[#e2ebe8] shadow-[0_14px_40px_rgba(13,42,40,0.05)]">
        <div className="flex items-center justify-between border-b border-[#eef3f1] bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="font-semibold">AI requirement discussion</h3>
          </div>
          {(conversationsQuery.data?.length ?? 0) > 1 && (
            <select
              className="rounded-md border border-[var(--color-border)] bg-white px-2 py-1 text-sm"
              value={activeConversationId ?? ''}
              onChange={(e) => setConversationId(e.target.value)}
            >
              {(conversationsQuery.data ?? []).map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.title ?? 'Conversation')} · {String(c.created_at ?? '').slice(0, 10)}
                </option>
              ))}
            </select>
          )}
        </div>
        <CardContent className="p-0">
          <StatePanel
            isLoading={conversationsQuery.isLoading || (!!activeConversationId && messagesQuery.isLoading)}
            isError={conversationsQuery.isError || messagesQuery.isError}
            error={(conversationsQuery.error || messagesQuery.error) as Error | null}
            isEmpty={!activeConversationId && messages.length === 0 && !chatMutation.isPending}
            emptyTitle="Start the discovery conversation"
            emptyDescription={`Tell the AI what ${project.title} needs to achieve.`}
          >
            <div className="max-h-[520px] space-y-3 overflow-y-auto bg-[linear-gradient(180deg,#f8fafb,white)] px-5 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'ml-10 bg-[var(--color-primary)] text-white'
                      : 'mr-10 border border-[var(--color-border)] bg-white'
                  }`}
                >
                  <p
                    className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${
                      m.role === 'user' ? 'text-white/70' : 'text-[var(--color-muted-foreground)]'
                    }`}
                  >
                    {m.role === 'user' ? 'You' : 'Requirement AI'}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                </div>
              ))}
            </div>
          </StatePanel>

          {chatMutation.isError && (
            <Alert variant="destructive" className="m-4">
              {(chatMutation.error as Error).message}
            </Alert>
          )}

          <div className="flex gap-2 border-t border-[var(--color-border)] bg-white p-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe goals, users, pages, constraints…"
              rows={3}
              className="flex-1"
            />
            <Button
              className="self-end"
              onClick={() => message.trim() && chatMutation.mutate(message.trim())}
              disabled={chatMutation.isPending || !message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
