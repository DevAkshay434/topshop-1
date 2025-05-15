// This file contains the copywriting styles and tones based on the Google Sheet
// Data sourced from: https://docs.google.com/spreadsheets/d/1a1oxm7MDF_PXY74u6bBmrhEvcrnt5XaOlLD6mV77o1c/

export interface CopywritingGender {
  id: string;
  name: string;
  description?: string;
}

export interface CopywritingStyle {
  id: string;
  name: string;
  description?: string;
  genderId: string;
}

export interface CopywritingTone {
  id: string;
  name: string;
  description?: string;
  styleId: string;
  displayName: string; // The name to add to the final prompt
}

// Available style genders
export const genders: CopywritingGender[] = [
  {
    id: 'direct-response',
    name: 'Direct-Response',
    description: 'Persuasive copywriting focused on generating immediate action'
  },
  {
    id: 'brand-storytelling',
    name: 'Brand & Ethical Storytelling',
    description: 'Narrative-based copywriting that builds brand identity and values'
  },
  {
    id: 'digital-modern',
    name: 'Digital & Modern-Day',
    description: 'Contemporary digital-first copywriting for online platforms'
  },
  {
    id: 'scientific',
    name: 'Scientific and Data-Driven',
    description: 'Evidence-based copywriting using research and data'
  }
];

// Specific writing styles within each category
export const styles: CopywritingStyle[] = [
  // Direct-Response styles
  {
    id: 'direct-response-sales',
    name: 'Sales Copy',
    genderId: 'direct-response',
    description: 'Persuasive copy focused on driving conversions and sales'
  },
  {
    id: 'direct-response-email',
    name: 'Email Marketing',
    genderId: 'direct-response',
    description: 'Personalized email copy designed to build relationships and drive action'
  },
  {
    id: 'direct-response-ads',
    name: 'Ad Copy',
    genderId: 'direct-response',
    description: 'Concise, compelling copy for advertisements across platforms'
  },
  
  // Brand & Ethical Storytelling styles
  {
    id: 'brand-values',
    name: 'Values-Driven',
    genderId: 'brand-storytelling',
    description: 'Copy that emphasizes brand ethics, purpose and social responsibility'
  },
  {
    id: 'brand-narrative',
    name: 'Narrative Marketing',
    genderId: 'brand-storytelling',
    description: 'Story-based copy that builds emotional connections with audiences'
  },
  {
    id: 'brand-thought-leadership',
    name: 'Thought Leadership',
    genderId: 'brand-storytelling',
    description: 'Authoritative content that establishes industry expertise'
  },
  
  // Digital & Modern-Day styles
  {
    id: 'digital-seo',
    name: 'SEO Content',
    genderId: 'digital-modern',
    description: 'Search-optimized content designed for discovery and engagement'
  },
  {
    id: 'digital-social',
    name: 'Social Media',
    genderId: 'digital-modern',
    description: 'Platform-specific copy optimized for social media engagement'
  },
  {
    id: 'digital-ux',
    name: 'UX Writing',
    genderId: 'digital-modern',
    description: 'Functional copy that guides users through digital experiences'
  },
  
  // Scientific and Data-Driven styles
  {
    id: 'scientific-educational',
    name: 'Educational Content',
    genderId: 'scientific',
    description: 'Informative content that explains complex topics in accessible ways'
  },
  {
    id: 'scientific-technical',
    name: 'Technical Documentation',
    genderId: 'scientific',
    description: 'Precise documentation for technical products and services'
  },
  {
    id: 'scientific-case-studies',
    name: 'Case Studies',
    genderId: 'scientific',
    description: 'Evidence-based success stories that demonstrate value and results'
  }
];

