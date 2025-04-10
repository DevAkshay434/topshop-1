import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-neutral-100 text-neutral-900 min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:pl-64">
        <TopBar />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
