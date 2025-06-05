import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, User, Edit3 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Author {
  id: string;
  handle: string;
  name: string;
  description: string;
  profileImage?: string;
}

interface AuthorSelectorProps {
  selectedAuthorId?: string;
  onAuthorSelect: (authorId: string | null) => void;
}

const createAuthorSchema = z.object({
  name: z.string().min(1, "Author name is required"),
  description: z.string().optional(),
  profileImage: z.string().optional(),
  linkedinUrl: z.string().url("Please enter a valid LinkedIn URL").optional().or(z.literal("")),
});

type CreateAuthorForm = z.infer<typeof createAuthorSchema>;

export function AuthorSelector({ selectedAuthorId, onAuthorSelect }: AuthorSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateAuthorForm>({
    resolver: zodResolver(createAuthorSchema),
    defaultValues: {
      name: "",
      description: "",
      profileImage: "",
      linkedinUrl: "",
    },
  });

  // Fetch authors
  const { data: authorsData, isLoading } = useQuery({
    queryKey: ["/api/authors"],
    queryFn: () => fetch("/api/authors").then(res => res.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const authors: Author[] = authorsData?.authors || [];

  // Create author mutation
  const createAuthorMutation = useMutation({
    mutationFn: async (data: CreateAuthorForm) => {
      const response = await fetch("/api/authors", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors"] });
      setIsCreateDialogOpen(false);
      form.reset();
      
      // Auto-select the newly created author
      if (data.author) {
        onAuthorSelect(data.author.id);
      }
      
      toast({
        title: "Author created",
        description: "The new author has been added successfully.",
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

  const handleCreateAuthor = (data: CreateAuthorForm) => {
    createAuthorMutation.mutate(data);
  };

  const selectedAuthor = authors.find(author => author.id === selectedAuthorId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Choose Author
          </CardTitle>
          <CardDescription>
            Loading authors...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Choose Author
        </CardTitle>
        <CardDescription>
          Select an author for this content or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Author Display */}
        {selectedAuthor && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedAuthor.profileImage} alt={selectedAuthor.name} />
                <AvatarFallback>
                  {selectedAuthor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium">{selectedAuthor.name}</h4>
                {selectedAuthor.description && (
                  <p className="text-sm text-gray-600 mt-1">{selectedAuthor.description}</p>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAuthorSelect(null)}
              >
                Change
              </Button>
            </div>
          </div>
        )}

        {/* Author Selection Grid */}
        {!selectedAuthor && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {authors.map((author) => (
                <Card 
                  key={author.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onAuthorSelect(author.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={author.profileImage} alt={author.name} />
                        <AvatarFallback>
                          {author.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{author.name}</h4>
                        {author.description && (
                          <p className="text-sm text-gray-600 truncate">{author.description}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Create New Author Button */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Author
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Author</DialogTitle>
                  <DialogDescription>
                    Add a new author to your content library. Authors are managed using Shopify Metaobjects.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateAuthor)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter author name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author Bio</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Brief description or bio"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="profileImage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Image URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://example.com/image.jpg"
                              type="url"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="linkedinUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn Profile URL (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://linkedin.com/in/username"
                              type="url"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createAuthorMutation.isPending}
                      >
                        {createAuthorMutation.isPending ? "Creating..." : "Create Author"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* No Authors State */}
            {authors.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No authors found</p>
                <p className="text-sm">Create your first author to get started</p>
              </div>
            )}
          </>
        )}

        {/* Skip Author Option */}
        {!selectedAuthor && (
          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => onAuthorSelect(null)}
          >
            Skip - No Author
          </Button>
        )}
      </CardContent>
    </Card>
  );
}