import { Search, Bell, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      toast({
        title: "Search",
        description: `Searching for "${searchQuery}"`,
      });
    }
  };
  
  const handleNotificationClick = () => {
    toast({
      title: "Notifications",
      description: "No new notifications",
    });
  };
  
  const handleHelpClick = () => {
    toast({
      title: "Help & Support",
      description: "Visit the Help Center for assistance",
    });
  };
  
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-neutral-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center flex-1">
          <div className="flex w-full md:ml-0">
            <form onSubmit={handleSearch} className="relative w-full max-w-xs">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="text-neutral-500 h-4 w-4" />
              </div>
              <input 
                className="block w-full py-2 pl-10 pr-3 text-sm border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                placeholder="Search posts..."
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </form>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            className="p-1 text-neutral-500 hover:text-neutral-900"
            onClick={handleNotificationClick}
          >
            <Bell className="h-5 w-5" />
          </button>
          <button 
            className="p-1 text-neutral-500 hover:text-neutral-900"
            onClick={handleHelpClick}
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
