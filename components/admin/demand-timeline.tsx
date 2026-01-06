"use client";

import { useEffect, useState } from "react";
import { getDemandEvents } from "@/app/actions/demands";
import { Loader2, MessageSquare, Clock, UserCheck, Calendar } from "lucide-react";
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

interface TimelineEvent {
  id: string;
  authorUserId: string;
  authorName: string;
  eventType: string;
  body: string;
  createdAt: string;
}

interface DemandTimelineProps {
  demandId: string;
}

const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "comment":
      return MessageSquare;
    case "status_change":
      return Clock;
    case "assignment_change":
      return UserCheck;
    case "deadline_change":
      return Calendar;
    default:
      return MessageSquare;
  }
};

const getEventLabel = (eventType: string) => {
  switch (eventType) {
    case "comment":
      return "Comentário";
    case "status_change":
      return "Mudança de Status";
    case "assignment_change":
      return "Atribuição";
    case "deadline_change":
      return "Prazo";
    default:
      return "Evento";
  }
};

export default function DemandTimeline({ demandId }: DemandTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, [demandId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const result = await getDemandEvents(demandId);
      if (result.ok) {
        setEvents(result.data);
      }
    } catch (error) {
      console.error("Load events error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhum evento registrado ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = getEventIcon(event.eventType);
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-primary/10 p-2">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              {!isLast && (
                <div className="w-px h-full bg-border mt-2 min-h-[40px]" />
              )}
            </div>

            {/* Event content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{event.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {getEventLabel(event.eventType)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(event.createdAt)}
                </span>
              </div>
              {event.body && (
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                  {event.body}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

