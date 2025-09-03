import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-white text-neutral-900 min-h-screen flex flex-col md:flex-row">
      <Sidebar />
      
      <div className="flex-1 md:pl-64">
        <TopBar />
        <main className="py-8 px-6 sm:px-8 lg:px-12 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
