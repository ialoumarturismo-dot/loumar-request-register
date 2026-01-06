"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions/auth";
import Link from "next/link";
import Image from "next/image";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getMyProfile } from "@/app/actions/users";
import NotificationsCenter from "@/components/admin/notifications-center";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<"admin" | "sector_user" | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const result = await getMyProfile();
      if (result.ok) {
        setUserRole(result.data.role);
      }
    } catch (error) {
      console.error("Load profile error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background ">
      <header className="bg-card border-b border-border/50 backdrop-blur-sm py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
          <div className="flex items-center gap-4 h-full">
            <Link
              href="/admin"
              className="hover:opacity-80 transition-opacity flex items-center h-full"
            >
              <Image
                src="/louello_v4.svg"
                alt="Louello"
                width={1024}
                height={320}
                className="h-full w-auto min-w-[180px] sm:min-w-[220px] md:min-w-[260px] lg:min-w-[300px]"
                priority
              />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              {!loading && userRole === "admin" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="/admin/users">
                      <Button variant="ghost" size="icon">
                        <Users className="h-5 w-5" />
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usuários</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <NotificationsCenter />
            </TooltipProvider>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
