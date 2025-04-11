import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";

// Set title 
document.title = "TopShop SEO";

// Special setup for Shopify embedded apps - detect if we're in an iframe
const isEmbedded = window !== window.parent;

// Set up content security policy dynamically if we're embedded
if (isEmbedded) {
  // The app is being embedded in an iframe
  console.log("App is running in embedded mode");
  
  // Add additional meta tags needed for iframe embedding
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = 'Content-Security-Policy';
  cspMeta.content = "frame-ancestors 'self' https://*.myshopify.com https://admin.shopify.com https://accounts.shopify.com;";
  document.head.appendChild(cspMeta);
}

// Create a meta description
const metaDescription = document.createElement("meta");
metaDescription.name = "description";
metaDescription.content = "TopShop SEO - Automatically generate, optimize, and publish SEO-friendly blog posts to increase your Shopify store's search visibility";
document.head.appendChild(metaDescription);

// Add favicon
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300A3E0' stroke='%2300A3E0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M11 4h10v4h-10V4zM11 12h10v4h-10v-4zM11 20h10v4h-10v-4z'%3E%3C/path%3E%3Cpath d='M3 8L7 4L7 8L3 8Z'%3E%3C/path%3E%3Cpath d='M3 12l4 5l0 -5l-4 0z'%3E%3C/path%3E%3C/svg%3E";
document.head.appendChild(favicon);

// Create and render the app
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
