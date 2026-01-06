"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getMyNotifications, markNotificationAsRead } from "@/app/actions/notifications";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  demand_id: string | null;
  demand_name?: string;
  template_id: string;
  status: string;
  created_at: string;
  read_at: string | null;
  payload: Record<string, any> | null;
}

export default function NotificationsCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    // Polling a cada 30 segundos para novas notificações
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const result = await getMyNotifications();
      if (result.ok) {
        setNotifications(result.data);
        setUnreadCount(result.data.filter((n) => !n.read_at).length);
      }
    } catch (error) {
      console.error("Load notifications error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como lida
    if (!notification.read_at) {
      const result = await markNotificationAsRead(notification.id);
      if (result.ok) {
        // Recarregar notificações para garantir que o estado está sincronizado
        await loadNotifications();
      } else {
        console.error("Erro ao marcar notificação como lida:", result.error);
      }
    }

    // Fechar popover
    setIsOpen(false);

    // Navegar para a demanda se houver
    if (notification.demand_id) {
      router.push(`/admin?demandId=${notification.demand_id}`);
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "agora";
    }
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} min${minutes > 1 ? "s" : ""} atrás`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hora${hours > 1 ? "s" : ""} atrás`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} dia${days > 1 ? "s" : ""} atrás`;
  };

  const formatNotificationMessage = (notification: Notification): string => {
    const payload = notification.payload || {};
    
    // Verificar pelo template_id (comparando com os IDs dos templates)
    const templateId = notification.template_id;
    
    // Template IDs do .env (conforme terminal do usuário)
    const TEMPLATE_DEMAND_ASSIGNED = "b67bed21-70b1-4428-be77-1ee8f8582241";
    const TEMPLATE_MANAGER_COMMENT = "81862e83-5c14-4876-b169-bd0e1f2c1118";
    const TEMPLATE_DEMAND_CREATED = "2426c935-1a44-4a25-a2ed-41ce670f6368";
    const TEMPLATE_DEADLINE_SOON = "2f467556-f837-42cf-a145-c1158c0bfdc0";
    
    if (templateId === TEMPLATE_DEMAND_ASSIGNED) {
      const assignerName = payload.assigner_name || "Gestor";
      return `Nova demanda foi atribuída à você por ${assignerName}.`;
    }
    
    if (templateId === TEMPLATE_MANAGER_COMMENT) {
      const managerName = payload.manager_name || "Gestor";
      return `${managerName} comentou em uma demanda sua.`;
    }
    
    if (templateId === TEMPLATE_DEMAND_CREATED) {
      return "Nova demanda ao setor";
    }
    
    if (templateId === TEMPLATE_DEADLINE_SOON) {
      return "Prazo de conclusão se aproximando";
    }
    
    // Fallback: tentar identificar pelo conteúdo do template_id ou payload
    if (templateId.includes("assigned") || payload.assigner_name) {
      const assignerName = payload.assigner_name || "Gestor";
      return `Nova demanda foi atribuída à você por ${assignerName}.`;
    }
    
    if (templateId.includes("comment") || payload.manager_name) {
      const managerName = payload.manager_name || "Gestor";
      return `${managerName} comentou em uma demanda sua.`;
    }
    
    if (templateId.includes("created")) {
      return "Nova demanda ao setor";
    }
    
    if (templateId.includes("deadline") || payload.DIAS) {
      return "Prazo de conclusão se aproximando";
    }
    
    return "Nova notificação";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} não lidas
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                    !notification.read_at ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {formatNotificationMessage(notification)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
            </Popover>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Notificações</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

