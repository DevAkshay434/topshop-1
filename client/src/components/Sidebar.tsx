import { useLocation, Link } from "wouter";
import { 
  Edit, 
  FileText, 
  Clock, 
  Sparkles, 
  BarChart3, 
  Settings, 
  Store, 
  HelpCircle,
  LogOut
} from "lucide-react";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  active?: boolean;
}

function NavItem({ href, icon, text, active }: NavItemProps) {
  return (
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
          <NavItem 
            href="/blog-posts" 
            icon={<FileText size={18} />} 
            text="Blog Posts" 
            active={location === "/blog-posts"} 
          />
          <NavItem 
            href="/scheduled-posts" 
            icon={<Clock size={18} />} 
            text="Scheduled Posts" 
            active={location === "/scheduled-posts"} 
          />
          <NavItem 
            href="/ai-templates" 
            icon={<Sparkles size={18} />} 
            text="AI Templates" 
            active={location === "/ai-templates"} 
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
          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center">
            <span className="text-neutral-500 font-medium">EM</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-neutral-900">Emma Wilson</p>
            <p className="text-xs text-neutral-500">Fashion Boutique</p>
          </div>
        </div>
      </div>
    </div>
  );
}
