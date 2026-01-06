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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { X, Search, LayoutGrid, List } from "lucide-react";
import { useState, useEffect } from "react";
import { listDepartments } from "@/app/actions/departments";

export interface FilterValues {
  adminStatus: string;
  impactLevel: string;
  department: string;
  destinationDepartment: string;
  search: string;
  dateRange: { from: Date | null; to: Date | null } | null;
}

type ViewMode = "kanban" | "list" | "cards";

interface DemandFiltersProps {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

const ADMIN_STATUSES = [
  "Todos",
  "Em análise",
  "Acatada",
  "Resolvida",
  "Descartada",
];
const IMPACT_LEVELS = ["Todos", "Bloqueante", "Alto", "Médio", "Baixo"];

export default function DemandFilters({
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}: DemandFiltersProps) {
  const [availableDepartments, setAvailableDepartments] = useState<
    Array<{ id: string; name: string; created_at: string }>
  >([]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const result = await listDepartments();
        if (result.ok) {
          setAvailableDepartments(result.data);
        } else {
          console.error("Load departments error:", result.error);
        }
      } catch (error) {
        console.error("Load departments error:", error);
      }
    };
    loadDepartments();
  }, []);

  const updateFilter = (
    key: keyof FilterValues,
    value: string | { from: Date | null; to: Date | null } | null
  ) => {
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
      destinationDepartment: "Todos",
      search: "",
      dateRange: null,
    });
  };

  const hasActiveFilters =
    filters.adminStatus !== "Todos" ||
    filters.impactLevel !== "Todos" ||
    filters.department !== "Todos" ||
    filters.destinationDepartment !== "Todos" ||
    filters.search !== "" ||
    filters.dateRange !== null;

  return (
    <div className="p-3 border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        {viewMode !== undefined && onViewModeChange && (
          <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-md border border-border/50">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("kanban")}
              className="h-7 px-2"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("list")}
              className="h-7 px-2"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
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

        {/* Filtro por período */}
        <div className="space-y-2">
          <Label htmlFor="date_range" className="text-xs">
            Período
          </Label>
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => updateFilter("dateRange", range)}
            placeholder="Selecione um período"
          />
        </div>

        {/* Status operacional */}
        <div className="space-y-2">
          <Label htmlFor="admin_status" className="text-xs">
            Status Operacional
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

        {/* Setor Solicitante */}
        <div className="space-y-2">
          <Label htmlFor="department" className="text-xs">
            Setor Solicitante
          </Label>
          <Select
            value={filters.department}
            onValueChange={(value) => updateFilter("department", value)}
          >
            <SelectTrigger id="department">
              <SelectValue placeholder="Selecione um setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {availableDepartments.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Setor de Destino */}
        <div className="space-y-2">
          <Label htmlFor="destination_department" className="text-xs">
            Setor de Destino
          </Label>
          <Select
            value={filters.destinationDepartment}
            onValueChange={(value) =>
              updateFilter("destinationDepartment", value)
            }
          >
            <SelectTrigger id="destination_department">
              <SelectValue placeholder="Selecione um setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {availableDepartments.map((dept) => (
                <SelectItem key={dept.id} value={dept.name}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
