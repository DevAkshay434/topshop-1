import React, { useState } from 'react';
import { ContentPreview } from '../components/ContentPreview';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// Form validation schema
const contentFormSchema = z.object({
  title: z.string().min(1, { message: "Please enter a title" }),
  content: z.string().optional(),
});

type ContentFormValues = z.infer<typeof contentFormSchema>;

interface Product {
  id: string;
  title: string;
  handle: string;
  image?: string;
  body_html?: string;
  admin_url?: string;
}

export default function AdminPanel() {
  const { toast } = useToast();
  
  // State
  const [selectedTab, setSelectedTab] = useState('preview');
  const [generatedContent, setGeneratedContent] = useState<any>({
    content: '<h2>Sample Content</h2><p>This is sample content to demonstrate the content preview functionality with product images.</p><img src="https://cdn.shopify.com/s/files/1/0574/9263/5817/products/bigmango.jpg?v=1626120526" alt="Mango product" /><p>You can see how product images are rendered and linked.</p>'
  });
  
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([
    {
      id: '1',
      title: 'Sample Mango Product',
      handle: 'sample-mango',
      image: 'https://cdn.shopify.com/s/files/1/0574/9263/5817/products/bigmango.jpg?v=1626120526',
      admin_url: 'https://example.shopify.com/admin/products/1'
    }
  ]);
  
  // Form
  const form = useForm<ContentFormValues>({
    resolver: zodResolver(contentFormSchema),
    defaultValues: {
      title: 'How to Choose the Perfect Mango',
      content: generatedContent.content,
    },
  });
  
  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Content Preview Demo</h1>
            <p className="text-gray-500 mt-1">Improved image handling and product linking</p>
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Content Preview</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="edit">
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="title">Post Title</Label>
                    <Input
                      id="title"
                      placeholder="Enter a title"
                      {...form.register('title')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Enter content (can include HTML)"
                      className="min-h-[200px]"
                      {...form.register('content')}
                      value={generatedContent.content}
                      onChange={(e) => setGeneratedContent({...generatedContent, content: e.target.value})}
                    />
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={() => setSelectedTab('preview')}
                  >
                    Preview Content
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="preview">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      {form.getValues('title') || 'Untitled Content'}
                    </h3>
                    
                    <div className="rounded-md p-5 max-h-[60vh] overflow-y-auto bg-white shadow-sm border border-gray-100">
                      <ContentPreview 
                        content={generatedContent.content} 
                        selectedProducts={selectedProducts} 
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-between mt-6">
                    <Button 
                      type="button" 
                      onClick={() => setSelectedTab('edit')}
                    >
                      Edit Content
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}