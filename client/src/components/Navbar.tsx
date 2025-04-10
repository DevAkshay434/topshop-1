import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Blog Posts', path: '/blog-posts' },
    { name: 'Scheduled Posts', path: '/scheduled-posts' },
    { name: 'Shopify Connection', path: '/shopify-connection' },
    { name: 'Billing Settings', path: '/billing-settings' },
    { name: 'Install App', path: '/install' },
  ];

  return (
    <div className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">BlogifyAI</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium",
                    isActive(item.path)
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="sm:hidden py-3 px-4 border-t">
        <div className="flex flex-col space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "text-sm font-medium px-2 py-1 rounded-md",
                isActive(item.path)
                  ? "bg-primary/10 text-primary"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}