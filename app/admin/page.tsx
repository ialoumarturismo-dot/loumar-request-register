"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getMyProfile } from "@/app/actions/users";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

type ViewMode = "kanban" | "list" | "cards";

export default function AdminPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "sector_user" | null>(
    null
  );
  const [filters, setFilters] = useState<FilterValues>({
    adminStatus: "Todos",
    impactLevel: "Todos",
    department: "Todos",
    destinationDepartment: "Todos",
    search: "",
    dateRange: null,
  });
  // Proteção contra race conditions: rastrear updates em andamento
  const [updatingDemands, setUpdatingDemands] = useState<Set<string>>(
    new Set()
  );

  // Carregar perfil e demandas ao montar componente
  useEffect(() => {
    loadProfile();
    loadDemands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Estado para rastrear se o modal foi fechado manualmente (para evitar reabertura)
  const wasClosedManuallyRef = useRef(false);
  const closingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isClosingRef = useRef(false);

  // Função helper para verificar URL e abrir modal
  const checkUrlAndOpenModal = useCallback(() => {
    if (typeof window === "undefined" || demands.length === 0 || isModalOpen)
      return;

    // Não reabrir se foi fechado manualmente recentemente
    if (wasClosedManuallyRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const demandId = params.get("demandId");

    if (demandId) {
      const demand = demands.find((d) => d.id === demandId);
      if (demand && (!selectedDemand || selectedDemand.id !== demandId)) {
        setSelectedDemand(demand);
        setIsModalOpen(true);
        wasClosedManuallyRef.current = false; // Reset flag quando abrir
      }
    }
  }, [demands, selectedDemand, isModalOpen]);

  // Abrir modal quando houver demandId na URL (quando demands mudarem)
  useEffect(() => {
    checkUrlAndOpenModal();
  }, [checkUrlAndOpenModal]);

  // Listener para mudanças na URL (popstate para back/forward)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      // Reset flag quando usuário navega com back/forward
      wasClosedManuallyRef.current = false;
      checkUrlAndOpenModal();
    };

    window.addEventListener("popstate", handlePopState);

    // Verificação periódica para capturar mudanças via router.push
    // (apenas quando não há modal aberto, para detectar quando alguém navega via URL)
    const interval = setInterval(() => {
      if (!isModalOpen && typeof window !== "undefined" && !wasClosedManuallyRef.current) {
        const params = new URLSearchParams(window.location.search);
        const demandId = params.get("demandId");
        // Só verificar se há demandId na URL mas modal não está aberto
        if (demandId && !selectedDemand) {
          checkUrlAndOpenModal();
        }
      }
    }, 300); // Verifica a cada 300ms apenas quando necessário

    return () => {
      window.removeEventListener("popstate", handlePopState);
      clearInterval(interval);
    };
  }, [checkUrlAndOpenModal, isModalOpen, selectedDemand]);

  const loadProfile = async () => {
    try {
      const result = await getMyProfile();
      if (result.ok) {
        setUserRole(result.data.role);
      }
    } catch (error) {
      console.error("Load profile error:", error);
    }
  };

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

    // Filtro por setor solicitante
    if (filters.department !== "Todos") {
      filtered = filtered.filter((d) => d.department === filters.department);
    }

    // Filtro por setor destinatário
    if (filters.destinationDepartment !== "Todos") {
      filtered = filtered.filter(
        (d) => d.destination_department === filters.destinationDepartment
      );
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

    // Filtro por período
    if (filters.dateRange?.from || filters.dateRange?.to) {
      filtered = filtered.filter((d) => {
        const demandDate = new Date(d.created_at);
        if (filters.dateRange?.from && filters.dateRange?.to) {
          return (
            demandDate >= filters.dateRange.from &&
            demandDate <= filters.dateRange.to
          );
        }
        if (filters.dateRange?.from) {
          return demandDate >= filters.dateRange.from;
        }
        if (filters.dateRange?.to) {
          return demandDate <= filters.dateRange.to;
        }
        return true;
      });
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
    // Atualizar URL para manter sincronização
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demandId") !== demand.id) {
        router.replace(`/admin?demandId=${demand.id}`, { scroll: false });
      }
    }
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // Evitar processar múltiplas vezes o mesmo evento de fechamento
      if (isClosingRef.current) {
        return;
      }

      isClosingRef.current = true;

      // Limpar timeout anterior se existir
      if (closingTimeoutRef.current) {
        clearTimeout(closingTimeoutRef.current);
      }

      // Marcar como fechado manualmente imediatamente
      wasClosedManuallyRef.current = true;
      
      // Fechar modal e limpar seleção
      setIsModalOpen(false);
      setSelectedDemand(null);

      // Remover demandId da URL imediatamente usando replace para não adicionar ao histórico
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("demandId")) {
          // Usar replace em vez de push para não adicionar entrada no histórico
          router.replace("/admin", { scroll: false });
        }
      }

      // Reset flags após um delay maior para garantir que a URL foi atualizada
      // e evitar race conditions com o intervalo de verificação
      closingTimeoutRef.current = setTimeout(() => {
        wasClosedManuallyRef.current = false;
        isClosingRef.current = false;
        closingTimeoutRef.current = null;
      }, 1000); // Aumentado para 1s para garantir que tudo foi processado
    } else {
      // Se estiver abrindo, resetar as flags
      wasClosedManuallyRef.current = false;
      isClosingRef.current = false;
      setIsModalOpen(true);
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
    <div className="space-y-4">
      {/* Filtros */}
      <DemandFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-xl font-bold text-foreground">
              {demands.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Em Análise</div>
            <div className="text-xl font-bold text-blue-500">
              {
                demands.filter(
                  (d) => (d.admin_status || "Em análise") === "Em análise"
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Acatadas</div>
            <div className="text-xl font-bold text-green-500">
              {demands.filter((d) => d.admin_status === "Acatada").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground mb-1">Resolvidas</div>
            <div className="text-xl font-bold text-emerald-500">
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
        userRole={userRole}
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
