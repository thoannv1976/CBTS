"use client";

import Link from "next/link";
import { GraduationCap, LayoutDashboard, LogIn, LogOut, MessageCircleQuestion } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { signInWithGoogle } from "@/lib/firebase";

export function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const uni = process.env.NEXT_PUBLIC_UNIVERSITY_SHORT || "CBTS";

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 grid place-items-center shadow-md shadow-brand-200 group-hover:scale-105 transition-transform">
            <GraduationCap className="size-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-slate-900">{uni} Admissions</div>
            <div className="text-[11px] text-slate-500">AI Chatbot Tư vấn tuyển sinh</div>
          </div>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/faq" className="btn-ghost text-sm">
            <MessageCircleQuestion className="size-4" />
            <span className="hidden sm:inline">Câu hỏi thường gặp</span>
          </Link>
          {isAdmin && (
            <Link href="/admin" className="btn-ghost text-sm">
              <LayoutDashboard className="size-4" />
              <span className="hidden sm:inline">Quản trị</span>
            </Link>
          )}
          {user ? (
            <button onClick={logout} className="btn-outline text-sm">
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          ) : (
            <button onClick={() => signInWithGoogle()} className="btn-primary text-sm">
              <LogIn className="size-4" />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
