import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function AdminPanel() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Redirect to EnhancedWorkflowDemo
  const goToEnhanced = () => {
    setLocation('/enhanced');
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>New Enhanced Workflow Available</CardTitle>
            <CardDescription>
              We've improved the content generation workflow to make it more efficient and flexible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              The new workflow includes editable content, flexible publishing options, and topic cluster management.
            </p>
            <Button onClick={goToEnhanced} className="mt-4">
              Try Enhanced Workflow
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}