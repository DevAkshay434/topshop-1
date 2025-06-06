import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FolderPlus, 
  Info, 
  FileDown, 
  SaveAll, 
  FileText
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Sample template projects - in a real app, these might come from an API
const TEMPLATE_PROJECTS = [
  { id: "product-spotlight", name: "Product Spotlight", description: "Highlight a specific product's features and benefits" },
  { id: "seasonal-campaign", name: "Seasonal Campaign", description: "Holiday or seasonal marketing content" },
  { id: "customer-story", name: "Customer Success Story", description: "Showcase how customers use your products" },
  { id: "buying-guide", name: "Buying Guide", description: "Help customers choose the right product" },
  { id: "how-to", name: "How-To Guide", description: "Step-by-step instructions for using products" }
];

interface ProjectCreationDialogProps {
  onProjectSelected?: (projectId: number, projectName: string) => void;
}

// This component adds a standalone project creation dialog that appears immediately
export default function ProjectCreationDialog({ onProjectSelected }: ProjectCreationDialogProps) {
  const [open, setOpen] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved projects from backend API
  const { data: savedProjectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects')
  });

  const savedProjects = savedProjectsData?.success ? savedProjectsData.projects : [];
  
  // Debug logging
  useEffect(() => {
    console.log('ProjectCreationDialog - savedProjectsData:', savedProjectsData);
    console.log('ProjectCreationDialog - savedProjects:', savedProjects);
    console.log('ProjectCreationDialog - savedProjects.length:', savedProjects.length);
  }, [savedProjectsData, savedProjects]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: { name: string; formData: any }) => 
      apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (data.success && onProjectSelected) {
        onProjectSelected(data.project.id, data.project.name);
      }
    }
  });

  // Default content style settings
  const contentStyleSettings = {
    tone: "friendly",
    perspective: "first_person_plural",
    structure: "informational"
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName || projectName.trim().length < 3) {
      toast({
        title: "Project name required",
        description: "Please enter a project name with at least 3 characters",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Check if project already exists
    const existingProject = savedProjects.find((p: any) => p.name === projectName);
    if (existingProject) {
      // Load existing project
      if (onProjectSelected) {
        onProjectSelected(existingProject.id, existingProject.name);
      }
      
      toast({
        title: "Project loaded",
        description: `"${projectName}" has been loaded`
      });
      
      setIsSubmitting(false);
      setOpen(false);
      return;
    }
    
    // Create new project via API
    createProjectMutation.mutate({
      name: projectName,
      formData: contentStyleSettings
    });
    
    setTimeout(() => {
      toast({
        title: "Project created successfully",
        description: `"${projectName}" has been created and set as your current project`
      });
      
      setIsSubmitting(false);
      setOpen(false);
    }, 500);
  };
  
  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = TEMPLATE_PROJECTS.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setProjectName(template.name);
      
      toast({
        title: "Template loaded",
        description: `"${template.name}" template has been loaded`
      });
    }
  };
  
  // Handle saved project selection
  const handleSavedProjectSelect = (projectId: string) => {
    const project = savedProjects.find((p: any) => p.id.toString() === projectId);
    if (project) {
      setProjectName(project.name);
      
      // Load the project immediately
      if (onProjectSelected) {
        onProjectSelected(project.id, project.name);
      }
      
      toast({
        title: "Project loaded",
        description: `"${project.name}" has been loaded`
      });
      
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Configure your content generation project settings.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="w-full space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Label htmlFor="projectName" className="text-base font-medium">Project Name</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] p-3 text-sm bg-white">
                      <p>Most Shopify users create a project for each of their top-selling products.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Input
                id="projectName"
                placeholder="Valentine Campaign – Best Sellers"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="text-base"
                autoFocus
              />
              
              <p className="text-sm text-muted-foreground">
                Name your project based on your campaign or content goal.
              </p>
              
              {/* Template Selection */}
              {showTemplates && (
                <div className="space-y-3 pt-2 border-t">
                  <Label htmlFor="templateSelect" className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-primary" />
                    Template Projects
                  </Label>
                  
                  <Select onValueChange={handleTemplateSelect} value={selectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Template Projects</SelectLabel>
                        {TEMPLATE_PROJECTS.map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground italic">
                      {TEMPLATE_PROJECTS.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  )}
                </div>
              )}
              
              {/* Saved Projects - Only show if there are saved projects */}
              {!showTemplates && savedProjects.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <Label htmlFor="savedProjectSelect" className="flex items-center gap-1.5">
                    <SaveAll className="h-4 w-4 text-primary" />
                    Your Projects
                  </Label>
                  
                  <Select onValueChange={handleSavedProjectSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Saved Projects</SelectLabel>
                        {savedProjects.map(project => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="pt-4 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !projectName || projectName.trim().length < 3}
                  className="min-w-[100px]"
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-1.5 text-primary"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              <FileDown className="h-4 w-4" />
              {showTemplates ? "View Saved Projects" : "Load Template"}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}