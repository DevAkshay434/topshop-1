import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
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
  Trash
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

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
  const editor = useEditor({
    extensions: [
      StarterKit,
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
        HTMLAttributes: {
          class: 'shopify-link',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML())
      }
    },
  })

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor])

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const deleteSelectedImage = useCallback(() => {
    if (editor) {
      editor.chain().focus().deleteSelection().run()
    }
  }, [editor])

  const isImageSelected = useCallback(() => {
    if (!editor) return false
    
    // Simple check if current selection contains an image
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
      const { selection } = editor.state
      const { from, to } = selection
      
      // Check if an image is currently selected
      if (selection.node && selection.node.type.name === 'image') {
        // Direct image selection
        const alignmentClass = `shopify-image shopify-image-${alignment}`
        editor.chain().focus().updateAttributes('image', {
          class: alignmentClass
        }).run()
        return
      }
      
      // Find image nodes in the current selection range
      let imageFound = false
      editor.state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'image' && !imageFound) {
          imageFound = true
          const alignmentClass = `shopify-image shopify-image-${alignment}`
          
          // Select the image and update its attributes
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
        } else {
          // Look for nearby images
          editor.state.doc.nodesBetween(Math.max(0, from - 5), Math.min(editor.state.doc.content.size, from + 5), (node, pos) => {
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
        }
      }
    }
  }, [editor])

  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:')
    if (url && editor) {
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
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 p-0",
        isActive && "bg-blue-100 text-blue-900 border border-blue-300",
        className
      )}
    >
      {children}
    </Button>
  )

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {editable && (
        <div className="border-b bg-gray-50 p-2">
          <div className="flex flex-wrap items-center gap-1">
            {/* Text formatting */}
            <div className="flex items-center gap-1">
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
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
              >
                <Strikethrough className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCode().run()}
                isActive={editor.isActive('code')}
                title="Inline Code"
              >
                <Code className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Headings */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
              >
                <span className="text-xs font-bold">H1</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                <span className="text-xs font-bold">H2</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                <span className="text-xs font-bold">H3</span>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setParagraph().run()}
                isActive={editor.isActive('paragraph')}
                title="Paragraph"
              >
                <Type className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Text alignment */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
              >
                <AlignLeft className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
              >
                <AlignCenter className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
              >
                <AlignRight className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Lists */}
            <div className="flex items-center gap-1">
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
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Media and elements */}
            <div className="flex items-center gap-1">
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
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Image alignment controls - only show when image is selected */}
            {isImageSelected() && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 mr-2">Image:</span>
                  <ToolbarButton
                    onClick={() => setImageAlignment('left')}
                    title="Align Image Left"
                  >
                    <MoveLeft className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => setImageAlignment('center')}
                    title="Align Image Center"
                  >
                    <Maximize className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => setImageAlignment('right')}
                    title="Align Image Right"
                  >
                    <MoveRight className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={deleteSelectedImage}
                    title="Delete Selected Image"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash className="h-4 w-4" />
                  </ToolbarButton>
                </div>
              </>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Quote and HR */}
            <div className="flex items-center gap-1">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
              >
                <Minus className="h-4 w-4" />
              </ToolbarButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Undo/Redo */}
            <div className="flex items-center gap-1">
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
        </div>
      )}
      
      <div className="prose prose-sm max-w-none p-4 h-[400px] overflow-y-auto border-t">
        <EditorContent 
          editor={editor} 
          className="h-full focus:outline-none"
        />
      </div>
      
      {editable && (
        <div className="border-t bg-gray-50 p-2 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>
              {editor.storage.characterCount?.characters() || 0} characters, {' '}
              {editor.storage.characterCount?.words() || 0} words
            </span>
            <Badge variant="secondary" className="text-xs">
              Shopify Compatible
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}