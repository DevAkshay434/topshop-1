import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ClaudeContentForm from '@/components/ClaudeContentForm';

export default function ClaudeWorkflow() {
  const { toast } = useToast();
  
  const handleContentGenerated = (content: any) => {
    console.log("Content generated:", content);
    toast({
      title: "Content Generated",
      description: "Your content has been successfully generated with Claude AI.",
    });
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Claude AI Content Generation</h1>
        <p className="text-muted-foreground">
          Generate SEO-optimized content for your Shopify store using Claude AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Content with Claude AI</CardTitle>
        </CardHeader>
        <CardContent>
          <ClaudeContentForm onContentGenerated={handleContentGenerated} />
        </CardContent>
      </Card>
    </div>
  );
}