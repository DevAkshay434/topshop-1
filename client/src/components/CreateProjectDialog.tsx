import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Info as InfoIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define the form schema for project creation
const projectFormSchema = z.object({
  projectName: z.string().min(3, { 
    message: "Project name must be at least 3 characters" 
  }).max(50, { 
    message: "Project name must be less than 50 characters" 
  }),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (projectName: string) => void;
}

export default function CreateProjectDialog({
  open,
  onOpenChange,
  onProjectCreated
}: CreateProjectDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form setup with default values
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      projectName: "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: ProjectFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Here you would typically make an API call to create the project
      // For now, we'll just simulate success and call the callback
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      
      // Call the callback with the project name
      onProjectCreated(values.projectName);
      
      // Show success message
      toast({
        title: "Project created",
        description: `"${values.projectName}" has been created successfully`,
        variant: "default",
      });
      
      // Close the dialog
      onOpenChange(false);
      
      // Reset the form
      form.reset();
    } catch (error: any) {
      console.error("Failed to create project:", error);
      toast({
        title: "Failed to create project",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
          <DialogDescription>
            Start by naming your content generation project.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="projectName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center space-x-2">
                    <FormLabel className="text-base">Project Name</FormLabel>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button">
                          <InfoIcon className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[220px] text-sm">
                            Most Shopify users create a project for each of their top-selling products.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormControl>
                    <Input
                      placeholder="Valentine Campaign – Best Sellers"
                      className="text-base"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Name your project based on your campaign or content goal.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
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
        </Form>
      </DialogContent>
    </Dialog>
  );
}