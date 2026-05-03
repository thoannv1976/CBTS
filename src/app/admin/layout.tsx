"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signInWithGoogle } from "@/lib/firebase";
import { BookOpen, LayoutDashboard, ListTree, MessageSquare, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/knowledge", label: "Kho tri thức", icon: BookOpen },
  { href: "/admin/faqs", label: "Câu hỏi thường gặp", icon: ListTree },
  { href: "/admin/conversations", label: "Hội thoại", icon: MessageSquare },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const path = usePathname();

  if (loading) {
    return <div className="max-w-3xl mx-auto p-10 text-center text-slate-500">Đang tải…</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-10 text-center">
        <ShieldAlert className="size-10 mx-auto text-amber-500" />
        <h2 className="mt-3 text-xl font-semibold">Bạn cần đăng nhập</h2>
        <p className="mt-1 text-slate-600">Khu vực quản trị yêu cầu tài khoản Google đã được cấp quyền.</p>
        <button onClick={() => signInWithGoogle()} className="btn-primary mt-5">
          Đăng nhập bằng Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto p-10 text-center">
        <ShieldAlert className="size-10 mx-auto text-rose-500" />
        <h2 className="mt-3 text-xl font-semibold">Tài khoản chưa có quyền quản trị</h2>
        <p className="mt-1 text-slate-600">
          Vui lòng liên hệ quản trị viên hệ thống để được cấp quyền cho tài khoản
          <span className="font-medium"> {user.email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-[230px_1fr] gap-8">
      <aside className="lg:sticky lg:top-20 self-start">
        <div className="card p-2">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-emerald-600" /> Bảng điều khiển
          </div>
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = path === n.href || (n.href !== "/admin" && path.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition",
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <Icon className="size-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <section>{children}</section>
    </div>
  );
}