// Tones associated with each style
export const tones: CopywritingTone[] = [
  // Direct Response - Sales Copy tones
  {
    id: 'direct-response-sales-persuasive',
    name: 'Persuasive',
    styleId: 'direct-response-sales',
    displayName: 'Alex Morgan (Persuasive Sales Copywriter)'
  },
  {
    id: 'direct-response-sales-urgent',
    name: 'Urgent',
    styleId: 'direct-response-sales',
    displayName: 'Ryan Cooper (Urgency-Focused Copywriter)'
  },
  {
    id: 'direct-response-sales-conversional',
    name: 'Conversion-Focused',
    styleId: 'direct-response-sales',
    displayName: 'Jessica Lang (Conversion Specialist)'
  },
  
  // Direct Response - Email Marketing tones
  {
    id: 'direct-response-email-personal',
    name: 'Personal',
    styleId: 'direct-response-email',
    displayName: 'David Chen (Personal Email Copywriter)'
  },
  {
    id: 'direct-response-email-engaging',
    name: 'Engaging',
    styleId: 'direct-response-email',
    displayName: 'Emma Wilson (Engagement Email Expert)'
  },
  {
    id: 'direct-response-email-results',
    name: 'Results-Driven',
    styleId: 'direct-response-email',
    displayName: 'Michael Brown (Results-Driven Email Specialist)'
  },
  
  // Direct Response - Ad Copy tones
  {
    id: 'direct-response-ads-catchy',
    name: 'Catchy',
    styleId: 'direct-response-ads',
    displayName: 'Sarah Davis (Catchy Ad Copywriter)'
  },
  {
    id: 'direct-response-ads-concise',
    name: 'Concise',
    styleId: 'direct-response-ads',
    displayName: 'James Wilson (Concise Ad Specialist)'
  },
  {
    id: 'direct-response-ads-compelling',
    name: 'Compelling',
    styleId: 'direct-response-ads',
    displayName: 'Olivia Martinez (Compelling Ad Expert)'
  },
  
  // Brand Values-Driven tones
  {
    id: 'brand-values-authentic',
    name: 'Authentic',
    styleId: 'brand-values',
    displayName: 'Jordan Riley (Authentic Brand Storyteller)'
  },
  {
    id: 'brand-values-purposeful',
    name: 'Purposeful',
    styleId: 'brand-values',
    displayName: 'Taylor Green (Purposeful Brand Writer)'
  },
  {
    id: 'brand-values-inspiring',
    name: 'Inspiring',
    styleId: 'brand-values',
    displayName: 'Cameron Patel (Inspiring Ethical Copywriter)'
  },
  
  // Brand Narrative Marketing tones
  {
    id: 'brand-narrative-emotional',
    name: 'Emotional',
    styleId: 'brand-narrative',
    displayName: 'Alexis Lee (Emotional Narrative Expert)'
  },
  {
    id: 'brand-narrative-relatable',
    name: 'Relatable',
    styleId: 'brand-narrative',
    displayName: 'Jamie Foster (Relatable Storyteller)'
  },
  {
    id: 'brand-narrative-immersive',
    name: 'Immersive',
    styleId: 'brand-narrative',
    displayName: 'Riley Johnson (Immersive Story Copywriter)'
  },
  
  // Brand Thought Leadership tones
  {
    id: 'brand-thought-leadership-authoritative',
    name: 'Authoritative',
    styleId: 'brand-thought-leadership',
    displayName: 'Dr. Morgan Hayes (Authoritative Industry Expert)'
  },
  {
    id: 'brand-thought-leadership-visionary',
    name: 'Visionary',
    styleId: 'brand-thought-leadership',
    displayName: 'Sam Richards (Visionary Thought Leader)'
  },
  {
    id: 'brand-thought-leadership-insightful',
    name: 'Insightful',
    styleId: 'brand-thought-leadership',
    displayName: 'Professor Casey Zhang (Insightful Industry Analyst)'
  },
  
  // Digital SEO Content tones
  {
    id: 'digital-seo-informative',
    name: 'Informative',
    styleId: 'digital-seo',
    displayName: 'Daniel Kim (Informative SEO Writer)'
  },
  {
    id: 'digital-seo-helpful',
    name: 'Helpful',
    styleId: 'digital-seo',
    displayName: 'Sophia Garcia (Helpful SEO Content Specialist)'
  },
  {
    id: 'digital-seo-authoritative',
    name: 'Authoritative',
    styleId: 'digital-seo',
    displayName: 'Nathan Brooks (Authoritative SEO Expert)'
  },
  
  // Digital Social Media tones
  {
    id: 'digital-social-conversational',
    name: 'Conversational',
    styleId: 'digital-social',
    displayName: 'Zoe Thompson (Conversational Social Media Writer)'
  },
  {
    id: 'digital-social-trendy',
    name: 'Trendy',
    styleId: 'digital-social',
    displayName: 'Tyler Morgan (Trendy Social Content Creator)'
  },
  {
    id: 'digital-social-entertaining',
    name: 'Entertaining',
    styleId: 'digital-social',
    displayName: 'Quinn Parker (Entertaining Social Copywriter)'
  },
  
  // Digital UX Writing tones
  {
    id: 'digital-ux-clear',
    name: 'Clear',
    styleId: 'digital-ux',
    displayName: 'Harper Lee (Clear UX Writer)'
  },
  {
    id: 'digital-ux-concise',
    name: 'Concise',
    styleId: 'digital-ux',
    displayName: 'Robin Singh (Concise UX Content Expert)'
  },
  {
    id: 'digital-ux-helpful',
    name: 'Helpful',
    styleId: 'digital-ux',
    displayName: 'Avery Chen (Helpful UX Content Designer)'
  },
  
  // Scientific Educational Content tones
  {
    id: 'scientific-educational-accessible',
    name: 'Accessible',
    styleId: 'scientific-educational',
    displayName: 'Dr. Leslie Park (Accessible Educational Writer)'
  },
  {
    id: 'scientific-educational-engaging',
    name: 'Engaging',
    styleId: 'scientific-educational',
    displayName: 'Professor Jordan Smith (Engaging Educational Content Expert)'
  },
  {
    id: 'scientific-educational-thorough',
    name: 'Thorough',
    styleId: 'scientific-educational',
    displayName: 'Dr. Alex Williams (Thorough Educational Content Specialist)'
  },
  
  // Scientific Technical Documentation tones
  {
    id: 'scientific-technical-precise',
    name: 'Precise',
    styleId: 'scientific-technical',
    displayName: 'Morgan Cooper (Precise Technical Writer)'
  },
  {
    id: 'scientific-technical-structured',
    name: 'Structured',
    styleId: 'scientific-technical',
    displayName: 'Dr. Taylor Singh (Structured Documentation Specialist)'
  },
  {
    id: 'scientific-technical-comprehensive',
    name: 'Comprehensive',
    styleId: 'scientific-technical',
    displayName: 'Casey Fletcher (Comprehensive Technical Documentation Expert)'
  },
  
  // Scientific Case Studies tones
  {
    id: 'scientific-case-studies-data-driven',
    name: 'Data-Driven',
    styleId: 'scientific-case-studies',
    displayName: 'Dr. Jamie Roberts (Data-Driven Case Study Writer)'
  },
  {
    id: 'scientific-case-studies-objective',
    name: 'Objective',
    styleId: 'scientific-case-studies',
    displayName: 'Riley Anderson (Objective Case Study Specialist)'
  },
  {
    id: 'scientific-case-studies-compelling',
    name: 'Compelling',
    styleId: 'scientific-case-studies',
    displayName: 'Professor Jordan Miller (Compelling Evidence-Based Writer)'
  }
];

// Helper functions to filter the data
export const getStylesByGender = (categoryId: string): CopywritingStyle[] => {
  return styles.filter(style => style.genderId === categoryId);
};

export const getTonesByStyle = (styleId: string): CopywritingTone[] => {
  return tones.filter(tone => tone.styleId === styleId);
};

export const findToneById = (toneId: string): CopywritingTone | undefined => {
  return tones.find(tone => tone.id === toneId);
};