import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simple Vet Clinic | السجل الطبي البيطري",
  description:
    "نظام Simple Vet Clinic لإدارة ملفات الحيوانات والزيارات واللقاحات وجرع الديدان والتذكيرات.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
