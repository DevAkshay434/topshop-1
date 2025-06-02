import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Linkedin, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface Author {
  id: string;
  name: string;
  description: string;
  avatarUrl: string;
  linkedinUrl: string;
  handle: string;
}

interface AuthorSelectorProps {
  selectedAuthorId?: string;
  onAuthorSelect: (authorId: string | undefined) => void;
}

export function AuthorSelector({ selectedAuthorId, onAuthorSelect }: AuthorSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [newAuthor, setNewAuthor] = useState({
    name: "",
    description: "",
    avatarUrl: "",
    linkedinUrl: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch authors
  const { data: authorsData, isLoading } = useQuery<{ success: boolean; authors: Author[] }>({
    queryKey: ["/api/authors"],
  });

  const authors = authorsData?.authors || [];
  const selectedAuthor = authors.find(author => author.id === selectedAuthorId);

  // Create author mutation
  const createAuthorMutation = useMutation({
    mutationFn: (data: typeof newAuthor) => apiRequest("/api/authors", "POST", data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      setIsCreateDialogOpen(false);
      setNewAuthor({ name: "", description: "", avatarUrl: "", linkedinUrl: "" });
      onAuthorSelect(response.author.id);
      toast({
        title: "Author created",
        description: "New author has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create author",
        variant: "destructive",
      });
    },
  });

  // Update author mutation
  const updateAuthorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof newAuthor }) =>
      apiRequest(`/api/authors/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      setIsEditDialogOpen(false);
      setEditingAuthor(null);
      toast({
        title: "Author updated",
        description: "Author has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update author",
        variant: "destructive",
      });
    },
  });

  // Delete author mutation
  const deleteAuthorMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/authors/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      if (selectedAuthorId === editingAuthor?.id) {
        onAuthorSelect(undefined);
      }
      setIsEditDialogOpen(false);
      setEditingAuthor(null);
      toast({
        title: "Author deleted",
        description: "Author has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete author",
        variant: "destructive",
      });
    },
  });

  const handleCreateAuthor = () => {
    if (!newAuthor.name.trim()) {
      toast({
        title: "Error",
        description: "Author name is required",
        variant: "destructive",
      });
      return;
    }
    createAuthorMutation.mutate(newAuthor);
  };

  const handleEditAuthor = (author: Author) => {
    setEditingAuthor(author);
    setNewAuthor({
      name: author.name,
      description: author.description,
      avatarUrl: author.avatarUrl,
      linkedinUrl: author.linkedinUrl
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAuthor = () => {
    if (!editingAuthor || !newAuthor.name.trim()) {
      toast({
        title: "Error",
        description: "Author name is required",
        variant: "destructive",
      });
      return;
    }
    updateAuthorMutation.mutate({ id: editingAuthor.id, data: newAuthor });
  };

  const handleDeleteAuthor = () => {
    if (!editingAuthor) return;
    deleteAuthorMutation.mutate(editingAuthor.id);
  };

  if (isLoading) {
    return <div>Loading authors...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="author-select">Select Author</Label>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Author
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Author</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newAuthor.name}
                  onChange={(e) => setNewAuthor({ ...newAuthor, name: e.target.value })}
                  placeholder="Author name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAuthor.description}
                  onChange={(e) => setNewAuthor({ ...newAuthor, description: e.target.value })}
                  placeholder="Brief description or bio"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  value={newAuthor.avatarUrl}
                  onChange={(e) => setNewAuthor({ ...newAuthor, avatarUrl: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                <Input
                  id="linkedinUrl"
                  value={newAuthor.linkedinUrl}
                  onChange={(e) => setNewAuthor({ ...newAuthor, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createAuthorMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAuthor}
                  disabled={createAuthorMutation.isPending}
                >
                  {createAuthorMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Select value={selectedAuthorId || "none"} onValueChange={(value) => onAuthorSelect(value === "none" ? undefined : value)}>
        <SelectTrigger>
          <SelectValue placeholder="Select an author or create new" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No author</SelectItem>
          {authors.map((author) => (
            <SelectItem key={author.id} value={author.id}>
              <div className="flex items-center space-x-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={author.avatarUrl} alt={author.name} />
                  <AvatarFallback>
                    {author.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{author.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedAuthor && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Selected Author</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditAuthor(selectedAuthor)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedAuthor.avatarUrl} alt={selectedAuthor.name} />
                <AvatarFallback>
                  <User className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{selectedAuthor.name}</h4>
                {selectedAuthor.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedAuthor.description}</p>
                )}
                {selectedAuthor.linkedinUrl && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      <Linkedin className="w-3 h-3 mr-1" />
                      LinkedIn
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Author Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Author</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={newAuthor.name}
                onChange={(e) => setNewAuthor({ ...newAuthor, name: e.target.value })}
                placeholder="Author name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newAuthor.description}
                onChange={(e) => setNewAuthor({ ...newAuthor, description: e.target.value })}
                placeholder="Brief description or bio"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-avatarUrl">Avatar URL</Label>
              <Input
                id="edit-avatarUrl"
                value={newAuthor.avatarUrl}
                onChange={(e) => setNewAuthor({ ...newAuthor, avatarUrl: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <div>
              <Label htmlFor="edit-linkedinUrl">LinkedIn Profile URL</Label>
              <Input
                id="edit-linkedinUrl"
                value={newAuthor.linkedinUrl}
                onChange={(e) => setNewAuthor({ ...newAuthor, linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="flex justify-between">
              <Button
                variant="destructive"
                onClick={handleDeleteAuthor}
                disabled={updateAuthorMutation.isPending || deleteAuthorMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteAuthorMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateAuthorMutation.isPending || deleteAuthorMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateAuthor}
                  disabled={updateAuthorMutation.isPending || deleteAuthorMutation.isPending}
                >
                  {updateAuthorMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}