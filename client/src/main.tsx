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
metaDescription.content = "TopShop SEO - Automatically generate, optimize, and publish blog posts to increase your Shopify store's search visibility";
document.head.appendChild(metaDescription);

// Add favicon
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23008060' stroke='%23008060' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 19l7-7 3 3-7 7-3-3z'%3E%3C/path%3E%3Cpath d='M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'%3E%3C/path%3E%3Cpath d='M2 2l7.586 7.586'%3E%3C/path%3E%3Ccircle cx='11' cy='11' r='2'%3E%3C/circle%3E%3C/svg%3E";
document.head.appendChild(favicon);

// Create and render the app
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
