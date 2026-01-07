"use client";

import { useState } from "react";
import { updateAdminStatus } from "@/app/actions/demands";
import { toast } from "sonner";
import DemandCard from "./demand-card";
import CreateDemandModal from "./create-demand-modal";
import type { Database } from "@/types/database";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface DemandsKanbanProps {
  demands: Demand[];
  onDemandClick: (demand: Demand) => void;
  onDemandUpdate?: (id: string, patch: Partial<Demand>) => void;
  onDemandRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  isDemandUpdating?: (id: string) => boolean;
  setDemandUpdating?: (id: string, isUpdating: boolean) => void;
  onDemandCreated?: () => void;
}

const KANBAN_COLUMNS = [
  { id: "Em análise", label: "Em Análise", color: "bg-blue-500" },
  { id: "Acatada", label: "Acatada", color: "bg-green-500" },
  { id: "Resolvida", label: "Resolvida", color: "bg-emerald-500" },
  { id: "Descartada", label: "Descartada", color: "bg-gray-500" },
] as const;

export default function DemandsKanban({
  demands,
  onDemandClick,
  onDemandUpdate,
  onDemandRollback,
  getDemandById,
  isDemandUpdating,
  setDemandUpdating,
  onDemandCreated,
}: DemandsKanbanProps) {
  const [draggedDemand, setDraggedDemand] = useState<Demand | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalStatus, setCreateModalStatus] = useState<
    "Em análise" | "Acatada" | "Resolvida" | "Descartada"
  >("Em análise");

  // Agrupar demandas por admin_status
  const demandsByStatus = demands.reduce((acc, demand) => {
    const status = demand.admin_status || "Em análise";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(demand);
    return acc;
  }, {} as Record<string, Demand[]>);

  // Ordenar demandas por prioridade (Urgente > Importante > Necessário > Interessante)
  const sortByPriority = (a: Demand, b: Demand) => {
    const priorityOrder: Record<string, number> = {
      Urgente: 4,
      Importante: 3,
      Necessário: 2,
      Interessante: 1,
    };
    const orderA = priorityOrder[a.priority || "Interessante"] || 0;
    const orderB = priorityOrder[b.priority || "Interessante"] || 0;
    return orderB - orderA;
  };

  const handleDragStart = (demand: Demand) => {
    setDraggedDemand(demand);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedDemand) return;

    const currentStatus = draggedDemand.admin_status || "Em análise";
    if (currentStatus === targetColumnId) {
      setDraggedDemand(null);
      return;
    }

    // Bloquear atualizações simultâneas
    if (isDemandUpdating?.(draggedDemand.id)) {
      setDraggedDemand(null);
      return;
    }

    setDemandUpdating?.(draggedDemand.id, true);

    // Salvar estado anterior para rollback
    const previousDemand = getDemandById?.(draggedDemand.id) || draggedDemand;

    // Optimistic update
    if (onDemandUpdate) {
      onDemandUpdate(draggedDemand.id, { admin_status: targetColumnId });
    }

    try {
      // Atualizar status no backend
      const result = await updateAdminStatus(draggedDemand.id, targetColumnId);

      if (result.ok) {
        toast.success("Atualizado");
      } else {
        // Rollback em caso de erro
        if (onDemandRollback && previousDemand) {
          onDemandRollback(draggedDemand.id, previousDemand);
        }
        toast.error("Erro ao atualizar status", {
          description: result.error,
        });
      }
    } finally {
      setDemandUpdating?.(draggedDemand.id, false);
      setDraggedDemand(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedDemand(null);
    setDragOverColumn(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 h-[calc(100vh-360px)] min-h-[520px] items-start">
      {KANBAN_COLUMNS.map((column) => {
        const columnDemands = (demandsByStatus[column.id] || []).sort(
          sortByPriority
        );

        return (
          <div
            key={column.id}
            className={cn(
              "flex flex-col h-full rounded-lg border border-border/60 overflow-hidden bg-muted/20",
              dragOverColumn === column.id && "ring-1 ring-primary/15"
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Header da coluna */}
            <div
              className={cn(
                "px-3 py-2 text-white font-semibold text-[13px] flex items-center justify-between sticky top-0 z-10",
                column.color
              )}
            >
              <span>{column.label}</span>
              <div className="flex items-center gap-2">
                <span className="bg-white/15 px-2 py-0.5 rounded-full text-[11px] ring-1 ring-white/25">
                  {columnDemands.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white hover:bg-white/20 hover:text-white rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateModalStatus(
                      column.id as
                        | "Em análise"
                        | "Acatada"
                        | "Resolvida"
                        | "Descartada"
                    );
                    setCreateModalOpen(true);
                  }}
                  title={`Adicionar demanda em ${column.label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Área de drop */}
            <div
              className={cn(
                "flex-1 p-2 space-y-2 border-2 border-dashed transition-colors overflow-y-auto",
                dragOverColumn === column.id
                  ? "border-primary/30 bg-primary/3"
                  : "border-transparent bg-muted/30"
              )}
            >
              {/* Placeholder visível durante drag */}
              {dragOverColumn === column.id &&
              draggedDemand &&
              (draggedDemand.admin_status || "Em análise") !== column.id ? (
                <div className="h-11 rounded-md border border-dashed border-border/60 bg-muted/20 flex items-center justify-center text-[11px] text-muted-foreground">
                  Solte para mover
                </div>
              ) : null}

              {columnDemands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Nenhuma demanda
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => {
                      setCreateModalStatus(
                        column.id as
                          | "Em análise"
                          | "Acatada"
                          | "Resolvida"
                          | "Descartada"
                      );
                      setCreateModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar Demanda
                  </Button>
                </div>
              ) : (
                <>
                  {columnDemands.map((demand) => (
                    <div
                      key={demand.id}
                      draggable
                      onDragStart={() => handleDragStart(demand)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "transition-opacity",
                        draggedDemand?.id === demand.id && "opacity-50"
                      )}
                    >
                      <DemandCard
                        demand={demand}
                        onClick={() => onDemandClick(demand)}
                        className="cursor-grab active:cursor-grabbing"
                        onDemandUpdate={onDemandUpdate}
                        onDemandRollback={onDemandRollback}
                        getDemandById={getDemandById}
                        isDemandUpdating={isDemandUpdating}
                        setDemandUpdating={setDemandUpdating}
                      />
                    </div>
                  ))}
                  {/* Botão adicionar ao final da lista */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    onClick={() => {
                      setCreateModalStatus(
                        column.id as
                          | "Em análise"
                          | "Acatada"
                          | "Resolvida"
                          | "Descartada"
                      );
                      setCreateModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Adicionar Demanda
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal de criação de demanda */}
      <CreateDemandModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        initialAdminStatus={createModalStatus}
        onSuccess={() => {
          onDemandCreated?.();
        }}
      />
    </div>
  );
}
