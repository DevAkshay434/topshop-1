import React from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCode, Pencil, Plus } from "lucide-react";

// Template data structure
interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
}

// Sample template data
const templates: Template[] = [
  {
    id: 1,
    name: "Product Review",
    description: "Template for reviewing products with pros, cons, and ratings.",
    category: "Reviews"
  },
  {
    id: 2,
    name: "How-To Guide",
    description: "Step-by-step instructions for teaching a skill or process.",
    category: "Educational"
  },
  {
    id: 3,
    name: "Industry News",
    description: "Format for reporting on industry trends and developments.",
    category: "News"
  },
  {
    id: 4,
    name: "Product Comparison",
    description: "Side-by-side comparison of similar products or services.",
    category: "Reviews"
  },
  {
    id: 5,
    name: "Seasonal Promotion",
    description: "Promotional content for seasonal sales and special events.",
    category: "Marketing"
  },
  {
    id: 6,
    name: "Customer Story",
    description: "Format for highlighting customer success stories.",
    category: "Case Studies"
  }
];

// Template card component
function TemplateCard({ template }: { template: Template }) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {template.category}
          </span>
        </div>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-2 mt-auto">
        <div className="flex space-x-2 mt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button size="sm" className="flex-1">
            <FileCode className="h-4 w-4 mr-2" />
            Use
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ContentTemplates() {
  return (
    <Layout>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-neutral-900">Content Templates</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Use pre-built templates to quickly create blog content
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:ml-4">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </Layout>
  );
}