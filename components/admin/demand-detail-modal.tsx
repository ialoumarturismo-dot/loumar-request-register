"use client";

import { useState, useTransition, useEffect } from "react";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import type { Database } from "@/types/database";
import {
  updateAdminStatus,
  updateAdminNotes,
  assignDemand,
} from "@/app/actions/demands";
import { listManagedUsers } from "@/app/actions/users";
import { toast } from "sonner";
import {
  User,
  Calendar,
  FileText,
  Layers,
  AlertCircle,
  Save,
  Loader2,
  X,
  MessageSquare,
  Waypoints,
  ClockCheck,
  Settings,
  Link2,
} from "lucide-react";
import ViewAttachment from "./view-attachment";
import ViewReferenceLinks from "./view-reference-links";
import PrioritySelect from "./priority-select";
import StatusSelect from "./status-select";
import DeleteDemandDialog from "./delete-demand-dialog";
import DemandTimeline from "./demand-timeline";
import {
  deleteDemand,
  addManagerComment,
  setDemandDeadline,
  addDemandComment,
} from "@/app/actions/demands";
import { Trash2 } from "lucide-react";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface DemandDetailModalProps {
  demand: Demand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDemandUpdate?: (id: string, patch: Partial<Demand>) => void;
  onDemandRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  onRefresh?: () => void;
  onDemandDeleted?: (deletedId: string) => void;
  userRole?: "admin" | "sector_user" | null;
}

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

