#!/bin/bash

# This script fixes the image display in the AdminPanel.tsx preview section
# by removing the problematic if/else structure and replacing it with a simpler approach

# Find the start line after hasImageTags is declared
START_LINE=$(grep -n "const hasImageTags = content.includes('<img');" client/src/pages/AdminPanel.tsx | cut -d':' -f1)
START_LINE=$((START_LINE + 1))

# Find the end line where the closing } else { is located
END_LINE=$(grep -n "} else {" client/src/pages/AdminPanel.tsx | cut -d':' -f1)

# Create sed command to replace the problematic section
sed -i "${START_LINE},${END_LINE}c\\
                        // Process content to ensure all images display properly\\
                        // Enhanced processing for content with images\\
                        let enhancedContent = content;\\
                        \\
                        // Process all <a> tags with embedded images to ensure they display properly and are clickable\\
                        enhancedContent = enhancedContent.replace(\\
                          /<a\\s+[^>]*?href=[\"']([^\"']+)[\"'][^>]*?>(\\s*)<img([^>]*?)src=[\"']([^\"']+)[\"']([^>]*?)>(\\s*)<\\/a>/gi,\\
                          (match, href, prespace, imgAttr, src, imgAttrEnd, postspace) => {\\
                            // Create URL objects\\
                            let imgUrl = src;\\
                            try {\\
                              // Normalize image URL for better matching\\
                              if (!imgUrl.startsWith('http') && !imgUrl.startsWith('/')) {\\
                                imgUrl = '/' + imgUrl;\\
                              }\\
                            } catch (e) {\\
                              console.error(\"Error processing image URL:\", e);\\
                            }\\
\\
                            // Check if this image matches any of the selected products\\
                            const matchedProduct = selectedProducts?.find(product => {\\
                              if (!product.image) return false;\\
                              const productImg = product.image;\\
                              // Perform a partial match - the src might be a resized or CDN version of the same image\\
                              return imgUrl.includes(productImg) || productImg.includes(imgUrl);\\
                            });\\
\\
                            // If we found a match, update the href to use the product's admin URL\\
                            const finalHref = matchedProduct?.admin_url || href;\\
                            \\
                            // Make all images have cursor pointer for better UX\\
                            const pointerStyle = 'style=\"cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;\"';\\
                            \\
                            // Add target=\"_blank\" for external links\\
                            const targetAttr = finalHref.startsWith('http') ? 'target=\"_blank\" rel=\"noopener noreferrer\"' : '';\\
                            \\
                            // Return the enhanced anchor tag with the image\\
                            return \`<a href=\"\${finalHref}\" \${targetAttr} style=\"display: inline-block;\">\${prespace}<img\${imgAttr}src=\"\${src}\"\${imgAttrEnd} \${pointerStyle}>\${postspace}</a>\`;\\
                          }\\
                        );\\
                        \\
                        // Process standalone images that are not in <a> tags\\
                        enhancedContent = enhancedContent.replace(\\
                          /(?<!<a[^>]*?>[\\s\\S]*?)(<img[^>]*?src=[\"']([^\"']+)[\"'][^>]*?>)(?![\\s\\S]*?<\\/a>)/gi,\\
                          (match, imgTag, imgSrc) => {\\
                            // Check if this image matches any product\\
                            const matchedProduct = selectedProducts?.find(product => {\\
                              if (!product.image) return false;\\
                              return imgSrc.includes(product.image) || product.image.includes(imgSrc);\\
                            });\\
                            \\
                            // If we have a product match, wrap in anchor tag\\
                            if (matchedProduct?.admin_url) {\\
                              const targetAttr = matchedProduct.admin_url.startsWith('http') ? 'target=\"_blank\" rel=\"noopener noreferrer\"' : '';\\
                              return \`<a href=\"\${matchedProduct.admin_url}\" \${targetAttr} style=\"display: inline-block;\">\${imgTag.replace(/style=[\"'][^\"']*[\"']/, 'style=\"cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;\"')}</a>\`;\\
                            }\\
                            \\
                            // Otherwise, just ensure it has cursor pointer\\
                            return imgTag.replace(/style=[\"'][^\"']*[\"']/, 'style=\"cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;\"');\\
                          }\\
                        );\\
                        \\
                        // Ensure all images have cursor pointer\\
                        enhancedContent = enhancedContent.replace(\\
                          /<img([^>]*?)style=[\"']([^\"']*)[\"']([^>]*?)>/gi,\\
                          (match, before, style, after) => {\\
                            // Add cursor: pointer if it's not already there\\
                            const updatedStyle = style.includes('cursor:') ? style : style + '; cursor: pointer;';\\
                            return \`<img\${before}style=\"\${updatedStyle}\"\${after}>\`;\\
                          }\\
                        );\\
                        \\
                        // Add style attribute to images that don't have one\\
                        enhancedContent = enhancedContent.replace(\\
                          /<img([^>]*?)(?!style=[\"'][^\"']*[\"'])([^>]*?)>/gi,\\
                          '<img\\$1 style=\"cursor: pointer; max-width: 100%; height: auto; border-radius: 6px; margin: 1rem 0;\"\\$2>'\\
                        );" client/src/pages/AdminPanel.tsx

# Now fix the remaining part - find the two closing braces we need to remove
CLOSING_BRACE_LINE=$(grep -n "                            return <div className=\"content-preview prose prose-blue max-w-none\" dangerouslySetInnerHTML={{ __html: enhancedContent }} />;" client/src/pages/AdminPanel.tsx | cut -d':' -f1)
CLOSING_BRACE_LINE=$((CLOSING_BRACE_LINE + 1))

# Replace the closing brace with a return statement
sed -i "${CLOSING_BRACE_LINE}c\\
                        return <div className=\"content-preview prose prose-blue max-w-none\" dangerouslySetInnerHTML={{ __html: enhancedContent }} />;" client/src/pages/AdminPanel.tsx

echo "AdminPanel.tsx image display preview fixed successfully"