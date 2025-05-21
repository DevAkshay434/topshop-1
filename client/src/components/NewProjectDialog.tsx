import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderPlus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectName: string) => void;
}

export default function NewProjectDialog({ 
  open, 
  onOpenChange, 
  onProjectCreated 
}: NewProjectDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName || projectName.trim().length < 3) {
      toast({
        title: "Invalid project name",
        description: "Please enter a project name with at least 3 characters",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      onProjectCreated(projectName);
      
      toast({
        title: "Project created",
        description: `"${projectName}" has been created successfully`,
      });
      
      // Reset state
      setProjectName("");
      setIsSubmitting(false);
      
      // Close dialog
      onOpenChange(false);
    }, 500);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Start by naming your content generation project.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="projectName" className="text-base">Project Name</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[240px]">
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
          </div>
          
          <DialogFooter className="mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}