"use client";

import { Bell, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
  userName: string;
  avatarUrl?: string | null;
}

export function DashboardHeader({ title, userName, avatarUrl }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-mist">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <h1 className="text-xl font-bold text-midnight font-[family-name:var(--font-sora)]">
          {title}
        </h1>

        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-[--radius-md] hover:bg-mist transition-colors">
            <Search className="h-5 w-5 text-slate-light" />
          </button>
          <button className="relative p-2 rounded-[--radius-md] hover:bg-mist transition-colors">
            <Bell className="h-5 w-5 text-slate-light" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
          </button>
          <Avatar name={userName} src={avatarUrl} size="sm" />
        </div>
      </div>
    </header>
  );
}
