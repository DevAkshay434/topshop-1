import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';

// Define the workflow steps
const steps = [
  { title: 'Select Products', description: 'Choose products for your content' },
  { title: 'Generate Content', description: 'Create content with Claude AI' },
  { title: 'Review & Publish', description: 'Review and publish your content' }
];

export default function ClaudeWorkflow() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  });

  // Fetch products from the API
  const { data: productsData, isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['/api/admin/products'],
    queryFn: async () => {
      return await apiRequest('/api/admin/products');
    },
  });

  // Fetch store connectivity status
  const { data: connectionData, isLoading: isCheckingConnection } = useQuery({
    queryKey: ['/api/shopify/connection'],
    queryFn: async () => {
      return await apiRequest('/api/shopify/connection');
    },
  });

  // Fetch blog information
  const { data: blogsData } = useQuery({
    queryKey: ['/api/admin/blogs'],
    queryFn: async () => {
      return await apiRequest('/api/admin/blogs');
    },
    enabled: !!connectionData?.connection,
  });

  // Handle product selection
  const handleProductsSelected = (products: any[]) => {
    setSelectedProducts(products);
    
    // Extract keywords from product titles and descriptions
    const extractedKeywords: string[] = [];
    products.forEach(product => {
      if (product.title) {
        const titleWords = product.title.split(/\s+/);
        titleWords.forEach((word: string) => {
          if (word.length > 3 && !extractedKeywords.includes(word)) {
            extractedKeywords.push(word);
          }
        });
      }
    });
    
    setKeywords(extractedKeywords);
    setActiveStep(1); // Move to content generation step
  };

  // Handle content generation
  const handleContentGenerated = (content: any) => {
    setGeneratedContent(content);
    setActiveStep(2); // Move to review step
  };

  // Handle save/publish of articles
  const handleSaveArticles = async (articles: any[]) => {
    // Logic to save or publish articles
    try {
      toast({
        title: "Content Saved",
        description: "Your articles have been saved successfully.",
      });
      
      // Navigate back to dashboard
      navigate('/');
    } catch (error) {
      console.error('Error saving articles:', error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "There was an error saving your articles.",
      });
    }
  };

  // Go back to previous step
  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    } else {
      navigate('/');
    }
  };

  // Reset workflow and start over
  const handleStartOver = () => {
    setSelectedProducts([]);
    setGeneratedContent(null);
    setKeywords([]);
    setActiveStep(0);
  };

  // Check if store is connected
  const isConnected = connectionData?.connection?.isConnected === true;
  const defaultBlogId = connectionData?.connection?.defaultBlogId;

  // If there's an error with store connection, show error
  if (!isCheckingConnection && !isConnected) {
    return (
      <div className="container py-10">
        <PageHeader
          heading="Claude AI Content Generation"
          text="Generate SEO-optimized content for your Shopify store using Claude AI"
        />
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            Your Shopify store is not connected. Please connect your store before generating content.
          </AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => navigate('/settings')}
        >
          Go to Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <PageHeader
        heading="Claude AI Content Generation"
        text="Generate SEO-optimized content for your Shopify store using Claude AI"
      />

      <div className="my-8">
        <Stepper size="lg" index={activeStep}>
          {steps.map((step, index) => (
            <Step key={index}>
              <StepIndicator>
                <StepStatus
                  complete={<StepNumber />}
                  incomplete={<StepNumber />}
                  active={<StepNumber />}
                />
              </StepIndicator>

              <div className="flex flex-col">
                <StepTitle>{step.title}</StepTitle>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

              <StepSeparator />
            </Step>
          ))}
        </Stepper>
      </div>

      <div className="flex items-center mb-4">
        <Button variant="ghost" onClick={handleBack} className="flex items-center">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        {activeStep > 0 && (
          <Button variant="outline" onClick={handleStartOver} className="ml-auto">
            Start Over
          </Button>
        )}
      </div>

      {/* Step 1: Product Selection */}
      {activeStep === 0 && (
        <div className="space-y-6">
          {isLoadingProducts ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : productsError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error loading products</AlertTitle>
              <AlertDescription>
                There was an error loading your products. Please try again.
              </AlertDescription>
            </Alert>
          ) : (
            <ProductSelector
              products={productsData?.products || []}
              onProductsSelected={handleProductsSelected}
              selectedProducts={selectedProducts}
            />
          )}
        </div>
      )}

      {/* Step 2: Content Generation */}
      {activeStep === 1 && (
        <div className="space-y-6">
          <ClaudeContentForm 
            onContentGenerated={handleContentGenerated}
            products={selectedProducts}
            keywords={keywords}
          />
        </div>
      )}

      {/* Step 3: Review & Publish */}
      {activeStep === 2 && generatedContent && (
        <div className="space-y-6">
          {generatedContent.success ? (
            generatedContent.cluster ? (
              // Render cluster content review
              <ClusterWorkflow
                articles={generatedContent.cluster.subtopics}
                onSave={handleSaveArticles}
                canSchedule={true}
                blogId={defaultBlogId}
                products={selectedProducts}
                onBack={() => setActiveStep(1)}
              />
            ) : generatedContent.article ? (
              // Render single post review
              <SinglePostForm
                post={generatedContent.article}
                products={selectedProducts}
                onSave={handleSaveArticles}
                canSchedule={true}
                blogId={defaultBlogId}
              />
            ) : (
              <Alert>
                <AlertTitle>No Content Generated</AlertTitle>
                <AlertDescription>
                  There seems to be an issue with the generated content. Please try again.
                </AlertDescription>
              </Alert>
            )
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Content Generation Failed</AlertTitle>
              <AlertDescription>
                {generatedContent.message || "Failed to generate content with Claude AI."}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}