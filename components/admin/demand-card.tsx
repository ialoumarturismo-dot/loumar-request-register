"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/types/database";
import { User, Calendar, AlertCircle, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import PrioritySelect from "./priority-select";
import ViewAttachment from "./view-attachment";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface DemandCardProps {
  demand: Demand;
  onClick?: () => void;
  className?: string;
  onDemandUpdate?: (id: string, patch: Partial<Demand>) => void;
  onDemandRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  isDemandUpdating?: (id: string) => boolean;
  setDemandUpdating?: (id: string, isUpdating: boolean) => void;
}

const getAdminStatusColor = (status: string | null): string => {
  const colors: Record<string, string> = {
    "Em análise": "bg-blue-500",
    Acatada: "bg-green-500",
    Resolvida: "bg-emerald-500",
    Descartada: "bg-gray-500",
  };
  return colors[status || "Em análise"] || "bg-gray-500";
};

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

const truncateText = (text: string, maxLength: number = 100) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export default function DemandCard({
  demand,
  onClick,
  className,
  onDemandUpdate,
  onDemandRollback,
  getDemandById,
  isDemandUpdating,
  setDemandUpdating,
}: DemandCardProps) {
  const adminStatus = demand.admin_status || "Em análise";

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:shadow-sm hover:-translate-y-[1px] hover:border-primary/40 active:translate-y-0",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-1.5 pt-2.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 pr-1">
            <h3 className="font-semibold text-[13px] leading-snug tracking-tight line-clamp-2 text-foreground">
              {demand.name}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
              <span className="truncate">{demand.department}</span>
              <span className="mx-1 opacity-60">•</span>
              <span className="truncate">{demand.demand_type}</span>
            </p>
          </div>

          {/* Prioridade editável no canto superior direito */}
          <div className="shrink-0 min-w-fit">
            <PrioritySelect
              demandId={demand.id}
              currentPriority={demand.priority}
              onUpdate={onDemandUpdate}
              onRollback={onDemandRollback}
              getDemandById={getDemandById}
              isUpdating={isDemandUpdating?.(demand.id)}
              setUpdating={(updating) =>
                setDemandUpdating?.(demand.id, updating)
              }
              variant="badge"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-2.5 space-y-2">
        {/* Setor/Sistema e Badges (compacto) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground min-w-0">
            <Layers className="h-3 w-3 shrink-0 opacity-70" />
            <span className="truncate">{demand.system_area}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant={
                demand.impact_level === "Bloqueante"
                  ? "destructive"
                  : demand.impact_level === "Alto"
                  ? "default"
                  : "secondary"
              }
              className={cn(
                "text-[9px] px-1.5 py-0.5 rounded-md leading-none",
                demand.impact_level === "Bloqueante"
                  ? "opacity-100"
                  : "opacity-85"
              )}
            >
              {demand.impact_level}
            </Badge>
          </div>
        </div>

        {/* Descrição (máx 2 linhas + fade) */}
        <div className="relative">
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2 pr-8">
            {truncateText(demand.description, 120)}
          </p>
          <div className="pointer-events-none absolute bottom-0 right-0 h-5 w-10 bg-gradient-to-l from-card via-card/80 to-transparent" />
        </div>

        {/* Metadados (compacto) */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[10px] text-muted-foreground/90">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(demand.created_at)}</span>
          </div>
          {demand.attachment_urls && demand.attachment_urls.length > 0 && (
            <ViewAttachment
              attachmentPaths={demand.attachment_urls}
              variant="icon"
              title="Ver anexos"
            />
          )}
          {demand.assigned_to ? (
            <div className="flex items-center gap-1 max-w-[45%]">
              <User className="h-3 w-3" />
              <span className="truncate">{demand.assigned_to}</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
