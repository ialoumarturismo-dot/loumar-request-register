"use client";

import { useState, useTransition } from "react";
import { updateDemandStatus } from "@/app/actions/demands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface StatusSelectProps {
  demandId: string;
  currentStatus: string;
}

const statusOptions = ["Recebido", "Em análise", "Em execução", "Concluído"];

export default function StatusSelect({ demandId, currentStatus }: StatusSelectProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;

    startTransition(async () => {
      const result = await updateDemandStatus(demandId, newStatus);

      if (result.ok) {
        toast.success("Status atualizado", {
          description: `Status alterado para "${newStatus}"`,
        });
        router.refresh();
      } else {
        toast.error("Erro ao atualizar status", {
          description: result.error || "Tente novamente.",
        });
      }
    });
  };

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[160px]">
        <SelectValue />
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
