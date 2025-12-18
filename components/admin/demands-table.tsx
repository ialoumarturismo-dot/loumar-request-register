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
import StatusSelect from "./status-select";
import ViewAttachment from "./view-attachment";
import type { Database } from "@/types/database";

type Demand = Database["public"]["Tables"]["demands"]["Row"];

interface DemandsTableProps {
  demands: Demand[];
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

export default function DemandsTable({ demands }: DemandsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Setor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Impacto</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Anexo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {demands.map((demand) => (
            <TableRow key={demand.id}>
              <TableCell className="font-mono text-sm">
                {formatDate(demand.created_at)}
              </TableCell>
              <TableCell className="font-medium">{demand.name}</TableCell>
              <TableCell>{demand.department}</TableCell>
              <TableCell>{demand.demand_type}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    demand.impact_level === "Bloqueante"
                      ? "destructive"
                      : demand.impact_level === "Alto"
                        ? "default"
                        : "secondary"
                  }
                >
                  {demand.impact_level}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={statusColors[demand.status] || "bg-gray-500"}>
                  {demand.status}
                </Badge>
              </TableCell>
              <TableCell>
                <ViewAttachment attachmentPath={demand.attachment_url} />
              </TableCell>
              <TableCell className="text-right">
                <StatusSelect demandId={demand.id} currentStatus={demand.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
