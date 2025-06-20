import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from './StoreContext';
import { useToast } from '@/hooks/use-toast';

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

interface ProjectContextType {
  currentProject: Project | null;
  currentProjectName: string;
  setCurrentProject: (project: Project | null) => void;
  setCurrentProjectName: (name: string) => void;
  saveFormData: (formData: any) => void;
  loadFormData: () => any;
  autoSaveFormData: (formData: any) => void;
  isAutoSaving: boolean;
  createNewProject: (name: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const { currentStore } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for updating project data
  const updateProjectMutation = useMutation({
    mutationFn: async ({ projectId, formData }: { projectId: number; formData: any }) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(currentStore?.id && { 'X-Store-ID': currentStore.id.toString() }),
        },
        body: JSON.stringify({ formData: JSON.stringify(formData) }),
      });
      if (!response.ok) throw new Error('Failed to update project');
      return response.json();
    },
    onSuccess: (data) => {
      // Update the current project with new data
      if (data.project) {
        setCurrentProject(data.project);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Failed to auto-save project:', error);
      toast({
        title: 'Auto-save Failed',
        description: 'Could not save your progress automatically. Please save manually.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsAutoSaving(false);
    },
  });

  // Create new project mutation
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
      if (data.project) {
        setCurrentProject(data.project);
        setCurrentProjectName(data.project.name);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Project Created',
        description: `"${data.project?.name}" has been created successfully.`,
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

  // Auto-save function with debouncing
  const autoSaveFormData = useCallback((formData: any) => {
    if (!currentProject) return;

    // Clear previous timeout
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save (debounce for 2 seconds)
    const timeoutId = setTimeout(() => {
      setIsAutoSaving(true);
      updateProjectMutation.mutate({
        projectId: currentProject.id,
        formData,
      });
    }, 2000);

    setAutoSaveTimeout(timeoutId);
  }, [currentProject, autoSaveTimeout, updateProjectMutation]);

  // Manual save function
  const saveFormData = useCallback((formData: any) => {
    if (!currentProject) return;

    // Clear any pending auto-save
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      setAutoSaveTimeout(null);
    }

    setIsAutoSaving(true);
    updateProjectMutation.mutate({
      projectId: currentProject.id,
      formData,
    });
  }, [currentProject, autoSaveTimeout, updateProjectMutation]);

  // Load form data from current project
  const loadFormData = useCallback(() => {
    if (!currentProject || !currentProject.formData) return null;
    
    try {
      return JSON.parse(currentProject.formData);
    } catch (error) {
      console.error('Failed to parse project form data:', error);
      return null;
    }
  }, [currentProject]);

  // Create new project function
  const createNewProject = useCallback((name: string) => {
    setCurrentProjectName(name);
    createProjectMutation.mutate(name);
  }, [createProjectMutation]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  }, [autoSaveTimeout]);

  const value: ProjectContextType = {
    currentProject,
    currentProjectName,
    setCurrentProject,
    setCurrentProjectName,
    saveFormData,
    loadFormData,
    autoSaveFormData,
    isAutoSaving,
    createNewProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}