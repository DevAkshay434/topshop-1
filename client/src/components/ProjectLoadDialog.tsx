import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, Calendar, FileText } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';

interface Project {
  id: number;
  name: string;
  description?: string;
  projectData: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectLoadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectSelected: (project: Project) => void;
}

export function ProjectLoadDialog({ isOpen, onClose, onProjectSelected }: ProjectLoadDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { autoDetectedStoreId } = useStore();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['/api/projects'],
    enabled: isOpen,
  });

  const filteredProjects = projects?.projects?.filter((project: Project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleProjectSelect = (project: Project) => {
    onProjectSelected(project);
    onClose();
    setSearchTerm('');
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Load Saved Project</DialogTitle>
          <DialogDescription>
            Select a project to load and continue working on it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Projects List */}
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading projects...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                Error loading projects. Please try again.
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No projects match your search.' : 'No projects found. Create your first project!'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project: Project) => (
                  <div
                    key={project.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleProjectSelect(project)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Created: {formatDate(project.createdAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Updated: {formatDate(project.updatedAt)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Project #{project.id}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}