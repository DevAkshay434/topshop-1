import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FolderOpen, 
  Search, 
  Calendar, 
  FileText,
  Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useStore } from "@/contexts/StoreContext";

interface LoadProjectDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onProjectSelected?: (projectId: number, projectName: string) => void;
}

interface Project {
  id: number;
  name: string;
  formData: any;
  createdAt: string;
  updatedAt: string;
}

export default function LoadProjectDialog({ 
  open = false, 
  onOpenChange, 
  onProjectSelected 
}: LoadProjectDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { currentStore } = useStore();

  // Fetch saved projects from backend API with store context
  const { data: projectsData, isLoading, error } = useQuery({
    queryKey: ['/api/projects', currentStore?.id],
    enabled: open && !!currentStore
  });

  const projects: Project[] = projectsData?.success ? projectsData.projects : [];

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectSelect = (project: Project) => {
    if (onProjectSelected) {
      onProjectSelected(project.id, project.name);
    }
    
    toast({
      title: "Project loaded",
      description: `"${project.name}" has been loaded successfully`
    });
    
    if (onOpenChange) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FolderOpen className="h-5 w-5 text-primary" />
            Load Project
          </DialogTitle>
          <DialogDescription>
            Select a previously saved project to continue working on it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading projects...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Unable to load projects. Please try again.</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredProjects.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? 'No projects found' : 'No saved projects'}
              </p>
              <p className="text-sm">
                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first project to get started.'}
              </p>
            </div>
          )}

          {/* Projects List */}
          {!isLoading && !error && filteredProjects.length > 0 && (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-lg mb-1 truncate">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Last edited {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="ml-4 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProjectSelect(project);
                      }}
                    >
                      Open
                    </Button>
                  </div>
                  
                  {/* Project Details Preview */}
                  {project.formData && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {project.formData.articleType && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {project.formData.articleType === 'blog' ? 'Blog Post' : 'Page'}
                          </span>
                        )}
                        {project.formData.articleLength && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            {project.formData.articleLength} article
                          </span>
                        )}
                        {project.formData.toneOfVoice && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {project.formData.toneOfVoice} tone
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange && onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}