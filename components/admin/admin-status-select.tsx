"use client";

import { useTransition } from "react";
import { updateAdminStatus } from "@/app/actions/demands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/types/database";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface AdminStatusSelectProps {
  demandId: string;
  currentStatus: string;
  onUpdate?: (id: string, patch: Partial<Demand>) => void;
  onRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  isUpdating?: boolean;
  setUpdating?: (isUpdating: boolean) => void;
  className?: string;
}

const adminStatusOptions = ["Em análise", "Acatada", "Resolvida", "Descartada"];

export default function AdminStatusSelect({
  demandId,
  currentStatus,
  onUpdate,
  onRollback,
  getDemandById,
  isUpdating,
  setUpdating,
  className,
}: AdminStatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const isDisabled = isPending || isUpdating;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus || isDisabled) return;

    setUpdating?.(true);

    const previousDemand = getDemandById?.(demandId);

    // Optimistic update (sem refetch)
    onUpdate?.(demandId, { admin_status: newStatus });

    startTransition(async () => {
      try {
        const result = await updateAdminStatus(demandId, newStatus);

        if (!result.ok) {
          if (onRollback && previousDemand) {
            onRollback(demandId, previousDemand);
          }
          toast.error("Não foi possível atualizar o status admin.", {
            description: result.error || "Tente novamente.",
          });
          return;
        }

        // Feedback discreto (sem mensagem redundante)
        toast.success("Atualizado");
      } finally {
        setUpdating?.(false);
      }
    });
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isDisabled}
    >
      <SelectTrigger
        className={cn(
          "relative h-8 text-xs rounded-md bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/60 hover:border-border focus:ring-1 focus:ring-ring/30 focus:ring-offset-0 transition-colors",
          className
        )}
        aria-label="Alterar status administrativo"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SelectValue />
        {isDisabled ? (
          <Loader2 className="h-3 w-3 animate-spin absolute right-7 text-muted-foreground" />
        ) : null}
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {adminStatusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
