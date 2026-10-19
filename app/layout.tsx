import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskMatrix — Project Workspace",
  description: "A secure, focused task management workspace powered by Supabase."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}