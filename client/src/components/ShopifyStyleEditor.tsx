import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { 
  Bold, 
  Italic, 
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Type,
  Eye,
  EyeOff,
  Save
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Custom extension to preserve raw HTML elements that TipTap might strip
const PreserveRawHTML = Extension.create({
  name: 'preserveRawHTML',
  
  addGlobalAttributes() {
    return [
      {
        // Preserve all attributes on all elements
        types: ['heading', 'paragraph', 'link'],
        attributes: {
          id: {
            default: null,
            parseHTML: element => element.getAttribute('id'),
            renderHTML: attributes => {
              if (!attributes.id) return {}
              return { id: attributes.id }
            },
          },
          target: {
            default: null,
            parseHTML: element => element.getAttribute('target'),
            renderHTML: attributes => {
              if (!attributes.target) return {}
              return { target: attributes.target }
            },
          },
          rel: {
            default: null,
            parseHTML: element => element.getAttribute('rel'),
            renderHTML: attributes => {
              if (!attributes.rel) return {}
              return { rel: attributes.rel }
            },
          },
          class: {
            default: null,
            parseHTML: element => element.getAttribute('class'),
            renderHTML: attributes => {
              if (!attributes.class) return {}
              return { class: attributes.class }
            },
          },
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {}
              return { style: attributes.style }
            },
          },
        },
      },
    ]
  },
  
  addProseMirrorPlugins() {
    return []
  }
})

// Custom iframe node to preserve YouTube embeds and other iframes
const IframeNode = Node.create({
  name: 'iframe',
  
  group: 'block',
  
  parseHTML() {
    return [
      {
        tag: 'iframe',
      },
      {
        tag: 'div[class*="video-container"]',
        getAttrs: (dom) => {
          const iframe = dom.querySelector('iframe')
          return iframe ? { src: iframe.src } : false
        },
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['iframe', {
      ...HTMLAttributes,
      loading: 'lazy',
      allowfullscreen: 'true',
      frameborder: '0',
    }, 0]
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: element => {
          // Handle both direct iframe and wrapped iframe in div
          if (element.tagName === 'IFRAME') {
            return element.getAttribute('src')
          } else if (element.tagName === 'DIV') {
            const iframe = element.querySelector('iframe')
            return iframe ? iframe.getAttribute('src') : null
          }
          return null
        },
      },
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
      },
      allow: {
        default: null,
        parseHTML: element => element.getAttribute('allow'),
      },
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
      },
    }
  },
})

// Custom table node to preserve table structure
const TableNode = Node.create({
  name: 'customTable',
  
  group: 'block',
  content: 'block+',
  
  parseHTML() {
    return [
      { tag: 'table' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['table', HTMLAttributes, 0]
  },

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
      },
    }
  },
})

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
  const [protectedElements, setProtectedElements] = useState<any[]>([]);

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
        // Preserve heading attributes including IDs
        heading: {
          HTMLAttributes: {},
        },
      }),
      // Add custom extension to preserve attributes
      PreserveRawHTML,
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
        HTMLAttributes: {
          rel: null,
          target: null,
        },
        // Prevent Tiptap from modifying link attributes - preserve all attributes
        validate: (href) => true,
        autolink: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    // Disable automatic parsing that might modify content structure
    parseOptions: {
      preserveWhitespace: 'full',
    },
    // Add specific editor options to preserve content
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      // Only call onChange for user-initiated changes, not programmatic content updates
      if (onChange && userInitiatedChange.current && !isInitialLoad.current) {
        const editedHTML = editor.getHTML();
        // Restore protected elements and fix common issues
        const restoredHTML = restoreComplexHTML(editedHTML, protectedElements);
        const finalHTML = cleanInternalLinks(preserveHeadingIds(restoredHTML));
        onChange(finalHTML);
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
      
      console.log("🔍 SHOPIFY EDITOR CONTENT UPDATE (ENHANCED CONTENT):");
      console.log("  New content length:", content?.length || 0);
      console.log("  Has YouTube iframe:", content?.includes('<iframe'));
      console.log("  Has TOC:", content?.includes('Table of Contents'));
      console.log("  Has product links:", content?.includes('data-product-'));
      
      // Protect complex HTML elements before setting in editor
      const { cleanContent, protectedElements: newProtectedElements } = protectComplexHTML(content);
      setProtectedElements(newProtectedElements);
      
      console.log("🛡️ CONTENT PROTECTION APPLIED:", {
        originalLength: content.length,
        cleanLength: cleanContent.length,
        protectedCount: newProtectedElements.length
      });
      
      // Set cleaned content in editor
      editor.commands.setContent(cleanContent, false);
      
      // Verify content after setting
      setTimeout(() => {
        const editorHTML = editor.getHTML();
        console.log("🔍 EDITOR VERIFICATION:", {
          editorLength: editorHTML?.length || 0,
          hasProtectionMarkers: editorHTML?.includes('(Protected)')
        });
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