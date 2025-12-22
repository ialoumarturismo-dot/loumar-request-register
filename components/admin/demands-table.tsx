"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ViewAttachment from "./view-attachment";
import ViewReferenceLinks from "./view-reference-links";
import type { Database } from "@/types/database";
import AdminStatusSelect from "./admin-status-select";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface DemandsTableProps {
  demands: Demand[];
  onDemandClick?: (demand: Demand) => void;
  onDemandUpdate?: (id: string, patch: Partial<Demand>) => void;
  onDemandRollback?: (id: string, previous: Demand) => void;
  getDemandById?: (id: string) => Demand | undefined;
  isDemandUpdating?: (id: string) => boolean;
  setDemandUpdating?: (id: string, isUpdating: boolean) => void;
}

const statusColors: Record<string, string> = {
  Recebido: "bg-gray-500",
  "Em análise": "bg-blue-500",
  "Em execução": "bg-yellow-500",
  Concluído: "bg-green-500",
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

export default function DemandsTable({
  demands,
  onDemandClick,
  onDemandUpdate,
  onDemandRollback,
  getDemandById,
  isDemandUpdating,
  setDemandUpdating,
}: DemandsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data de Criação</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Impacto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Status Admin</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Anexo</TableHead>
            <TableHead>Links</TableHead>
            <TableHead className="text-center">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demands.map((demand) => (
            <TableRow
              key={demand.id}
              className="hover:bg-muted/30 transition-colors"
            >
              <TableCell className="font-mono text-[12px] py-2 whitespace-nowrap">
                {formatDate(demand.created_at)}
              </TableCell>
              <TableCell className="font-medium py-2">{demand.name}</TableCell>
              <TableCell className="py-2 text-sm text-muted-foreground">
                {demand.department}
              </TableCell>
              <TableCell className="py-2 text-sm">
                {demand.demand_type}
              </TableCell>
              <TableCell className="py-2">
                <Badge
                  variant={
                    demand.impact_level === "Bloqueante"
                      ? "destructive"
                      : demand.impact_level === "Alto"
                      ? "default"
                      : "secondary"
                  }
                  className="text-[11px] px-2 py-0.5 rounded-md"
                >
                  {demand.impact_level}
                </Badge>
              </TableCell>
              <TableCell className="py-2">
                <Badge
                  className={
                    (statusColors[demand.status] || "bg-gray-500") +
                    " text-[11px] px-2 py-0.5 rounded-md min-w-[100px] max-w-[120px] truncate"
                  }
                >
                  {demand.status}
                </Badge>
              </TableCell>
              <TableCell className="py-2">
                <AdminStatusSelect
                  demandId={demand.id}
                  currentStatus={demand.admin_status || "Em análise"}
                  onUpdate={onDemandUpdate}
                  onRollback={onDemandRollback}
                  getDemandById={getDemandById}
                  isUpdating={isDemandUpdating?.(demand.id)}
                  setUpdating={(updating) =>
                    setDemandUpdating?.(demand.id, updating)
                  }
                  className="w-[150px]"
                />
              </TableCell>
              <TableCell className="py-2">
                {demand.priority ? (
                  <Badge
                    variant={
                      demand.priority === "Urgente"
                        ? "destructive"
                        : demand.priority === "Importante"
                        ? "default"
                        : demand.priority === "Necessário"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[11px] px-2 py-0.5 rounded-md"
                  >
                    {demand.priority}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="py-2">
                {demand.attachment_urls && demand.attachment_urls.length > 0 ? (
                  <ViewAttachment
                    attachmentPaths={demand.attachment_urls}
                    variant="icon"
                    title="Ver anexos"
                  />
                ) : null}
              </TableCell>
              <TableCell className="py-2">
                {demand.reference_links && demand.reference_links.length > 0 ? (
                  <ViewReferenceLinks
                    links={demand.reference_links}
                    variant="icon"
                    title="Ver links"
                  />
                ) : null}
              </TableCell>
              <TableCell className="text-center py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onDemandClick?.(demand)}
                  title="Abrir detalhes"
                  aria-label="Abrir detalhes"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
