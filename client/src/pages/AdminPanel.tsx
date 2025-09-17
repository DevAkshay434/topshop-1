import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { SchedulingPermissionNotice } from "../components/SchedulingPermissionNotice";
import { useStore } from "../contexts/StoreContext";
import { ProjectCreationDialog } from "../components/ProjectCreationDialog";
import { ProjectLoadDialog } from "../components/ProjectLoadDialog";
import { ProjectSaveDialog } from "../components/ProjectSaveDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  PlusCircle,
  FolderOpen,
} from "lucide-react";

export default function AdminPanel() {
  // Store context and navigation
  const storeContext = useStore();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Project management state
  const [currentProject, setCurrentProject] = useState<any | null>(null);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showLoadProjectDialog, setShowLoadProjectDialog] = useState(false);
  const [showProjectSaveDialog, setShowProjectSaveDialog] = useState(false);

  // Query for permissions data
  const { data: permissionsData } = useQuery({
    queryKey: [
      "/api/shopify/scheduling-permissions",
      storeContext.currentStore?.id,
    ],
    enabled: !!storeContext.currentStore?.id,
  });

  // Project management functions
  const handleCreateProject = (project: any) => {
    setCurrentProject(project);
    toast({
      title: "Project created",
      description: `"${project.name}" is now your active project.`,
    });
  };

  const handleLoadProject = (project: any) => {
    try {
      setCurrentProject(project);
      toast({
        title: "Project loaded",
        description: `"${project.name}" has been loaded successfully.`,
      });
    } catch (error) {
      console.error("Error loading project:", error);
      toast({
        title: "Error loading project",
        description: "There was a problem loading the project data.",
        variant: "destructive",
      });
    }
  };

  const extractFormStateForSaving = () => {
    // Simple state extraction for project saving
    return {
      currentProject: currentProject,
      timestamp: new Date().toISOString(),
    };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage your content generation projects
          </p>
          {currentProject && (
            <p className="text-sm text-blue-600 mt-1">
              Current Project: <span className="font-medium">{currentProject.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCreateProjectDialog(true)}
            className="flex items-center gap-2"
            data-testid="button-create-project"
          >
            <PlusCircle className="h-4 w-4" />
            New Project
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowLoadProjectDialog(true)}
            className="flex items-center gap-2"
            data-testid="button-load-project"
          >
            <FolderOpen className="h-4 w-4" />
            Load Project
          </Button>
        </div>
      </div>

      {/* Show scheduling permission notice if needed */}
      {permissionsData?.success && !permissionsData.hasPermission && (
        <div className="mb-4">
          <SchedulingPermissionNotice
            storeName={permissionsData.store?.name || "your store"}
          />
        </div>
      )}

      {/* Content Generator Section Removed */}
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-600 mb-2">
          Content Generator Temporarily Unavailable
        </h2>
        <p className="text-gray-500">
          The content generation features have been temporarily disabled. 
          Please use the project management tools above to manage your existing projects.
        </p>
      </div>

      {/* Project Management Dialogs */}
      <ProjectCreationDialog
        isOpen={showCreateProjectDialog}
        onClose={() => setShowCreateProjectDialog(false)}
        onProjectCreated={handleCreateProject}
      />

      <ProjectLoadDialog
        isOpen={showLoadProjectDialog}
        onClose={() => setShowLoadProjectDialog(false)}
        onProjectSelected={handleLoadProject}
      />

      <ProjectSaveDialog
        isOpen={showProjectSaveDialog}
        onClose={() => setShowProjectSaveDialog(false)}
        onProjectSaved={(project) => {
          setCurrentProject(project);
          queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        }}
        projectData={extractFormStateForSaving()}
        currentProject={currentProject}
      />
    </div>
  );
}