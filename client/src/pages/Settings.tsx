import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Save, RefreshCw } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Example settings state
  const [settings, setSettings] = useState({
    defaultPostStatus: "draft",
    autoSyncContent: true,
    defaultCategory: "general",
    contentGenerationModel: "claude-3-7-sonnet-20250219",
    defaultAuthor: "",
    publishScheduleTime: "10:00"
  });
  
  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleSaveSettings = async () => {
    setLoading(true);
    
    try {
      // Simulate API call to save settings
      await new Promise(resolve => setTimeout(resolve, 800));
      
      toast({
        title: "Settings saved",
        description: "Your changes have been successfully saved."
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Settings</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Configure your content generation and publishing preferences
          </p>
        </div>
        <div className="flex mt-4 md:mt-0">
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="ml-3"
          >
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="content">
        <TabsList className="mb-6">
          <TabsTrigger value="content">Content Generation</TabsTrigger>
          <TabsTrigger value="publish">Publishing</TabsTrigger>
          <TabsTrigger value="api">API Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Generation Settings</CardTitle>
              <CardDescription>
                Configure how your blog content is generated and formatted
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contentModel">Content Generation Model</Label>
                <Select
                  value={settings.contentGenerationModel}
                  onValueChange={(value) => handleSettingChange('contentGenerationModel', value)}
                >
                  <SelectTrigger id="contentModel">
                    <SelectValue placeholder="Select Claude model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Recommended)</SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20240620">Claude 3.5 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultCategory">Default Content Category</Label>
                <Select
                  value={settings.defaultCategory}
                  onValueChange={(value) => handleSettingChange('defaultCategory', value)}
                >
                  <SelectTrigger id="defaultCategory">
                    <SelectValue placeholder="Select default category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="how-to">How-To & Tutorials</SelectItem>
                    <SelectItem value="product-reviews">Product Reviews</SelectItem>
                    <SelectItem value="news">Industry News</SelectItem>
                    <SelectItem value="comparisons">Product Comparisons</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defaultAuthor">Default Author Name</Label>
                <Input
                  id="defaultAuthor"
                  value={settings.defaultAuthor}
                  onChange={(e) => handleSettingChange('defaultAuthor', e.target.value)}
                  placeholder="Leave blank to use store name"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="publish" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing Settings</CardTitle>
              <CardDescription>
                Configure how content is published to your Shopify blog
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultStatus">Default Post Status</Label>
                <Select
                  value={settings.defaultPostStatus}
                  onValueChange={(value) => handleSettingChange('defaultPostStatus', value)}
                >
                  <SelectTrigger id="defaultStatus">
                    <SelectValue placeholder="Select default status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="publishTime">Default Scheduling Time</Label>
                <Input
                  type="time"
                  id="publishTime"
                  value={settings.publishScheduleTime}
                  onChange={(e) => handleSettingChange('publishScheduleTime', e.target.value)}
                />
                <p className="text-sm text-neutral-500">When scheduling posts, this time will be used by default</p>
              </div>
              
              <div className="flex items-center space-x-2 pt-4">
                <Switch
                  id="autoSync"
                  checked={settings.autoSyncContent}
                  onCheckedChange={(checked) => handleSettingChange('autoSyncContent', checked)}
                />
                <Label htmlFor="autoSync">Automatically sync content with Shopify</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Settings</CardTitle>
              <CardDescription>
                Configure the AI service for content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiService">API Service</Label>
                <Select
                  defaultValue="claude"
                  disabled
                >
                  <SelectTrigger id="apiService">
                    <SelectValue placeholder="Select API service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude API (Anthropic)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-500">
                  We currently use Claude API exclusively for the best content generation
                </p>
              </div>
              
              <div className="space-y-2 mt-6">
                <Label>API Status</Label>
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Claude API connection is active</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-neutral-500">
                Note: API services are configured by the administrator. Contact support if you experience any issues.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}