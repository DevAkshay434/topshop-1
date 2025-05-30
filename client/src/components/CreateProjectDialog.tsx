import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Info } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: any) => void;
}

export function CreateProjectDialog({ open, onOpenChange, onProjectCreated }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest('/api/projects/save', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          formData: {} // Empty form data for new project
        }),
      });
    },
    onSuccess: (data) => {
      // Save project name to localStorage for immediate use
      localStorage.setItem('current-project', name.trim());
      
      // Dispatch custom event to notify AdminPanel of project creation
      window.dispatchEvent(new CustomEvent('projectNameChanged', {
        detail: { projectName: name.trim() }
      }));
      
      toast({
        title: "Project Created",
        description: "Your new project has been created and is ready to use.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (onProjectCreated) {
        onProjectCreated(data);
      }
      onOpenChange(false);
      setName('');
      setDescription('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a name for your project",
        variant: "destructive",
      });
      return;
    }
    createProjectMutation.mutate({ name: name.trim(), description: description.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Project
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Most Shopify users create a project for each of their top-selling products.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
          <DialogDescription>
            Create a new project to organize your content generation. You can save your settings and reuse them later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Winter Collection 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-description">Description (Optional)</Label>
              <Textarea
                id="project-description"
                placeholder="Brief description of this project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProjectMutation.isPending}>
              {createProjectMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}