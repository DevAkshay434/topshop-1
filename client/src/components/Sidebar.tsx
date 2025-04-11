import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Edit, 
  FileText, 
  Clock, 
  BarChart3, 
  Settings, 
  Store, 
  HelpCircle,
  FileCode,
  Sparkles,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ShopifyConnection } from "@shared/schema";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  active?: boolean;
}

function NavItem({ href, icon, text, active }: NavItemProps) {
  return (
    <div>
      <Link href={href}>
        <a 
          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
            active 
              ? "bg-primary/10 text-primary" 
              : "text-neutral-500 hover:bg-neutral-100"
          }`}
        >
          <span className="mr-3 text-current">{icon}</span>
          {text}
        </a>
      </Link>
    </div>
  );
}

function StoreInfo() {
  const { data: connectionData, isLoading } = useQuery<{ connection: ShopifyConnection }>({
    queryKey: ["/api/shopify/connection"],
  });
  
  if (isLoading) {
    return (
      <div className="ml-3">
        <Skeleton className="h-4 w-24 mb-1" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }
  
  const connection = connectionData?.connection;
  
  if (!connection || !connection.isConnected) {
    return (
      <div className="ml-3">
        <p className="text-sm font-medium text-neutral-900">Shopify</p>
        <p className="text-xs text-neutral-500">Not connected</p>
      </div>
    );
  }
  
  // Extract store name without myshopify.com domain
  const displayName = connection.storeName.replace('.myshopify.com', '');
  
  return (
    <div className="ml-3">
      <p className="text-sm font-medium text-neutral-900">{displayName}</p>
      <p className="text-xs text-neutral-500">Shopify Store</p>
    </div>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  
  return (
    <div className="bg-white border-r border-neutral-200 w-full md:w-64 md:flex md:flex-col md:fixed md:inset-y-0 z-10">
      <div className="flex items-center justify-between px-4 h-16 border-b border-neutral-200">
        <div className="flex items-center space-x-2">
          <div className="bg-primary w-8 h-8 rounded flex items-center justify-center">
            <Edit className="text-white text-lg" />
          </div>
          <h1 className="font-semibold text-lg">Blog Publisher</h1>
        </div>
      </div>
      
      <div className="sidebar-menu overflow-y-auto p-4 flex-grow">
        <nav className="space-y-1">
          <NavItem 
            href="/" 
            icon={<Edit size={18} />} 
            text="Dashboard" 
            active={location === "/"} 
          />
          {/* Blog Posts link hidden per user request */}
          {/* <NavItem 
            href="/blog-posts" 
            icon={<FileText size={18} />} 
            text="Blog Posts" 
            active={location === "/blog-posts"} 
          /> */}
          {/* Scheduled Posts link hidden per user request */}
          {/* <NavItem 
            href="/scheduled-posts" 
            icon={<Clock size={18} />} 
            text="Scheduled Posts" 
            active={location === "/scheduled-posts"} 
          /> */}
          <NavItem 
            href="/content-templates" 
            icon={<FileCode size={18} />} 
            text="Content Templates" 
            active={location === "/content-templates"} 
          />
          <NavItem 
            href="/simple-bulk-generation" 
            icon={<Zap size={18} />} 
            text="Bulk Generation" 
            active={location === "/simple-bulk-generation"} 
          />
          <NavItem 
            href="/analytics" 
            icon={<BarChart3 size={18} />} 
            text="Analytics" 
            active={location === "/analytics"} 
          />
          
          <div className="pt-4 mt-4 border-t border-neutral-200">
            <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Settings
            </h3>
            <div className="mt-2 space-y-1">
              <NavItem 
                href="/settings" 
                icon={<Settings size={18} />} 
                text="General" 
                active={location === "/settings"} 
              />
              <NavItem 
                href="/billing-settings" 
                icon={<Store size={18} />} 
                text="Billing" 
                active={location === "/billing-settings"} 
              />
              <NavItem 
                href="/help" 
                icon={<HelpCircle size={18} />} 
                text="Help & Support" 
                active={location === "/help"} 
              />
            </div>
          </div>
        </nav>
      </div>
      
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="text-primary h-4 w-4" />
          </div>
          <StoreInfo />
        </div>
      </div>
    </div>
  );
}