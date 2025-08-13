import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
// Table extensions temporarily removed due to import issues
// import Table from '@tiptap/extension-table'
// import TableRow from '@tiptap/extension-table-row'
// import TableHeader from '@tiptap/extension-table-header'
// import TableCell from '@tiptap/extension-table-cell'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Undo,
  Redo,
  Type,
  MoreHorizontal,
  MoveLeft,
  MoveRight,
  Maximize,
  Trash,
  Table as TableIcon,
  Plus,
  Columns,
  Rows
} from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'

interface ShopifyStyleEditorProps {
  content?: string
  onChange?: (content: string) => void
  className?: string
  editable?: boolean
}

export function ShopifyStyleEditor({ 
  content = '', 
  onChange, 
  className,
  editable = true 
}: ShopifyStyleEditorProps) {
  const userInitiatedChange = useRef(false);
  const isInitialLoad = useRef(true);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Preserve original content structure without automatic modifications
        bulletList: {
          HTMLAttributes: {
            class: 'shopify-bullet-list',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'shopify-ordered-list',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'shopify-blockquote',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'shopify-code-block',
          },
        },
      }),
      // Table extensions temporarily removed due to import issues
      // Table.configure({
      //   resizable: true,
      //   HTMLAttributes: {
      //     class: 'shopify-table',
      //   },
      // }),
      // TableRow,
      // TableHeader.configure({
      //   HTMLAttributes: {
      //     class: 'shopify-table-header',
      //   },
      // }),
      // TableCell.configure({
      //   HTMLAttributes: {
      //     class: 'shopify-table-cell',
      //   },
      // }),
      Image.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: {
          class: 'shopify-image',
          draggable: false,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {},
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      // Only call onChange for user-initiated changes, not programmatic content updates
      if (onChange && userInitiatedChange.current && !isInitialLoad.current) {
        onChange(editor.getHTML())
      }
      userInitiatedChange.current = false;
    },
    onCreate: () => {
      isInitialLoad.current = false;
    },
  })

  // Update editor content when content prop changes, but don't trigger onChange
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      userInitiatedChange.current = false;
      
      console.log("🔍 SHOPIFY EDITOR CONTENT UPDATE:");
      console.log("  New content length:", content?.length || 0);
      console.log("  First 300 chars:", content?.substring(0, 300));
      console.log("  H2 headings with IDs:", (content?.match(/<h2[^>]*id[^>]*>/g) || []).length);
      console.log("  TOC links with target=_blank:", (content?.match(/href="#[^"]*"[^>]*target="_blank"/g) || []).length);
      
      // Set content without triggering update events
      editor.commands.setContent(content);
      
      // Verify content after setting
      setTimeout(() => {
        const editorHTML = editor.getHTML();
        console.log("🔍 EDITOR CONTENT AFTER SETTING:");
        console.log("  Editor HTML length:", editorHTML?.length || 0);
        console.log("  Editor first 300 chars:", editorHTML?.substring(0, 300));
        console.log("  Editor H2 headings with IDs:", (editorHTML?.match(/<h2[^>]*id[^>]*>/g) || []).length);
        console.log("  Editor TOC links with target=_blank:", (editorHTML?.match(/href="#[^"]*"[^>]*target="_blank"/g) || []).length);
      }, 100);
    }
  }, [content, editor])

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      userInitiatedChange.current = true;
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const deleteSelectedImage = useCallback(() => {
    if (editor) {
      userInitiatedChange.current = true;
      editor.chain().focus().deleteSelection().run()
    }
  }, [editor])

  const isImageSelected = useCallback(() => {
    if (!editor) return false
    
    const { selection } = editor.state
    const { from, to } = selection
    
    let hasImage = false
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === 'image') {
        hasImage = true
      }
    })
    
    return hasImage
  }, [editor])

  const setImageAlignment = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (editor) {
      userInitiatedChange.current = true;
      const { selection } = editor.state
      const { from, to } = selection
      
      // Find image nodes in the current selection range
      let imageFound = false
      editor.state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'image' && !imageFound) {
          imageFound = true
          const alignmentClass = `shopify-image shopify-image-${alignment}`
          
          editor.chain()
            .focus()
            .setNodeSelection(pos)
            .updateAttributes('image', {
              class: alignmentClass
            })
            .run()
        }
      })
      
      // If no image found in selection, check around cursor position
      if (!imageFound) {
        const nodeAt = editor.state.doc.nodeAt(from)
        if (nodeAt && nodeAt.type.name === 'image') {
          const alignmentClass = `shopify-image shopify-image-${alignment}`
          editor.chain().focus().updateAttributes('image', {
            class: alignmentClass
          }).run()
        }
      }
    }
  }, [editor])

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:')
    if (url && editor) {
      userInitiatedChange.current = true;
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title,
    className = ""
  }: {
    onClick: () => void
    isActive?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
    className?: string
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={() => {
        userInitiatedChange.current = true;
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 p-0",
        className
      )}
    >
      {children}
    </Button>
  )

  return (
    <div className={cn("border rounded-lg", className)}>
      {editable && (
        <div className="border-b p-2 bg-muted/50">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Text Formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6" />

            {/* Links and Images */}
            <ToolbarButton
              onClick={addLink}
              isActive={editor.isActive('link')}
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={addImage}
              title="Add Image"
            >
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>

            {isImageSelected() && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant="secondary" className="text-xs">Image Selected</Badge>
                
                <ToolbarButton
                  onClick={() => setImageAlignment('left')}
                  title="Align Left"
                >
                  <MoveLeft className="h-4 w-4" />
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => setImageAlignment('center')}
                  title="Align Center"
                >
                  <AlignCenter className="h-4 w-4" />
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => setImageAlignment('right')}
                  title="Align Right"
                >
                  <MoveRight className="h-4 w-4" />
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={deleteSelectedImage}
                  title="Delete Image"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash className="h-4 w-4" />
                </ToolbarButton>
              </>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>
            
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>
          </div>
        </div>
      )}
      
      <div className="p-4">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none focus:outline-none"
        />
      </div>
    </div>
  )
}