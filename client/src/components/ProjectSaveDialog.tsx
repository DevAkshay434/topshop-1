import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useStore } from '@/contexts/StoreContext';
import { Loader2, Plus, FolderOpen } from 'lucide-react';

interface ProjectSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSaved: (project: any) => void;
  projectData: any;
  currentProject?: any;
}

export function ProjectSaveDialog({ 
  isOpen, 
  onClose, 
  onProjectSaved, 
  projectData,
  currentProject 
}: ProjectSaveDialogProps) {
  const [saveOption, setSaveOption] = useState<'new' | 'existing'>('new');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedExistingProjectId, setSelectedExistingProjectId] = useState<string>('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { autoDetectedStoreId } = useStore();

  // Fetch existing projects for the dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['/api/projects'],
    enabled: isOpen,
  });

  const existingProjects = (projectsData as any)?.projects || [];

  // Create new project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; projectData: string }) =>
      apiRequest('POST', '/api/projects', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onProjectSaved(response.project);
      onClose();
      resetForm();
      toast({
        title: "Project created and saved",
        description: `"${response.project.name}" has been created with your current work.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating project",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  // Save to existing project mutation
  const saveToExistingMutation = useMutation({
    mutationFn: (data: { projectId: string; projectData: string }) =>
      apiRequest('PUT', `/api/projects/${data.projectId}`, {
        projectData: data.projectData
      }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      onProjectSaved(response.project);
      onClose();
      resetForm();
      toast({
        title: "Project updated",
        description: "Your work has been saved to the selected project.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving to project",
        description: error.message || "Failed to save to project",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSaveOption('new');
    setNewProjectName('');
    setNewProjectDescription('');
    setSelectedExistingProjectId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (saveOption === 'new') {
      if (!newProjectName.trim()) {
        toast({
          title: "Project name required",
          description: "Please enter a project name",
          variant: "destructive",
        });
        return;
      }

      createProjectMutation.mutate({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
        projectData: JSON.stringify(projectData),
      });
    } else {
      if (!selectedExistingProjectId) {
        toast({
          title: "Project selection required",
          description: "Please select an existing project",
          variant: "destructive",
        });
        return;
      }

      saveToExistingMutation.mutate({
        projectId: selectedExistingProjectId,
        projectData: JSON.stringify(projectData),
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isLoading = createProjectMutation.isPending || saveToExistingMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Project</DialogTitle>
          <DialogDescription>
            Choose how you want to save your current work.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <RadioGroup 
            value={saveOption} 
            onValueChange={(value: 'new' | 'existing') => setSaveOption(value)}
            className="space-y-4"
          >
            {/* Save as New Project Option */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <RadioGroupItem value="new" id="new" className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <Label htmlFor="new" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create a New Project
                </Label>
                <p className="text-sm text-muted-foreground">
                  Create a new project with your current work
                </p>
                
                {saveOption === 'new' && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <Label htmlFor="projectName" className="text-sm">Project Name *</Label>
                      <Input
                        id="projectName"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        placeholder="Enter project name"
                        className="mt-1"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectDescription" className="text-sm">Description (optional)</Label>
                      <Textarea
                        id="projectDescription"
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        placeholder="Enter project description"
                        className="mt-1 min-h-[60px]"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Save to Existing Project Option */}
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <RadioGroupItem value="existing" id="existing" className="mt-0.5" />
              <div className="flex-1 space-y-3">
                <Label htmlFor="existing" className="text-base font-medium cursor-pointer flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Save as Existing Project
                </Label>
                <p className="text-sm text-muted-foreground">
                  Update an existing project with your current work
                </p>
                
                {saveOption === 'existing' && (
                  <div className="mt-3">
                    <Label htmlFor="existingProject" className="text-sm">Select Project *</Label>
                    <Select
                      value={selectedExistingProjectId}
                      onValueChange={setSelectedExistingProjectId}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose an existing project" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingProjects.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            No existing projects found
                          </div>
                        ) : (
                          existingProjects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{project.name}</span>
                                {project.description && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {project.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </RadioGroup>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Project'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}