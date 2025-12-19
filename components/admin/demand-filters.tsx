"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";

export interface FilterValues {
  adminStatus: string;
  impactLevel: string;
  department: string;
  search: string;
}

interface DemandFiltersProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
}

const ADMIN_STATUSES = [
  "Todos",
  "Em análise",
  "Acatada",
  "Resolvida",
  "Descartada",
];
const IMPACT_LEVELS = ["Todos", "Bloqueante", "Alto", "Médio", "Baixo"];
const DEPARTMENTS = [
  "Todos",
  "B2B",
  "B2C",
  "Concierge",
  "Financeiro",
  "Marketing",
  "Produto",
  "Tech",
  "Outro",
];

export default function DemandFilters({
  filters,
  onFiltersChange,
}: DemandFiltersProps) {
  const updateFilter = (key: keyof FilterValues, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      adminStatus: "Todos",
      impactLevel: "Todos",
      department: "Todos",
      search: "",
    });
  };

  const hasActiveFilters =
    filters.adminStatus !== "Todos" ||
    filters.impactLevel !== "Todos" ||
    filters.department !== "Todos" ||
    filters.search !== "";

  return (
    <div className="space-y-4 p-4 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Busca por texto */}
        <div className="space-y-2">
          <Label htmlFor="search" className="text-xs">
            Buscar
          </Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Nome, descrição..."
              className="pl-8"
            />
          </div>
        </div>

        {/* Status administrativo */}
        <div className="space-y-2">
          <Label htmlFor="admin_status" className="text-xs">
            Status Administrativo
          </Label>
          <Select
            value={filters.adminStatus}
            onValueChange={(value) => updateFilter("adminStatus", value)}
          >
            <SelectTrigger id="admin_status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Nível de impacto */}
        <div className="space-y-2">
          <Label htmlFor="impact_level" className="text-xs">
            Impacto
          </Label>
          <Select
            value={filters.impactLevel}
            onValueChange={(value) => updateFilter("impactLevel", value)}
          >
            <SelectTrigger id="impact_level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMPACT_LEVELS.map((impact) => (
                <SelectItem key={impact} value={impact}>
                  {impact}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Setor */}
        <div className="space-y-2">
          <Label htmlFor="department" className="text-xs">
            Setor
          </Label>
          <Select
            value={filters.department}
            onValueChange={(value) => updateFilter("department", value)}
          >
            <SelectTrigger id="department">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
