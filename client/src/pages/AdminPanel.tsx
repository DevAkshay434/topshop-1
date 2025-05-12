import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Circle, Search } from "lucide-react";

export default function AdminPanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content-generator");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formState, setFormState] = useState({
    region: "United States",
    contentType: "Blog Post",
    blogId: "",
    title: "",
    style: "We (First Person Plural)",
    tone: "Friendly",
    introStyle: "Search Intent Focused",
    includeFAQ: true,
    enableTables: false,
    enableLists: true,
    enableH3Headings: false, 
    enableCitations: true,
    images: true,
    schedule: false,
    publication: "Publish immediately",
    keywords: [
      { keyword: "RO Water Softener Salt", volume: "450/mo" },
      { keyword: "reverse osmosis", volume: "320/mo" },
      { keyword: "water softener", volume: "310/mo" }
    ]
  });
  
  // Get blogs
  const { data: blogsData } = useQuery<any>({
    queryKey: ["/api/admin/blogs"],
  });
  
  const blogs = blogsData?.blogs || [];
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      toast({
        title: "Generating Content",
        description: "This may take a minute...",
      });
      
      // Extract keywords as array of strings
      const keywordStrings = formState.keywords.map(k => k.keyword);
      
      // Prepare data for API
      const requestData = {
        topic: formState.title,
        region: formState.region,
        contentType: formState.contentType,
        blogId: formState.blogId || (blogs.length > 0 ? blogs[0].id : null),
        writingStyle: formState.style,
        tone: formState.tone,
        introductionStyle: formState.introStyle,
        includeFAQ: formState.includeFAQ,
        enableTables: formState.enableTables,
        enableLists: formState.enableLists,
        enableH3Headings: formState.enableH3Headings,
        enableCitations: formState.enableCitations,
        keywords: keywordStrings,
        generateImages: formState.images,
        publicationType: formState.schedule ? 'schedule' : 
                          formState.publication === 'Publish immediately' ? 'publish' : 'draft'
      };
      
      const response = await apiRequest('POST', '/api/generate-content', requestData);
      
      if (response.success) {
        toast({
          title: "Success!",
          description: "Content has been generated successfully",
        });
      } else {
        throw new Error(response.error || "Failed to generate content");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error)?.message || "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormState(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Render the workflow steps
  const renderWorkflow = () => {
    return (
      <div className="mb-6 border rounded-md p-4 bg-slate-50">
        <h3 className="text-sm font-medium mb-3">Content Creation Workflow</h3>
        <div className="flex items-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">1</div>
            <span className="text-xs mt-1">Select Products</span>
          </div>
          <div className="flex-1 h-1 mx-2 bg-blue-200"></div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">2</div>
            <span className="text-xs mt-1">Choose Keywords</span>
          </div>
          <div className="flex-1 h-1 mx-2 bg-blue-200"></div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center text-blue-700">3</div>
            <span className="text-xs mt-1">Add Options</span>
          </div>
          <div className="flex-1 h-1 mx-2 bg-gray-200"></div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">4</div>
            <span className="text-xs mt-1">Generate</span>
          </div>
        </div>
      </div>
    );
  };
  
  // UI for keywords
  const renderKeywords = () => {
    return (
      <div className="mt-6">
        <h3 className="font-medium flex items-center mb-2">
          <Search className="w-4 h-4 mr-1" />
          Selected Keywords
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {formState.keywords.map((kw, index) => (
            <Badge key={index} variant="outline" className="py-1 px-2">
              <span>{kw.keyword}</span>
              <span className="ml-2 text-xs text-gray-500">{kw.volume}</span>
            </Badge>
          ))}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-3"
          onClick={() => {
            // This would typically open a keyword selection modal
            toast({
              title: "Keyword Selection",
              description: "This feature would open a keyword selection interface",
            });
          }}
        >
          Change Keywords
        </Button>
      </div>
    );
  };
  
  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Admin</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Manage content generation, your service status, and configure settings
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content-generator">Content Generator</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content-generator" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Generator */}
            <div>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Content Generator</CardTitle>
                  <CardDescription>Generate SEO-optimized content for your Shopify store</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <form onSubmit={handleSubmit}>
                    {renderWorkflow()}
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Region</Label>
                        <Select 
                          value={formState.region} 
                          onValueChange={(value) => handleSelectChange('region', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="United States">United States</SelectItem>
                            <SelectItem value="Canada">Canada</SelectItem>
                            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                            <SelectItem value="Australia">Australia</SelectItem>
                            <SelectItem value="Global">Global</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Target region for content localization</p>
                      </div>
                      
                      <div>
                        <Label>Content Type</Label>
                        <Select 
                          value={formState.contentType} 
                          onValueChange={(value) => handleSelectChange('contentType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select content type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Blog Post">Blog Post</SelectItem>
                            <SelectItem value="Product Description">Product Description</SelectItem>
                            <SelectItem value="Landing Page">Landing Page</SelectItem>
                            <SelectItem value="Collection Page">Collection Page</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Blog</Label>
                        <Select 
                          value={formState.blogId}
                          onValueChange={(value) => handleSelectChange('blogId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select blog" />
                          </SelectTrigger>
                          <SelectContent>
                            {blogs.map((blog: any) => (
                              <SelectItem key={blog.id} value={blog.id.toString()}>
                                {blog.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">Select the blog where this post will be published</p>
                      </div>
                      
                      <div>
                        <Label>Selected Title</Label>
                        <Input
                          name="title"
                          value={formState.title}
                          onChange={handleInputChange}
                          placeholder="Enter a title for the content"
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="mt-1 h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            toast({
                              title: "Change Title",
                              description: "This would typically open a title selection interface",
                            });
                          }}
                        >
                          Change Title
                        </Button>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Style & Formatting</h3>
                        <Label className="mb-1">Writing Perspective</Label>
                        <Select 
                          value={formState.style} 
                          onValueChange={(value) => handleSelectChange('style', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="We (First Person Plural)">We (First Person Plural)</SelectItem>
                            <SelectItem value="I (First Person)">I (First Person)</SelectItem>
                            <SelectItem value="Third Person">Third Person</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Tone of Voice</Label>
                        <Select 
                          value={formState.tone} 
                          onValueChange={(value) => handleSelectChange('tone', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Friendly">Friendly</SelectItem>
                            <SelectItem value="Professional">Professional</SelectItem>
                            <SelectItem value="Casual">Casual</SelectItem>
                            <SelectItem value="Enthusiastic">Enthusiastic</SelectItem>
                            <SelectItem value="Informative">Informative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Introduction Style</Label>
                        <Select 
                          value={formState.introStyle} 
                          onValueChange={(value) => handleSelectChange('introStyle', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select introduction style" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Search Intent Focused">Search Intent Focused</SelectItem>
                            <SelectItem value="Problem-Solution">Problem-Solution</SelectItem>
                            <SelectItem value="Benefit-Focused">Benefit-Focused</SelectItem>
                            <SelectItem value="Story-Based">Story-Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>FAQ Section</Label>
                        <Select 
                          value={formState.includeFAQ ? "Short FAQ (3-5 Q&A)" : "None"} 
                          onValueChange={(value) => handleCheckboxChange('includeFAQ', value !== "None")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select FAQ option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Short FAQ (3-5 Q&A)">Short FAQ (3-5 Q&A)</SelectItem>
                            <SelectItem value="None">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex space-x-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="enable-tables" 
                            checked={formState.enableTables}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange('enableTables', checked as boolean)
                            }
                          />
                          <Label htmlFor="enable-tables" className="cursor-pointer">Enable Tables</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="enable-lists" 
                            checked={formState.enableLists}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange('enableLists', checked as boolean)
                            }
                          />
                          <Label htmlFor="enable-lists" className="cursor-pointer">Enable Lists</Label>
                        </div>
                      </div>
                      
                      <div className="flex space-x-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="enable-h3" 
                            checked={formState.enableH3Headings}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange('enableH3Headings', checked as boolean)
                            }
                          />
                          <Label htmlFor="enable-h3" className="cursor-pointer">Enable H3 Headings</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="enable-citations" 
                            checked={formState.enableCitations}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange('enableCitations', checked as boolean)
                            }
                          />
                          <Label htmlFor="enable-citations" className="cursor-pointer">Enable Citations</Label>
                        </div>
                      </div>
                      
                      {renderKeywords()}
                      
                      <div className="pt-2">
                        <h3 className="font-medium mb-2">Publication</h3>
                        <Select 
                          value={formState.publication} 
                          onValueChange={(value) => handleSelectChange('publication', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select publication option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Publish immediately">Publish immediately</SelectItem>
                            <SelectItem value="Save as draft">Save as draft</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-3 pt-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="generate-images" 
                            checked={formState.images}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange('images', checked as boolean)
                            }
                          />
                          <Label htmlFor="generate-images" className="cursor-pointer">Generate Images</Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="schedule-later" 
                            checked={formState.schedule}
                            onCheckedChange={(checked) => 
                              handleCheckboxChange('schedule', checked as boolean)
                            }
                          />
                          <Label htmlFor="schedule-later" className="cursor-pointer">Schedule for later</Label>
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-3">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            toast({
                              title: "Save as Template",
                              description: "Template would be saved for future use",
                            });
                          }}
                        >
                          Save as Template
                        </Button>
                        
                        <div className="space-x-2">
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: "Load Template",
                                description: "This would load a saved template",
                              });
                            }}
                          >
                            Load Template
                          </Button>
                          
                          <Button 
                            type="submit" 
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Generating..." : "Generate Content"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
            
            {/* Content Preview */}
            <div>
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle>Content Preview</CardTitle>
                  <CardDescription>Preview of your generated content</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 h-full flex items-center justify-center text-center">
                  <div className="text-muted-foreground">
                    <p>Content will appear here after generation.</p>
                    <p className="text-sm mt-1">Fill out the form and click "Generate Content" to create new content.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>View and manage your TopShop SEO services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>AI Content Generation</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span>Keyword Research</span>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center">
                    <Circle className="h-4 w-4 text-gray-400 mr-2" />
                    <span>Advanced Analytics</span>
                  </div>
                  <Badge variant="outline" className="bg-gray-100">Not Enabled</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Manage your account settings and preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Default Blog</Label>
                  <Select defaultValue="default">
                    <SelectTrigger>
                      <SelectValue placeholder="Select default blog" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">News (Default)</SelectItem>
                      {blogs.map((blog: any) => (
                        <SelectItem key={blog.id} value={blog.id.toString()}>
                          {blog.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Content Style Preference</Label>
                  <Select defaultValue="balanced">
                    <SelectTrigger>
                      <SelectValue placeholder="Content style preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seo-focused">SEO-Focused</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="creative">More Creative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button className="mt-4">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}