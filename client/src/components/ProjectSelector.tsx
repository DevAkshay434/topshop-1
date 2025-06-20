import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Edit, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

interface Project {
  id: number;
  name: string;
  storeId: number | null;
  userId: number | null;
  formData: string | null;
  isTemplate: boolean;
  templateCategory: string | null;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelect: (project: Project | null) => void;
  onNewProject: (projectName: string) => void;
}

export function ProjectSelector({ isOpen, onClose, onProjectSelect, onNewProject }: ProjectSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  const { data: projectsData, isLoading } = useQuery<{ success: boolean; projects: Project[] }>({
    queryKey: ['/api/projects', currentStore?.id],
    enabled: isOpen && !!currentStore,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(currentStore?.id && { 'X-Store-ID': currentStore.id.toString() }),
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Failed to create project');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onNewProject(newProjectName);
      setNewProjectName('');
      setIsCreating(false);
      onClose();
      toast({
        title: 'Project Created',
        description: `"${newProjectName}" has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          ...(currentStore?.id && { 'X-Store-ID': currentStore.id.toString() }),
        },
      });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project Deleted',
        description: 'Project has been deleted successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a project name.',
        variant: 'destructive',
      });
      return;
    }
    createProjectMutation.mutate(newProjectName.trim());
  };

  const handleSelectProject = () => {
    if (selectedProject) {
      onProjectSelect(selectedProject);
      onClose();
    }
  };

  const handleDeleteProject = (projectId: number, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${projectName}"?`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {isCreating ? 'Create New Project' : 'Select Project'}
          </DialogTitle>
          <DialogDescription>
            {isCreating 
              ? 'Enter a name for your new content generation project.'
              : 'Choose an existing project to continue working on, or create a new one.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isCreating ? (
            <>
              {/* Project List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Your Projects</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Project
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading your projects...
                  </div>
                ) : projectsData?.projects?.length ? (
                  <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                    {projectsData.projects.map((project) => (
                      <Card
                        key={project.id}
                        className={`cursor-pointer transition-colors border-2 ${
                          selectedProject?.id === project.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedProject(project)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{project.name}</CardTitle>
                              <CardDescription className="text-xs">
                                Last modified: {formatDate(project.lastModified)}
                              </CardDescription>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No projects found.</p>
                    <p className="text-sm">Create your first project to get started.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Create New Project Form */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="e.g., Holiday Gift Guide 2024"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateProject();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {!isCreating ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSelectProject}
                disabled={!selectedProject}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Continue Project
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!newProjectName.trim() || createProjectMutation.isPending}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}