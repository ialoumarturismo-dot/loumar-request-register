"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDemands } from "@/app/actions/demands";
import DemandsTable from "@/components/admin/demands-table";
import DemandsKanban from "@/components/admin/demands-kanban";
import DemandDetailModal from "@/components/admin/demand-detail-modal";
import DemandFilters, {
  type FilterValues,
} from "@/components/admin/demand-filters";
import DemandCard from "@/components/admin/demand-card";
import type { Database } from "@/types/database";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

type ViewMode = "kanban" | "list" | "cards";

export default function AdminPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    adminStatus: "Todos",
    impactLevel: "Todos",
    department: "Todos",
    search: "",
  });
  // Proteção contra race conditions: rastrear updates em andamento
  const [updatingDemands, setUpdatingDemands] = useState<Set<string>>(
    new Set()
  );

  // Carregar demandas ao montar componente
  useEffect(() => {
    loadDemands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDemands = async () => {
    setLoading(true);
    try {
      const result = await getDemands();
      if (result.ok) {
        setDemands(result.data);
        // Atualizar demanda selecionada se o modal estiver aberto
        if (selectedDemand) {
          const updatedDemand = result.data.find(
            (d) => d.id === selectedDemand.id
          );
          if (updatedDemand) {
            setSelectedDemand(updatedDemand);
          }
        }
      } else {
        toast.error("Erro ao carregar demandas", {
          description: result.error,
        });
        if (result.error === "Não autenticado") {
          router.push("/login");
        }
      }
    } catch (error) {
      console.error("Load demands error:", error);
      toast.error("Erro inesperado", {
        description: "Não foi possível carregar as demandas.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Refetch silencioso para atualizar demanda específica sem loading global
  // Usa requestIdleCallback para evitar pulos visuais durante o refetch
  const refreshDemand = useCallback(
    async (demandId: string) => {
      // Aguardar um frame para garantir que o optimistic update já foi renderizado
      await new Promise((resolve) => requestAnimationFrame(resolve));

      try {
        const result = await getDemands();
        if (result.ok) {
          // Atualizar lista de demandas
          setDemands((prev) => {
            const updated = result.data;
            return updated;
          });

          // Atualizar demanda selecionada de forma suave se for a mesma
          if (selectedDemand?.id === demandId) {
            const updatedDemand = result.data.find((d) => d.id === demandId);
            if (updatedDemand) {
              // Usar requestIdleCallback para atualizar quando o browser estiver ocioso
              if ("requestIdleCallback" in window) {
                requestIdleCallback(() => {
                  setSelectedDemand(updatedDemand);
                });
              } else {
                // Fallback para browsers sem suporte
                setTimeout(() => {
                  setSelectedDemand(updatedDemand);
                }, 100);
              }
            }
          }
        }
      } catch (error) {
        console.error("Refresh demand error:", error);
        // Silencioso - não mostrar toast para não interromper UX
      }
    },
    [selectedDemand?.id]
  );

  // Funções utilitárias para gerenciamento de estado local
  const applyDemandPatch = useCallback(
    (id: string, patch: Partial<Demand>) => {
      setDemands((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
      // Atualizar também selectedDemand se for a mesma
      if (selectedDemand?.id === id) {
        setSelectedDemand((prev) => (prev ? { ...prev, ...patch } : null));
      }
    },
    [selectedDemand]
  );

  const rollbackDemand = useCallback(
    (id: string, previous: Demand) => {
      setDemands((prev) => prev.map((d) => (d.id === id ? previous : d)));
      // Atualizar também selectedDemand se for a mesma
      if (selectedDemand?.id === id) {
        setSelectedDemand(previous);
      }
    },
    [selectedDemand]
  );

  const getDemandById = useCallback(
    (id: string): Demand | undefined => {
      return demands.find((d) => d.id === id);
    },
    [demands]
  );

  const handleDemandUpdate = useCallback(
    (id: string, patch: Partial<Demand>) => {
      applyDemandPatch(id, patch);
    },
    [applyDemandPatch]
  );

  const isDemandUpdating = useCallback(
    (id: string) => {
      return updatingDemands.has(id);
    },
    [updatingDemands]
  );

  const setDemandUpdating = useCallback((id: string, isUpdating: boolean) => {
    setUpdatingDemands((prev) => {
      const next = new Set(prev);
      if (isUpdating) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  // Filtrar e ordenar demandas
  const filteredDemands = useMemo(() => {
    let filtered = [...demands];

    // Filtro por status administrativo
    if (filters.adminStatus !== "Todos") {
      filtered = filtered.filter(
        (d) => (d.admin_status || "Em análise") === filters.adminStatus
      );
    }

    // Filtro por impacto
    if (filters.impactLevel !== "Todos") {
      filtered = filtered.filter((d) => d.impact_level === filters.impactLevel);
    }

    // Filtro por setor
    if (filters.department !== "Todos") {
      filtered = filtered.filter((d) => d.department === filters.department);
    }

    // Filtro por busca de texto
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(searchLower) ||
          d.description.toLowerCase().includes(searchLower) ||
          d.system_area.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por prioridade (Urgente > Importante > Necessário > Interessante)
    filtered.sort((a, b) => {
      const priorityOrder: Record<string, number> = {
        Urgente: 4,
        Importante: 3,
        Necessário: 2,
        Interessante: 1,
      };
      const orderA = priorityOrder[a.priority || "Interessante"] || 0;
      const orderB = priorityOrder[b.priority || "Interessante"] || 0;
      return orderB - orderA;
    });

    return filtered;
  }, [demands, filters]);

  const handleDemandClick = (demand: Demand) => {
    setSelectedDemand(demand);
    setIsModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedDemand(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com controles */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Gestão de Demandas
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Visualize e gerencie todas as demandas registradas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("kanban")}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4 mr-2" />
            Lista
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <DemandFilters filters={filters} onFiltersChange={setFilters} />

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {demands.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Em Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {
                demands.filter(
                  (d) => (d.admin_status || "Em análise") === "Em análise"
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Acatadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {demands.filter((d) => d.admin_status === "Acatada").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Resolvidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {demands.filter((d) => d.admin_status === "Resolvida").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo principal */}
      {filteredDemands.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {demands.length === 0
                ? "Nenhuma demanda registrada ainda."
                : "Nenhuma demanda corresponde aos filtros selecionados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === "kanban" ? (
            <DemandsKanban
              demands={filteredDemands}
              onDemandClick={handleDemandClick}
              onDemandUpdate={handleDemandUpdate}
              onDemandRollback={rollbackDemand}
              getDemandById={getDemandById}
              isDemandUpdating={isDemandUpdating}
              setDemandUpdating={setDemandUpdating}
            />
          ) : viewMode === "list" ? (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <DemandsTable
                  demands={filteredDemands}
                  onDemandClick={handleDemandClick}
                  onDemandUpdate={handleDemandUpdate}
                  onDemandRollback={rollbackDemand}
                  getDemandById={getDemandById}
                  isDemandUpdating={isDemandUpdating}
                  setDemandUpdating={setDemandUpdating}
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDemands.map((demand) => (
                <DemandCard
                  key={demand.id}
                  demand={demand}
                  onClick={() => handleDemandClick(demand)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de detalhes */}
      <DemandDetailModal
        demand={selectedDemand}
        open={isModalOpen}
        onOpenChange={handleModalClose}
        onDemandUpdate={handleDemandUpdate}
        onDemandRollback={rollbackDemand}
        getDemandById={getDemandById}
        onRefresh={
          selectedDemand ? () => refreshDemand(selectedDemand.id) : undefined
        }
        onDemandDeleted={(deletedId) => {
          // Remover demanda da lista local imediatamente (optimistic update)
          setDemands((prev) => prev.filter((d) => d.id !== deletedId));
          // Fechar modal e limpar seleção
          setSelectedDemand(null);
          setIsModalOpen(false);
          // Recarregar lista do servidor para garantir sincronização completa
          // Usar setTimeout para evitar conflito com o router.refresh()
          setTimeout(() => {
            loadDemands();
          }, 100);
        }}
      />
    </div>
  );
}
