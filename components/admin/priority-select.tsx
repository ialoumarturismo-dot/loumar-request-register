"use client";

import { useTransition } from "react";
import { updatePriority } from "@/app/actions/demands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Database } from "@/types/database";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface PrioritySelectProps {
  demandId: string;
  currentPriority: string | null;
  onUpdate?: (id: string, patch: Partial<Demand>) => void;
  onRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  isUpdating?: boolean;
  setUpdating?: (isUpdating: boolean) => void;
  className?: string;
  variant?: "badge" | "select";
  onSuccess?: () => void;
}

const priorityOptions = [
  { value: "Interessante", label: "Interessante", order: 1 },
  { value: "Necessário", label: "Necessário", order: 2 },
  { value: "Importante", label: "Importante", order: 3 },
  { value: "Urgente", label: "Urgente", order: 4 },
] as const;

const getPriorityColor = (priority: string | null): string => {
  if (!priority) return "bg-gray-500";
  switch (priority) {
    case "Urgente":
      return "bg-red-500";
    case "Importante":
      return "bg-orange-500";
    case "Necessário":
      return "bg-yellow-500";
    case "Interessante":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

const getPriorityVariant = (
  priority: string | null
): "destructive" | "default" | "secondary" | "outline" => {
  if (!priority) return "outline";
  switch (priority) {
    case "Urgente":
      return "destructive";
    case "Importante":
      return "default";
    case "Necessário":
      return "secondary";
    case "Interessante":
      return "outline";
    default:
      return "outline";
  }
};

export default function PrioritySelect({
  demandId,
  currentPriority,
  onUpdate,
  onRollback,
  getDemandById,
  isUpdating,
  setUpdating,
  className,
  variant = "select",
  onSuccess,
}: PrioritySelectProps) {
  const [isPending, startTransition] = useTransition();
  const isDisabled = isPending || isUpdating;
  const priority = currentPriority || "Interessante";

  const handlePriorityChange = (newPriority: string) => {
    if (newPriority === priority || isDisabled) return;

    setUpdating?.(true);

    const previousDemand = getDemandById?.(demandId);

    // Optimistic update
    onUpdate?.(demandId, { priority: newPriority });

    startTransition(async () => {
      try {
        const result = await updatePriority(demandId, newPriority);

        if (!result.ok) {
          if (onRollback && previousDemand) {
            onRollback(demandId, previousDemand);
          }
          toast.error("Não foi possível atualizar a prioridade.", {
            description: result.error || "Tente novamente.",
          });
          return;
        }

        toast.success("Atualizado");
        onSuccess?.();
      } finally {
        setUpdating?.(false);
      }
    });
  };

  if (variant === "badge") {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Select
          value={priority}
          onValueChange={handlePriorityChange}
          disabled={isDisabled}
        >
          <SelectTrigger
            className={cn(
              "h-auto p-0 border-0 bg-transparent hover:bg-transparent focus:ring-0 shadow-none [&>svg]:hidden w-auto min-w-fit",
              className
            )}
            aria-label="Alterar prioridade"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <SelectValue asChild>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md text-[10px] font-medium cursor-pointer transition-colors text-white hover:opacity-90 whitespace-nowrap",
                  getPriorityColor(priority)
                )}
              >
                <span className="max-w-[92px] truncate">{priority}</span>
                {isDisabled ? (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 opacity-80 shrink-0" />
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {priorityOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Select
      value={priority}
      onValueChange={handlePriorityChange}
      disabled={isDisabled}
    >
      <SelectTrigger
        className={cn(
          "relative h-8 text-xs rounded-md bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-border/60 hover:border-border focus:ring-1 focus:ring-ring/30 focus:ring-offset-0 transition-colors",
          className
        )}
        aria-label="Alterar prioridade"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <SelectValue />
        {isDisabled ? (
          <Loader2 className="h-3 w-3 animate-spin absolute right-2 text-muted-foreground" />
        ) : null}
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {priorityOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
