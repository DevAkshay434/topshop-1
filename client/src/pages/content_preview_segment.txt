{(() => {
  // Get content
  const content = generatedContent.content;
  console.log("Content preview data:", { 
    content: content?.substring(0, 200) + "...", 
    hasImgTags: content?.includes("<img"),
    secondaryImages: generatedContent.secondaryImages,
    selectedProducts: selectedProducts?.length || 0
  });
  if (!content) return <p>No content available</p>;

  // Get YouTube data if exists
  const youtubeUrl = form.watch("youtubeUrl");
  let youtubeVideoId: string | null = null;
  if (youtubeUrl) {
    youtubeVideoId = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)?.[1] || null;
  }
  
  // Create YouTube embed component
  const YouTubeEmbed = () => (
    <div className="my-8 flex justify-center">
      <iframe 
        width="560" 
        height="315" 
        src={`https://www.youtube.com/embed/${youtubeVideoId}`}
        title="YouTube video" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowFullScreen
        className="rounded-md border border-gray-200"
      />
    </div>
  );
  
  // Check if content has YouTube placeholder
  const hasYoutubePlaceholder = content.includes('[YOUTUBE]');
  
  // Get secondary images
  const secondaryImages = generatedContent.secondaryImages || [];
  
  // Check for image tags in content 
  const hasImageTags = content.includes('<img');

  // Enhanced image processing for all content
  let enhancedContent = content;
  
  // Replace YouTube placeholder if exists
  if (hasYoutubePlaceholder && youtubeVideoId) {
    // Split at YouTube placeholder
    const parts = content.split('[YOUTUBE]');
    return (
      <div className="content-preview prose prose-blue max-w-none">
        {parts[0] && <div dangerouslySetInnerHTML={{ __html: parts[0] }} />}
        <YouTubeEmbed />
        {parts[1] && <div dangerouslySetInnerHTML={{ __html: parts[1] }} />}
      </div>
    );
  }
  
  // Process all <a> tags with embedded images to ensure they display properly and are clickable
  enhancedContent = enhancedContent.replace(
    /<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>(\s*)<img([^>]*?)src=["']([^"']+)["']([^>]*?)>(\s*)<\/a>/gi,
    (match, href, prespace, imgAttr, src, imgAttrEnd, postspace) => {
      // Create URL objects
      let imgUrl = src;
      try {
        // Normalize image URL for better matching
        if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {
          imgUrl = '/' + imgUrl;
        }
      } catch (e) {
        console.error("Error processing image URL:", e);
      }

      // Check if this image matches any of the selected products
      const matchedProduct = selectedProducts?.find(product => {
        if (!product.image) return false;
        const productImg = product.image;
        // Perform a partial match - the src might be a resized or CDN version of the same image
        return imgUrl.includes(productImg) || productImg.includes(imgUrl);
      });

      // If we found a match, update the href to use the product's admin URL
      const finalHref = matchedProduct?.admin_url || href;
      
      // Make all images have cursor pointer for better UX
      const pointerStyle = 'style="cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;"';
      
      // Add target="_blank" for external links
      const targetAttr = finalHref.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '';
      
      // Return the enhanced anchor tag with the image
      return `<a href="${finalHref}" ${targetAttr} style="display: inline-block;">${prespace}<img${imgAttr}src="${src}"${imgAttrEnd} ${pointerStyle}>${postspace}</a>`;
    }
  );
  
  // Process standalone images that are not in <a> tags
  enhancedContent = enhancedContent.replace(
    /(?<!<a[^>]*?>[\s\S]*?)(<img[^>]*?src=["']([^"']+)["'][^>]*?>)(?![\s\S]*?<\/a>)/gi,
    (match, imgTag, imgSrc) => {
      // Check if this image matches any product
      const matchedProduct = selectedProducts?.find(product => {
        if (!product.image) return false;
        return imgSrc.includes(product.image) || product.image.includes(imgSrc);
      });
      
      // If we have a product match, wrap in anchor tag
      if (matchedProduct?.admin_url) {
        const targetAttr = matchedProduct.admin_url.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${matchedProduct.admin_url}" ${targetAttr} style="display: inline-block;">${imgTag.replace(/style=["'][^"']*["']/, 'style="cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;"')}</a>`;
      }
      
      // Otherwise, just ensure it has cursor pointer
      return imgTag.replace(/style=["'][^"']*["']/, 'style="cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;"');
    }
  );
  
  // Ensure all images have cursor pointer
  enhancedContent = enhancedContent.replace(
    /<img([^>]*?)style=["']([^"']*)["']([^>]*?)>/gi,
    (match, before, style, after) => {
      // Add cursor: pointer if it's not already there
      const updatedStyle = style.includes('cursor:') ? style : style + '; cursor: pointer;';
      return `<img${before}style="${updatedStyle}"${after}>`;
    }
  );
  
  // Add style attribute to images that don't have one
  enhancedContent = enhancedContent.replace(
    /<img([^>]*?)(?!style=["'][^"']*["'])([^>]*?)>/gi,
    '<img$1 style="cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;"$2>'
  );
  
  // If content has no YouTube placeholder but we have YouTube URL, add it at the top
  if (youtubeVideoId && !hasYoutubePlaceholder) {
    return (
      <div className="content-preview prose prose-blue max-w-none">
        <YouTubeEmbed />
        <div dangerouslySetInnerHTML={{ __html: enhancedContent }} />
      </div>
    );
  }

  // Return the enhanced content with proper image styling
  return <div className="content-preview prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: enhancedContent }} />;
})()}