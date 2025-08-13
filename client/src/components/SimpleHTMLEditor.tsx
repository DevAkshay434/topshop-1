import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Code, Type } from 'lucide-react'
import { useState } from 'react'

interface SimpleHTMLEditorProps {
  content?: string
  onChange?: (content: string) => void
  className?: string
  editable?: boolean
}

export function SimpleHTMLEditor({ 
  content = '', 
  onChange, 
  className,
  editable = true 
}: SimpleHTMLEditorProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'html'>('visual')
  const [htmlContent, setHtmlContent] = useState(content)

  const handleContentChange = (newContent: string) => {
    setHtmlContent(newContent)
    onChange?.(newContent)
  }

  // Update internal content when prop changes
  if (content !== htmlContent && content !== '') {
    setHtmlContent(content)
  }

  return (
    <div className={cn("border rounded-lg", className)}>
      {editable && (
        <div className="border-b p-2 bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'visual' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('visual')}
              className="h-8"
            >
              <Eye className="h-4 w-4 mr-1" />
              Visual
            </Button>
            
            <Button
              variant={viewMode === 'html' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('html')}
              className="h-8"
            >
              <Code className="h-4 w-4 mr-1" />
              HTML
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            HTML-preserving editor - all content preserved
          </div>
        </div>
      )}

      <div className="p-2">
        {viewMode === 'visual' ? (
          <div 
            ref={(el) => {
              if (el && el.innerHTML !== htmlContent) {
                el.innerHTML = htmlContent;
              }
            }}
            className="prose prose-sm max-w-none h-64 overflow-y-auto p-3 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
            contentEditable={editable}
            suppressContentEditableWarning={true}
            onInput={(e) => {
              const target = e.target as HTMLDivElement;
              handleContentChange(target.innerHTML);
            }}
            onBlur={(e) => {
              const target = e.target as HTMLDivElement;
              handleContentChange(target.innerHTML);
            }}
            style={{
              fontSize: '14px',
              lineHeight: '1.6'
            }}
          />
        ) : (
          <Textarea
            value={htmlContent}
            onChange={(e) => handleContentChange(e.target.value)}
            disabled={!editable}
            className="h-64 font-mono text-sm resize-none"
            placeholder="Enter HTML content here..."
            style={{
              fontFamily: 'Monaco, Consolas, "Courier New", monospace'
            }}
          />
        )}
      </div>

      {editable && viewMode === 'visual' && (
        <div className="border-t p-2 bg-muted/50">
          <div className="text-xs text-muted-foreground">
            💡 Switch to HTML mode to edit content. Visual mode shows the rendered result.
          </div>
        </div>
      )}
    </div>
  )
}