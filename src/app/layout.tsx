import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";

const UNI = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || "Trường Đại học CBTS";

export const metadata: Metadata = {
  title: `${UNI} • Chatbot tư vấn tuyển sinh`,
  description: "Hệ thống chatbot AI hỗ trợ tư vấn tuyển sinh 24/7.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <footer className="py-8 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} {UNI} — Phòng Tuyển sinh.
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
