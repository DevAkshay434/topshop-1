import React from 'react';

interface ContentPreviewProps {
  content: string;
  selectedProducts?: Array<{
    id: string;
    title: string;
    handle: string;
    image?: string;
    body_html?: string;
    admin_url?: string;
  }>;
}

export function ContentPreview({ content, selectedProducts }: ContentPreviewProps) {
  if (!content) return <p>No content available</p>;
  
  // Process content to ensure images display properly
  let processedContent = content;
  
  // Fix relative image URLs to absolute URLs
  processedContent = processedContent.replace(
    /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
    '<img$1src="https://$2"$3>'
  );
  
  // Fix image URLs that start with //
  processedContent = processedContent.replace(
    /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
    '<img$1src="https://$3"$4>'
  );
  
  // Make sure all images have proper styling
  processedContent = processedContent.replace(
    /<img([^>]*?)>/gi,
    '<img$1 style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem auto; display: block; cursor: pointer;">'
  );

  // Link product images to their product pages
  if (selectedProducts && selectedProducts.length > 0) {
    selectedProducts.forEach(product => {
      if (product.image && product.admin_url) {
        try {
          const imageFilename = product.image.split('/').pop() || '';
          if (imageFilename) {
            const pattern = new RegExp(`<img([^>]*?)src=['"](.*?${imageFilename}.*?)['"]([^>]*?)>`, 'gi');
            processedContent = processedContent.replace(
              pattern,
              `<a href="${product.admin_url}" target="_blank" style="display: block; text-align: center;"><img$1src="$2"$3></a>`
            );
          }
        } catch (e) {
          console.error("Error processing product image:", e);
        }
      }
    });
  }
  
  // Return the enhanced content with proper styling
  return <div className="content-preview prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: processedContent }} />;
}