export default function DemandDetailModal({
  demand,
  open,
  onOpenChange,
  onDemandUpdate,
  onDemandRollback,
  getDemandById,
  onRefresh,
  onDemandDeleted,
  userRole = "admin",
}: DemandDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adminStatus, setAdminStatus] = useState<string>(
    demand?.admin_status || "Em análise"
  );
  const [adminNotes, setAdminNotes] = useState<string>(
    demand?.admin_notes || ""
  );
  const [assignedToUserId, setAssignedToUserId] = useState<string>(
    demand?.assigned_to_user_id || ""
  );
  const [users, setUsers] = useState<
    Array<{ id: string; displayName: string; email: string }>
  >([]);
  const [notesFocused, setNotesFocused] = useState(false);
  const [managerComment, setManagerComment] = useState("");
  const [dueAt, setDueAt] = useState<Date | null>(
    demand?.due_at ? new Date(demand.due_at) : null
  );
  const [sectorComment, setSectorComment] = useState("");

  // Carregar usuários ao montar componente
  useEffect(() => {
    if (userRole === "admin") {
      loadUsers();
    }
  }, [userRole]);

  // Atualizar estados quando demanda mudar
  useEffect(() => {
    if (demand) {
      setAdminStatus(demand.admin_status || "Em análise");
      setAdminNotes(demand.admin_notes || "");
      setAssignedToUserId(demand.assigned_to_user_id || "");
      setDueAt(demand.due_at ? new Date(demand.due_at) : null);
    }
  }, [demand]);

  const loadUsers = async () => {
    try {
      const result = await listManagedUsers();
      if (result.ok) {
        setUsers(
          result.data.map((u) => ({
            id: u.id,
            displayName: u.displayName,
            email: u.email,
          }))
        );
      }
    } catch (error) {
      console.error("Load users error:", error);
    }
  };

  if (!demand) return null;

  const handleSave = () => {
    if (!demand) return;

    // Salvar estado anterior para rollback
    const previousDemand = getDemandById?.(demand.id) || demand;

    // Preparar patches para optimistic update
    const patches: Partial<Demand> = {};
    const promises: Promise<{ ok: true } | { ok: false; error: string }>[] = [];

    // Atualizar admin_status se mudou
    if (adminStatus !== (demand.admin_status || "Em análise")) {
      patches.admin_status = adminStatus;
      promises.push(updateAdminStatus(demand.id, adminStatus));
    }

    // Atualizar admin_notes se mudou
    if (adminNotes !== (demand.admin_notes || "")) {
      patches.admin_notes = adminNotes || null;
      promises.push(updateAdminNotes(demand.id, adminNotes));
    }

    // Atualizar assigned_to_user_id se mudou
    if (assignedToUserId !== (demand.assigned_to_user_id || "")) {
      patches.assigned_to_user_id = assignedToUserId || null;
      promises.push(assignDemand(demand.id, assignedToUserId || null));
    }

    if (promises.length === 0) {
      toast.info("Nenhuma alteração");
      return;
    }

    // Optimistic update
    if (onDemandUpdate && Object.keys(patches).length > 0) {
      onDemandUpdate(demand.id, patches);
    }

    startTransition(async () => {
      try {
        const results = await Promise.all(promises);
        const hasError = results.some((r) => !r.ok);

        if (hasError) {
          // Rollback em caso de erro
          if (onDemandRollback && previousDemand) {
            onDemandRollback(demand.id, previousDemand);
          }
          toast.error("Erro ao salvar alterações", {
            description: "Algumas alterações não puderam ser salvas.",
          });
        } else {
          toast.success("Salvo");
          onRefresh?.();
          onOpenChange(false);
        }
      } catch (error) {
        // Rollback em caso de exceção
        if (onDemandRollback && previousDemand) {
          onDemandRollback(demand.id, previousDemand);
        }
        console.error("Save error:", error);
        toast.error("Erro inesperado", {
          description: "Não foi possível salvar as alterações.",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!demand) return;

    setIsDeleting(true);
    const deletedId = demand.id;

    startTransition(async () => {
      try {
        const result = await deleteDemand(deletedId);

        if (!result.ok) {
          toast.error("Erro ao excluir demanda", {
            description: result.error || "Tente novamente.",
          });
          setIsDeleting(false);
          return;
        }

        toast.success("Demanda excluída");
        onOpenChange(false);
        // Remover da lista local imediatamente e recarregar
        onDemandDeleted?.(deletedId);
      } catch (error) {
        console.error("Delete error:", error);
        toast.error("Erro inesperado", {
          description: "Não foi possível excluir a demanda.",
        });
        setIsDeleting(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="shrink-0">
          <div className="px-5 py-3 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5" />
              {demand.name}
            </DialogTitle>
            <DialogDescription className="text-sm mt-0.5">
              Detalhes da demanda e gestão administrativa
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {/* Informações principais (2 col, pares definidos) */}
          <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-[11px] font-medium text-muted-foreground tracking-wide shrink-0 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Informações
              </h3>
              <div className="shrink-0 min-w-fit">
                <PrioritySelect
                  demandId={demand.id}
                  currentPriority={demand.priority}
                  onUpdate={onDemandUpdate}
                  onRollback={onDemandRollback}
                  getDemandById={getDemandById}
                  variant="badge"
                  onSuccess={onRefresh}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Solicitante
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{demand.name}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Setor
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <span>{demand.department}</span>
                </div>
              </div>

              {/* Tipo e Impacto ficam no topo (badges) */}

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Sistema
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{demand.system_area}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Data de Criação
                </Label>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="whitespace-nowrap">
                    {formatDate(demand.created_at)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Etiquetas
                </Label>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="rounded-md text-[11px] px-2 py-0.5"
                  >
                    {demand.demand_type}
                  </Badge>
                  <Badge
                    variant={
                      demand.impact_level === "Bloqueante"
                        ? "destructive"
                        : demand.impact_level === "Alto"
                        ? "default"
                        : "secondary"
                    }
                    className="rounded-md text-[11px] px-2 py-0.5"
                  >
                    {demand.impact_level}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  Status Operacional
                </Label>
                <StatusSelect
                  demandId={demand.id}
                  currentStatus={demand.status}
                  onUpdate={onDemandUpdate}
                  onRollback={onDemandRollback}
                  getDemandById={getDemandById}
                  onSuccess={onRefresh}
                />
              </div>
            </div>
          </section>

          {/* Descrição */}
          <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <div className="text-[11px] font-medium text-muted-foreground mb-2 tracking-wide flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Descrição
            </div>
            <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {demand.description}
            </div>
          </section>

          {/* Anexos + Links lado a lado (quando possível) */}
          {((demand.attachment_urls && demand.attachment_urls.length > 0) ||
            (demand.reference_links && demand.reference_links.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {demand.attachment_urls && demand.attachment_urls.length > 0 ? (
                <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <div className="text-[11px] font-medium text-muted-foreground mb-2 tracking-wide flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Anexos
                  </div>
                  <ViewAttachment
                    attachmentPaths={demand.attachment_urls}
                    variant="grid"
                  />
                </section>
              ) : null}

              {demand.reference_links && demand.reference_links.length > 0 ? (
                <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
                  <div className="text-[11px] font-medium text-muted-foreground mb-2 tracking-wide flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Links
                  </div>
                  <ViewReferenceLinks
                    links={demand.reference_links}
                    variant="list"
                  />
                </section>
              ) : null}
            </div>
          )}

          {/* Gestão administrativa (apenas admin) */}
          {userRole === "admin" && (
            <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-2 tracking-wide">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Gestão administrativa
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor="admin_status"
                    className="text-[11px] text-muted-foreground"
                  >
                    Status Admin
                  </Label>
                  <Select
                    value={adminStatus}
                    onValueChange={setAdminStatus}
                    disabled={isPending}
                  >
                    <SelectTrigger id="admin_status" className="h-9 rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Em análise">Em análise</SelectItem>
                      <SelectItem value="Acatada">Acatada</SelectItem>
                      <SelectItem value="Resolvida">Resolvida</SelectItem>
                      <SelectItem value="Descartada">Descartada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="assigned_to_user_id"
                    className="text-[11px] text-muted-foreground"
                  >
                    Responsável
                  </Label>
                  <Select
                    value={assignedToUserId || "none"}
                    onValueChange={(value) =>
                      setAssignedToUserId(value === "none" ? "" : value)
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="assigned_to_user_id"
                      className="h-9 rounded-md"
                    >
                      <SelectValue placeholder="Selecione um responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.displayName} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>
          )}

          {/* Comentário do responsável (sector_user) */}
          {userRole === "sector_user" && (
            <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-2 tracking-wide">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Adicionar Comentário
              </div>
              <div className="space-y-2">
                <Textarea
                  value={sectorComment}
                  onChange={(e) => setSectorComment(e.target.value)}
                  placeholder="Adicione um comentário sobre o andamento ou impedimentos..."
                  rows={3}
                  disabled={isPending}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!sectorComment.trim()) {
                      toast.error("Comentário não pode estar vazio");
                      return;
                    }
                    startTransition(async () => {
                      const result = await addDemandComment(
                        demand.id,
                        sectorComment.trim()
                      );
                      if (result.ok) {
                        toast.success("Comentário adicionado");
                        setSectorComment("");
                        onRefresh?.();
                      } else {
                        toast.error("Erro ao adicionar comentário", {
                          description: result.error,
                        });
                      }
                    });
                  }}
                  disabled={isPending || !sectorComment.trim()}
                >
                  Adicionar Comentário
                </Button>
              </div>
            </section>
          )}

          {/* Timeline (admin e sector_user veem comentários) */}
          <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
            <div className="text-[11px] font-medium text-muted-foreground mb-3 flex items-center gap-2 tracking-wide">
              <Waypoints className="h-4 w-4 text-muted-foreground" />
              Timeline de Atualizações
            </div>
            <DemandTimeline demandId={demand.id} />
          </section>

          {/* Comentário do gestor ao responsável (apenas admin pode escrever) */}
          {userRole === "admin" && (
            <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-2 tracking-wide">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Comentário ao Responsável
              </div>
              <div className="space-y-2">
                <Textarea
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="Adicione um comentário que será enviado ao responsável via WhatsApp..."
                  rows={3}
                  disabled={isPending}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!managerComment.trim()) {
                      toast.error("Comentário não pode estar vazio");
                      return;
                    }
                    startTransition(async () => {
                      const result = await addManagerComment(
                        demand.id,
                        managerComment.trim()
                      );
                      if (result.ok) {
                        toast.success("Comentário enviado");
                        setManagerComment("");
                        onRefresh?.();
                      } else {
                        toast.error("Erro ao enviar comentário", {
                          description: result.error,
                        });
                      }
                    });
                  }}
                  disabled={isPending || !managerComment.trim()}
                >
                  Enviar Comentário
                </Button>
              </div>
            </section>
          )}

          {/* Prazo (apenas admin) */}
          {userRole === "admin" && (
            <section className="rounded-lg border border-border/40 bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground mb-2 flex items-center gap-2 tracking-wide">
                <ClockCheck className="h-4 w-4 text-muted-foreground" />
                Prazo de Conclusão
              </div>
              <div className="space-y-2">
                <DatePicker
                  value={dueAt}
                  onChange={setDueAt}
                  disabled={isPending}
                  placeholder="Selecione uma data"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    startTransition(async () => {
                      const result = await setDemandDeadline(
                        demand.id,
                        dueAt ? dueAt.toISOString() : null
                      );
                      if (result.ok) {
                        toast.success("Prazo atualizado");
                        onRefresh?.();
                      } else {
                        toast.error("Erro ao atualizar prazo", {
                          description: result.error,
                        });
                      }
                    });
                  }}
                  disabled={isPending}
                >
                  Salvar Prazo
                </Button>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="shrink-0 bg-background border-t border-border/40 mt-auto">
          <div className="w-full px-5 py-3 flex items-center justify-between gap-2">
            {userRole === "admin" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isPending || isDeleting}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending || isDeleting}
              >
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
              <Button onClick={handleSave} disabled={isPending || isDeleting}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>

        <DeleteDemandDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          demandName={demand.name}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      </DialogContent>
    </Dialog>
  );
}
