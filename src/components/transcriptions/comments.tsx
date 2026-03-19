"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare, Trash2, Clock, Send } from "lucide-react"

// --- Types ---

interface TranscriptComment {
  id: string
  app_user_id: string
  user_name: string
  user_email: string
  content: string
  timestamp_ref: number | null
  created_at: string
}

interface CommentsProps {
  transcriptionId: string
  currentUserId: string
  currentUserName: string
  currentUserEmail: string
  onTimestampClick?: (seconds: number) => void
}

// --- Helpers ---

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

function getInitials(name: string, email: string): string {
  if (name && name.trim()) {
    return name
      .split(" ")
      .map((w: string) => w[0] || "")
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return (email || "?")[0].toUpperCase()
}

// --- Component ---

export default function TranscriptComments({
  transcriptionId,
  currentUserId,
  currentUserName,
  currentUserEmail,
  onTimestampClick,
}: CommentsProps) {
  const [comments, setComments] = useState<TranscriptComment[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [content, setContent] = useState("")
  const [timestampRef, setTimestampRef] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(
        `/api/data/comments?transcription_id=${encodeURIComponent(transcriptionId)}`,
        { credentials: "include" }
      )
      if (!res.ok) {
        throw new Error("Не вдалося завантажити коментарі")
      }
      const data: any = await res.json()
      setComments(data.comments || [])
    } catch (err: any) {
      setError(err.message || "Помилка завантаження")
    } finally {
      setLoading(false)
    }
  }, [transcriptionId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Add comment
  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) return

    setSubmitting(true)
    setError(null)

    // Parse timestamp ref (mm:ss or hh:mm:ss)
    let parsedTimestamp: number | null = null
    if (timestampRef.trim()) {
      const parts = timestampRef.trim().split(":").map(Number)
      if (parts.length === 2 && parts.every((p: number) => !isNaN(p))) {
        parsedTimestamp = parts[0] * 60 + parts[1]
      } else if (parts.length === 3 && parts.every((p: number) => !isNaN(p))) {
        parsedTimestamp = parts[0] * 3600 + parts[1] * 60 + parts[2]
      }
    }

    try {
      const res = await fetch("/api/data/comments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcription_id: transcriptionId,
          app_user_id: currentUserId,
          user_name: currentUserName,
          user_email: currentUserEmail,
          content: trimmed,
          timestamp_ref: parsedTimestamp,
        }),
      })
      if (!res.ok) {
        throw new Error("Не вдалося додати коментар")
      }
      setContent("")
      setTimestampRef("")
      await fetchComments()
    } catch (err: any) {
      setError(err.message || "Помилка додавання")
    } finally {
      setSubmitting(false)
    }
  }

  // Delete comment
  const handleDelete = async (commentId: string) => {
    setError(null)
    try {
      const res = await fetch("/api/data/comments", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, transcription_id: transcriptionId }),
      })
      if (!res.ok) {
        throw new Error("Не вдалося видалити коментар")
      }
      await fetchComments()
    } catch (err: any) {
      setError(err.message || "Помилка видалення")
    }
  }

  // Key handler for input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Коментарі
          {comments.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {comments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Add comment form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Написати коментар..."
              value={content}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setContent(e.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={submitting}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              disabled={submitting || !content.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Мітка часу (мм:сс)"
              value={timestampRef}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTimestampRef(e.target.value)
              }
              disabled={submitting}
              className="w-40 h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">
              необов&apos;язково
            </span>
          </div>
        </div>

        {/* Comments list */}
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Завантаження...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Ще немає коментарів. Будьте першим!
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment: TranscriptComment) => (
              <div
                key={comment.id}
                className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user_name, comment.user_email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {comment.user_name || comment.user_email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                    {comment.timestamp_ref !== null &&
                      comment.timestamp_ref !== undefined && (
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() =>
                            onTimestampClick &&
                            onTimestampClick(comment.timestamp_ref as number)
                          }
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimestamp(comment.timestamp_ref)}
                        </Badge>
                      )}
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
                {comment.app_user_id === currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
