import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Folder, Plus, Clock, Star, Search, Filter } from 'lucide-react';

interface Project {
  id: number;
  name: string;
  description?: string;
  status: string;
  isTemplate: boolean;
  templateCategory?: string;
  formData?: any;
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: Project) => void;
  onProjectSelected: (project: Project) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  open,
  onOpenChange,
  onProjectCreated,
  onProjectSelected
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'existing' | 'templates'>('existing');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing projects
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['/api/projects'],
    enabled: open && activeTab === 'existing'
  });

  // Fetch template projects
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/projects/templates'],
    enabled: open && activeTab === 'templates'
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      return apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Project Created",
        description: "Your new project has been created successfully.",
      });
      onProjectCreated(data.project);
      onOpenChange(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setProjectName('');
    setProjectDescription('');
    setSearchTerm('');
    setStatusFilter('all');
    setActiveTab('existing');
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Error",
        description: "Project name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createProjectMutation.mutateAsync({
        name: projectName,
        description: projectDescription || null,
        status: 'draft',
        isTemplate: false,
        formData: null
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    onProjectSelected(project);
    onOpenChange(false);
    resetForm();
  };

  const handleSelectTemplate = (template: Project) => {
    // Create a new project based on the template
    const templateBasedProject = {
      name: `${template.name} - Copy`,
      description: template.description || null,
      status: 'draft',
      isTemplate: false,
      formData: template.formData
    };
    
    createProjectMutation.mutate(templateBasedProject);
  };

  const filteredProjects = (projectsData?.projects || []).filter((project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (project.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredTemplates = (templatesData?.templates || []).filter((template: Project) => {
    return template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (template.description || '').toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    if (open) {
      setActiveTab('existing');
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl">Project Manager</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('existing')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'existing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Folder className="w-4 h-4 inline mr-2" />
            Existing Projects
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            Templates
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create New
          </button>
        </div>

        <div className="flex-1 p-6">
          {/* Create New Project Tab */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="projectDescription">Description</Label>
                <Textarea
                  id="projectDescription"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Optional project description"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateProject}
                  disabled={isCreating || !projectName.trim()}
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </div>
          )}

          {/* Existing Projects Tab */}
          {activeTab === 'existing' && (
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projects List */}
              <ScrollArea className="h-96">
                {projectsLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-gray-500">Loading projects...</div>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <Folder className="w-8 h-8 mb-2" />
                    <div>No projects found</div>
                    <div className="text-sm">Create your first project to get started</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredProjects.map((project: Project) => (
                      <Card key={project.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <CardContent className="p-4" onClick={() => handleSelectProject(project)}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium">{project.name}</h3>
                                <Badge className={getStatusColor(project.status)}>
                                  {project.status}
                                </Badge>
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                              )}
                              <div className="flex items-center text-xs text-gray-500">
                                <Clock className="w-3 h-3 mr-1" />
                                Modified {formatDate(project.lastModified)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Search Templates */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Templates List */}
              <ScrollArea className="h-96">
                {templatesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-gray-500">Loading templates...</div>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                    <Star className="w-8 h-8 mb-2" />
                    <div>No templates found</div>
                    <div className="text-sm">Templates will help you get started quickly</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map((template: Project) => (
                      <Card key={template.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <CardContent className="p-4" onClick={() => handleSelectTemplate(template)}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                <h3 className="font-medium">{template.name}</h3>
                                {template.templateCategory && (
                                  <Badge variant="outline">{template.templateCategory}</Badge>
                                )}
                              </div>
                              {template.description && (
                                <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                              )}
                              <div className="text-xs text-gray-500">
                                Template • Click to create a new project
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateProjectModal;