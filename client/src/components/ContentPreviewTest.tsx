import React, { useState } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Image } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MediaSelectionStep from './MediaSelectionStep';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Types
interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  suggestedKeywords: string[];
  suggestedTags: string[];
  metaDescription: string;
}

// Component that demonstrates both Claude AI content generation and media selection
export default function ContentPreviewTest() {
  const [title, setTitle] = useState('How to Choose the Best Water Softener for Your Home');
  const [productDescription, setProductDescription] = useState('SoftPro Elite HE Water Softener for City Water (Best Seller & Lifetime Warranty)');
  const [generatingContent, setGeneratingContent] = useState(false);
  const [contentGenerated, setContentGenerated] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [activeTab, setActiveTab] = useState('content');
  const [primaryImage, setPrimaryImage] = useState<any | null>(null);
  const [secondaryImages, setSecondaryImages] = useState<any[]>([]);
  const [keywords, setKeywords] = useState('water softener, water filtration, hard water, city water');
  
  // Settings for content generation
  const [toneOfVoice, setToneOfVoice] = useState('friendly');
  const [writingPerspective, setWritingPerspective] = useState('first_person_plural');
  const [articleLength, setArticleLength] = useState('medium');
  
  // Function to generate content with Claude
  const generateContent = async () => {
    setGeneratingContent(true);
    
    try {
      console.log('Generating content with Claude AI...');
      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);
      
      const response = await axios.post('/api/content/generate', {
        title,
        productDescription,
        keywords: keywordsArray,
        toneOfVoice,
        writingPerspective,
        articleLength,
        enableTables: true,
        enableLists: true,
        enableH3s: true,
        headingsCount: '3',
        introType: 'search_intent',
        enableCitations: true,
        faqType: 'short',
        region: 'us',
        buyerProfile: 'auto'
      });
      
      if (response.data.success && response.data.content) {
        setGeneratedContent(response.data.content);
        setContentGenerated(true);
        setActiveTab('preview');
      } else {
        alert('Error generating content: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Error generating content. Please try again.');
    } finally {
      setGeneratingContent(false);
    }
  };
  
  // Function to handle selected primary image
  const handlePrimaryImageSelected = (image: any) => {
    console.log('Primary image selected:', image);
    setPrimaryImage(image);
  };
  
  // Function to handle selected secondary images
  const handleSecondaryImagesSelected = (images: any[]) => {
    console.log('Secondary images selected:', images);
    setSecondaryImages(images);
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle>Content Generator with Media Selection Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="content">Generate Content</TabsTrigger>
            <TabsTrigger value="media">Choose Media</TabsTrigger>
            <TabsTrigger value="preview" disabled={!contentGenerated}>Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full"
                  placeholder="Enter article title"
                />
              </div>
              
              <div>
                <Label htmlFor="productDescription">Product Description</Label>
                <Input
                  id="productDescription"
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  className="w-full"
                  placeholder="Enter product description"
                />
              </div>
              
              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full"
                  placeholder="keyword1, keyword2, keyword3"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="toneOfVoice">Tone of Voice</Label>
                  <select
                    id="toneOfVoice"
                    value={toneOfVoice}
                    onChange={(e) => setToneOfVoice(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="authoritative">Authoritative</option>
                    <option value="conversational">Conversational</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="writingPerspective">Perspective</Label>
                  <select
                    id="writingPerspective"
                    value={writingPerspective}
                    onChange={(e) => setWritingPerspective(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="first_person_plural">We/Us (First Person Plural)</option>
                    <option value="first_person_singular">I/Me (First Person Singular)</option>
                    <option value="second_person">You/Your (Second Person)</option>
                    <option value="third_person">They/Them (Third Person)</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="articleLength">Article Length</Label>
                  <select
                    id="articleLength"
                    value={articleLength}
                    onChange={(e) => setArticleLength(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="short">Short (600-800 words)</option>
                    <option value="medium">Medium (1000-1500 words)</option>
                    <option value="long">Long (2000-2500 words)</option>
                  </select>
                </div>
              </div>
              
              <Button 
                onClick={generateContent} 
                disabled={generatingContent}
                className="w-full"
              >
                {generatingContent ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Generate Content with Claude AI
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="media">
            <MediaSelectionStep 
              productId={null}
              title={title}
              onPrimaryImageSelected={handlePrimaryImageSelected}
              onSecondaryImagesSelected={handleSecondaryImagesSelected}
              initialPrimaryImage={primaryImage}
              initialSecondaryImages={secondaryImages}
            />
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-4">
            {generatedContent ? (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-2xl font-bold">{generatedContent.title}</h2>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setActiveTab('content')}>
                      Edit Content
                    </Button>
                    <Button variant="outline" onClick={() => setActiveTab('media')}>
                      Edit Media
                    </Button>
                  </div>
                </div>
                
                {/* Primary Image */}
                {primaryImage && (
                  <div className="my-4">
                    <img 
                      src={primaryImage.url} 
                      alt={primaryImage.alt || 'Featured image'} 
                      className="w-full h-auto max-h-[300px] object-cover rounded-lg"
                    />
                    <p className="text-sm text-gray-500 mt-1">Primary Image: {primaryImage.alt || 'Featured image'}</p>
                  </div>
                )}
                
                {/* Article Content */}
                <div className="prose prose-blue max-w-none my-4">
                  <div dangerouslySetInnerHTML={{ __html: generatedContent.content }} />
                </div>
                
                {/* Secondary Images */}
                {secondaryImages.length > 0 && (
                  <div className="my-4">
                    <h3 className="text-lg font-semibold mb-2">Secondary Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {secondaryImages.map((image, index) => (
                        <div key={image.id || index} className="aspect-video relative">
                          <img 
                            src={image.url} 
                            alt={image.alt || `Image ${index + 1}`} 
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Meta Information */}
                <div className="mt-8 bg-slate-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">SEO Information</h3>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="font-semibold">Meta Description</Label>
                      <p className="text-sm bg-white p-2 rounded border">{generatedContent.metaDescription}</p>
                    </div>
                    
                    <div>
                      <Label className="font-semibold">Suggested Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedContent.suggestedTags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="font-semibold">Keyword Analysis</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {generatedContent.suggestedKeywords.map((keyword, i) => (
                          <span key={i} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-xl font-semibold">No Content Generated Yet</h3>
                <p className="text-gray-500">Go to the "Generate Content" tab to create content first.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}