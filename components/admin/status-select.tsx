"use client";

import { useTransition } from "react";
import { updateDemandStatus } from "@/app/actions/demands";
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

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface StatusSelectProps {
  demandId: string;
  currentStatus: string;
  onUpdate?: (id: string, patch: Partial<Demand>) => void;
  onRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  isUpdating?: boolean;
  setUpdating?: (isUpdating: boolean) => void;
  onSuccess?: () => void;
}

const statusOptions = ["Recebido", "Em análise", "Em execução", "Concluído"];

export default function StatusSelect({
  demandId,
  currentStatus,
  onUpdate,
  onRollback,
  getDemandById,
  isUpdating,
  setUpdating,
  onSuccess,
}: StatusSelectProps) {
  const [isPending, startTransition] = useTransition();
  const isDisabled = isPending || isUpdating;

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus || isDisabled) return;

    // Bloquear atualizações simultâneas
    setUpdating?.(true);

    // Salvar estado anterior para rollback
    const previousDemand = getDemandById?.(demandId);

    // Optimistic update
    if (onUpdate) {
      onUpdate(demandId, { status: newStatus });
    }

    startTransition(async () => {
      try {
        const result = await updateDemandStatus(demandId, newStatus);

        if (result.ok) {
          toast.success("Atualizado");
          onSuccess?.();
        } else {
          // Rollback em caso de erro
          if (onRollback && previousDemand) {
            onRollback(demandId, previousDemand);
          }
          toast.error("Erro ao atualizar status", {
            description: result.error || "Tente novamente.",
          });
        }
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
      <SelectTrigger className="w-[160px] h-9 text-xs pr-7 relative">
        <SelectValue />
        {isDisabled ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin absolute right-2 text-muted-foreground" />
        ) : null}
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
