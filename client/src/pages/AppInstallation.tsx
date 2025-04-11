import React from 'react';
import AppInstallationComponent from '@/components/AppInstallation';

export default function AppInstallationPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 flex items-center justify-center bg-blue-500 text-white rounded-sm font-bold text-xl">
            TS
          </div>
          <h1 className="text-3xl font-bold">Install TopShop SEO on Your Shopify Store</h1>
        </div>
        <p className="text-gray-600">
          Automatically generate SEO-optimized blog content for your Shopify store 
          using advanced AI technology. Save time, increase search visibility, and keep your blog fresh with minimal effort.
        </p>
      </div>
      
      <AppInstallationComponent />
      
      <div className="max-w-lg mx-auto mt-10 text-center">
        <h2 className="text-xl font-medium mb-4">Why Choose TopShop SEO?</h2>
        <ul className="text-left space-y-2 mb-8">
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>Generate high-quality blog posts with a single click</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>Schedule content for automated publishing</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>Customize tone, style, and length to match your brand</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>Multi-store support for all your Shopify stores</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>Flexible pricing plans to fit your needs</span>
          </li>
        </ul>
        
        <p className="text-sm text-gray-500">
          By installing this app, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}