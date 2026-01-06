"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Edit,
  Loader2,
  Building2,
  Phone,
  Pencil,
  X,
  Check,
  Trash2,
  Plus,
} from "lucide-react";
import { createManagedUser, updateManagedUser } from "@/app/actions/users";
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/app/actions/departments";
import { toast } from "sonner";

interface UserData {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "sector_user";
  whatsappPhone: string | null;
  whatsappOptIn: boolean;
  departments: string[];
}

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUser: UserData | null;
  onSuccess: () => void;
}

export default function UserFormDialog({
  open,
  onOpenChange,
  editingUser,
  onSuccess,
}: UserFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "sector_user">("sector_user");
  const [departments, setDepartments] = useState<string[]>([]);
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  // Estados para edição inline de setores
  const [isEditingDepartments, setIsEditingDepartments] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(
    null
  );
  const [editingDepartmentName, setEditingDepartmentName] = useState("");
  const [newDepartmentName, setNewDepartmentName] = useState("");

  useEffect(() => {
    if (open) {
      loadDepartments();
      if (editingUser) {
        setEmail(editingUser.email);
        setPassword("");
        setDisplayName(editingUser.displayName);
        setRole(editingUser.role);
        setDepartments([...editingUser.departments]);
        setWhatsappPhone(editingUser.whatsappPhone || "");
        setWhatsappOptIn(editingUser.whatsappOptIn);
      } else {
        resetForm();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingUser]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("sector_user");
    setDepartments([]);
    setWhatsappPhone("");
    setWhatsappOptIn(false);
  };

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

  const handleDepartmentToggle = (dept: string) => {
    setDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleStartEditDepartment = (dept: { id: string; name: string }) => {
    setEditingDepartmentId(dept.id);
    setEditingDepartmentName(dept.name);
  };

  const handleCancelEditDepartment = () => {
    setEditingDepartmentId(null);
    setEditingDepartmentName("");
  };

  const handleSaveEditDepartment = async () => {
    if (!editingDepartmentId || !editingDepartmentName.trim()) return;

    const result = await updateDepartment(
      editingDepartmentId,
      editingDepartmentName.trim()
    );
    if (result.ok) {
      toast.success("Setor atualizado");
      await loadDepartments();
      setEditingDepartmentId(null);
      setEditingDepartmentName("");
    } else {
      toast.error("Erro ao atualizar setor", {
        description: result.error,
      });
    }
  };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) return;

    const result = await createDepartment(newDepartmentName.trim());
    if (result.ok) {
      toast.success("Setor criado");
      await loadDepartments();
      setNewDepartmentName("");
    } else {
      toast.error("Erro ao criar setor", {
        description: result.error,
      });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este setor?")) return;

    const result = await deleteDepartment(id);
    if (result.ok) {
      toast.success("Setor deletado");
      await loadDepartments();
    } else {
      toast.error("Erro ao deletar setor", {
        description: result.error,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (editingUser) {
        formData.append("userId", editingUser.id);
        if (displayName) formData.append("displayName", displayName);
        if (role) formData.append("role", role);
        if (departments.length > 0) {
          formData.append("departments", JSON.stringify(departments));
        }
        if (whatsappPhone) formData.append("whatsappPhone", whatsappPhone);
        formData.append("whatsappOptIn", whatsappOptIn.toString());
        if (password) formData.append("password", password);

        const result = await updateManagedUser(formData);
        if (result.ok) {
          toast.success("Usuário atualizado");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error("Erro ao atualizar usuário", {
            description: result.error,
          });
        }
      } else {
        formData.append("email", email);
        formData.append("password", password);
        formData.append("displayName", displayName);
        formData.append("role", role);
        formData.append("departments", JSON.stringify(departments));
        if (whatsappPhone) formData.append("whatsappPhone", whatsappPhone);
        formData.append("whatsappOptIn", whatsappOptIn.toString());

        const result = await createManagedUser(formData);
        if (result.ok) {
          toast.success("Usuário criado");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error("Erro ao criar usuário", {
            description: result.error,
          });
        }
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Erro inesperado", {
        description: "Não foi possível salvar o usuário.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingUser ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {editingUser
              ? "Atualize as informações do usuário"
              : "Crie um novo usuário responsável por setores"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && (
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="usuario@exemplo.com"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Nome de Exibição *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              disabled={isSubmitting}
              placeholder="João Silva"
            />
          </div>

          {!editingUser && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingUser}
                disabled={isSubmitting}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}

          {editingUser && (
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha (opcional)</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                placeholder="Deixe em branco para manter a atual"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Papel *</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                setRole(value as "admin" | "sector_user")
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="sector_user">Usuário de Setor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "sector_user" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Setores *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => setIsEditingDepartments(!isEditingDepartments)}
                  title={
                    isEditingDepartments ? "Fechar edição" : "Editar setores"
                  }
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>

              {isEditingDepartments && (
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Gerenciar Setores
                  </div>
                  <div className="space-y-2">
                    {availableDepartments.map((dept) => (
                      <div key={dept.id} className="flex items-center gap-2">
                        {editingDepartmentId === dept.id ? (
                          <>
                            <Input
                              value={editingDepartmentName}
                              onChange={(e) =>
                                setEditingDepartmentName(e.target.value)
                              }
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleSaveEditDepartment}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={handleCancelEditDepartment}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{dept.name}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleStartEditDepartment(dept)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteDepartment(dept.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Input
                        value={newDepartmentName}
                        onChange={(e) => setNewDepartmentName(e.target.value)}
                        placeholder="Novo setor"
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleCreateDepartment();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateDepartment}
                        disabled={!newDepartmentName.trim()}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {availableDepartments.map((dept) => (
                  <Button
                    key={dept.id}
                    type="button"
                    variant={
                      departments.includes(dept.name) ? "default" : "outline"
                    }
                    onClick={() => handleDepartmentToggle(dept.name)}
                    disabled={isSubmitting}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    {dept.name}
                  </Button>
                ))}
              </div>
              {departments.length === 0 && (
                <p className="text-sm text-destructive">
                  Selecione pelo menos um departamento
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="whatsappPhone">Telefone WhatsApp</Label>
            <Input
              id="whatsappPhone"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              disabled={isSubmitting}
              placeholder="+5511999999999"
            />
            <p className="text-xs text-muted-foreground">
              Formato: +5511999999999 (E.164)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="whatsappOptIn"
              checked={whatsappOptIn}
              onChange={(e) => setWhatsappOptIn(e.target.checked)}
              disabled={isSubmitting}
              className="rounded"
            />
            <Label htmlFor="whatsappOptIn" className="cursor-pointer">
              Receber notificações via WhatsApp
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : editingUser ? (
                "Atualizar"
              ) : (
                "Criar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
