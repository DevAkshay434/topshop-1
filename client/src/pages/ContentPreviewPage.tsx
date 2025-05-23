import React from 'react';
import ContentPreviewTest from '@/components/ContentPreviewTest';

export default function ContentPreviewPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Content Preview & Media Selection Test</h1>
      <p className="mb-6 text-slate-600">
        This page demonstrates two key features of TopshopSEO:
        <ol className="list-decimal ml-6 mt-2 space-y-1">
          <li>AI Content Generation with Claude 3.7 Sonnet</li>
          <li>Enhanced Media Selection with multiple image sources</li>
        </ol>
      </p>
      <ContentPreviewTest />
    </div>
  );
}