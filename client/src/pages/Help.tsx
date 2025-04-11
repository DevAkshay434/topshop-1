import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { Mailbox, MessageSquare, BookOpen, ArrowRight, ExternalLink } from "lucide-react";

export default function Help() {
  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">TopShop SEO Help & Support</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Find answers to common questions or contact our support team
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="faq">
        <TabsList className="mb-6">
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="guides">User Guides</TabsTrigger>
          <TabsTrigger value="contact">Contact Support</TabsTrigger>
        </TabsList>
        
        <TabsContent value="faq" className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How does the content generation work?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Our app uses Claude AI (version 3.7) to generate high-quality blog content based on the topics and prompts you provide.</p>
                <p className="mb-2">The system analyzes your topic, creates appropriate headings, paragraphs, and formatting, and delivers ready-to-publish content for your Shopify blog.</p>
                <p>You can use simple prompts or choose from our template library to create different types of content such as how-to guides, product comparisons, or industry news articles.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-2">
              <AccordionTrigger>How do I connect my Shopify store?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">To connect your Shopify store, navigate to the "Shopify Connection" page from the sidebar menu.</p>
                <p className="mb-2">Enter your shop domain (e.g., yourstore.myshopify.com) and follow the authentication process.</p>
                <p>Once connected, the app will automatically detect your blogs and allow you to publish content directly to your store.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>How do I generate multiple blog posts at once?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">You can use our Bulk Generation feature to create multiple blog posts in one go:</p>
                <ol className="list-decimal pl-5 space-y-1 mb-2">
                  <li>Navigate to "Bulk Generation" in the sidebar</li>
                  <li>Enter your topics, one per line</li>
                  <li>Select a template or create a custom prompt</li>
                  <li>Click "Generate Content"</li>
                </ol>
                <p>The app will process each topic and create separate blog posts that you can review, edit, and publish.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger>What types of content can I create?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Our app supports various content types including:</p>
                <ul className="list-disc pl-5 space-y-1 mb-2">
                  <li>How-to guides and tutorials</li>
                  <li>Product reviews and comparisons</li>
                  <li>Industry news and trend analyses</li>
                  <li>Seasonal promotions and marketing campaigns</li>
                  <li>Case studies and success stories</li>
                  <li>Educational content and explanations</li>
                </ul>
                <p>You can use content templates or create custom prompts to specify exactly what kind of content you need.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger>How do I manage Claude API usage?</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">The app exclusively uses Claude 3.7 Sonnet for content generation. Your subscription includes a generous API usage allocation.</p>
                <p className="mb-2">You can monitor your usage in the Analytics section, which shows how many posts you've generated within your current billing cycle.</p>
                <p>If you need additional capacity, you can upgrade your plan in the Billing Settings page.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
        
        <TabsContent value="guides" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Getting Started Guide</CardTitle>
                <CardDescription>Learn the basics of the app</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Connecting your store</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Creating your first post</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Understanding the dashboard</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Guide
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Content Templates</CardTitle>
                <CardDescription>Master the template system</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Using built-in templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Creating custom prompts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Best practices</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Guide
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle>Bulk Generation</CardTitle>
                <CardDescription>Generate content at scale</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Setting up topic lists</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Optimizing for quality</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary"></div>
                    <span>Managing large batches</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Read Guide
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <div className="flex justify-center mt-8">
            <Button variant="link" className="flex items-center">
              <span>View all guides</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="contact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Live Chat Support
                </CardTitle>
                <CardDescription>
                  Chat with our team in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Our live chat support is available Monday through Friday, 9am to 5pm Eastern Time.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">
                  Start Chat
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Mailbox className="mr-2 h-5 w-5" />
                  Email Support
                </CardTitle>
                <CardDescription>
                  Send us an email anytime
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Email support is available 24/7 with a response time of 24-48 hours.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Contact via Email
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Shopify App Support</CardTitle>
              <CardDescription>
                Get help directly from the Shopify App Store
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                As a Shopify app, you can also access support through the Shopify App Store or your Shopify admin dashboard.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="flex items-center">
                <span>Visit Shopify App Page</span>
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
}