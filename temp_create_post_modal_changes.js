// This is a temporary file for CreatePostModal.tsx changes
// First instance (around line 565)
.replace(/<\/h3>([^\n<])/g, '</h3><br />$1')
// Fix relative image URLs to absolute URLs (adding https:// if missing)
.replace(
  /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
  '<img$1src="https://$2"$3>'
)
// Fix image URLs that might be missing domain (starting with //)
.replace(
  /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
  '<img$1src="https://$3"$4>'
)

// Second instance (around line 612)
.replace(/<\/h3>([^\n<])/g, '</h3><br />$1')
// Fix relative image URLs to absolute URLs (adding https:// if missing)
.replace(
  /<img([^>]*?)src=["'](?!http)([^"']+)["']([^>]*?)>/gi,
  '<img$1src="https://$2"$3>'
)
// Fix image URLs that might be missing domain (starting with //)
.replace(
  /<img([^>]*?)src=["'](\/\/)([^"']+)["']([^>]*?)>/gi,
  '<img$1src="https://$3"$4>'
)