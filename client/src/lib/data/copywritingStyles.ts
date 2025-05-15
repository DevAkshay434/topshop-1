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
    id: 'male',
    name: 'Male',
    description: 'Male gender orientation'
  },
  {
    id: 'female',
    name: 'Female',
    description: 'Female gender orientation'
  },
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'Gender-neutral orientation'
  }
];

// Specific writing styles within each category
export const styles: CopywritingStyle[] = [
  // Male styles
  {
    id: 'direct-response',
    name: 'Direct-Response',
    genderId: 'male',
    description: 'Persuasive copywriting focused on generating immediate action'
  },
  {
    id: 'brand-storytelling',
    name: 'Brand & Ethical Storytelling',
    genderId: 'male',
    description: 'Narrative-based copywriting that builds brand identity and values'
  },
  {
    id: 'digital-modern',
    name: 'Digital & Modern-Day',
    genderId: 'male',
    description: 'Contemporary digital-first copywriting for online platforms'
  },
  {
    id: 'scientific',
    name: 'Scientific and Data-Driven',
    genderId: 'male',
    description: 'Evidence-based copywriting using research and data'
  },
  
  // Female styles
  {
    id: 'direct-response-female',
    name: 'Direct-Response',
    genderId: 'female',
    description: 'Persuasive copywriting focused on generating immediate action'
  },
  {
    id: 'brand-storytelling-female',
    name: 'Brand & Ethical Storytelling',
    genderId: 'female',
    description: 'Narrative-based copywriting that builds brand identity and values'
  },
  {
    id: 'digital-modern-female',
    name: 'Digital & Modern-Day',
    genderId: 'female',
    description: 'Contemporary digital-first copywriting for online platforms'
  },
  {
    id: 'scientific-female',
    name: 'Scientific and Data-Driven',
    genderId: 'female',
    description: 'Evidence-based copywriting using research and data'
  },

  // Neutral styles
  {
    id: 'direct-response-neutral',
    name: 'Direct-Response',
    genderId: 'neutral',
    description: 'Persuasive copywriting focused on generating immediate action'
  },
  {
    id: 'brand-storytelling-neutral',
    name: 'Brand & Ethical Storytelling',
    genderId: 'neutral',
    description: 'Narrative-based copywriting that builds brand identity and values'
  },
  {
    id: 'digital-modern-neutral',
    name: 'Digital & Modern-Day',
    genderId: 'neutral',
    description: 'Contemporary digital-first copywriting for online platforms'
  },
  {
    id: 'scientific-neutral',
    name: 'Scientific and Data-Driven',
    genderId: 'neutral',
    description: 'Evidence-based copywriting using research and data'
  }
];

// Tones associated with each style
export const tones: CopywritingTone[] = [
  // Male - Direct Response tones
  {
    id: 'direct-response-direct-punchy',
    name: 'Direct, Punchy',
    styleId: 'direct-response',
    displayName: 'Alex Morgan (Direct, Punchy Copywriter)'
  },
  {
    id: 'direct-response-serious-persuasive',
    name: 'Serious, Persuasive',
    styleId: 'direct-response',
    displayName: 'Ryan Cooper (Serious, Persuasive Copywriter)'
  },
  {
    id: 'direct-response-engaging-persuasive',
    name: 'Engaging, Persuasive',
    styleId: 'direct-response',
    displayName: 'Jason Lang (Engaging, Persuasive Specialist)'
  },
  
  // Male - Brand Storytelling tones
  {
    id: 'brand-storytelling-ethical-storytelling',
    name: 'Ethical, Storytelling',
    styleId: 'brand-storytelling',
    displayName: 'Jordan Riley (Ethical Storyteller)'
  },
  {
    id: 'brand-storytelling-authentic-heart',
    name: 'Authentic, Heart-Centered',
    styleId: 'brand-storytelling',
    displayName: 'Ethan Lee (Authentic, Heart-Centered Expert)'
  },
  {
    id: 'brand-storytelling-heartfelt-authentic',
    name: 'Heartfelt, Authentic',
    styleId: 'brand-storytelling',
    displayName: 'Sam Richards (Heartfelt, Authentic Leader)'
  },
  
  // Male - Digital & Modern-Day tones
  {
    id: 'digital-modern-punchy-direct',
    name: 'Punchy, Direct',
    styleId: 'digital-modern',
    displayName: 'Zack Thompson (Punchy, Direct Digital Writer)'
  },
  {
    id: 'digital-modern-refined-persuasive',
    name: 'Refined, Persuasive',
    styleId: 'digital-modern',
    displayName: 'Daniel Kim (Refined, Persuasive Content Writer)'
  },
  {
    id: 'digital-modern-engaging-digital',
    name: 'Engaging, Digital',
    styleId: 'digital-modern',
    displayName: 'Tyler Morgan (Engaging Digital Content Creator)'
  },
  
  // Male - Scientific tones
  {
    id: 'scientific-professional-data',
    name: 'Professional, Data-Driven',
    styleId: 'scientific',
    displayName: 'Dr. Morgan Cooper (Professional, Data-Driven Writer)'
  },
  {
    id: 'scientific-scientific-analytical',
    name: 'Scientific, Analytical',
    styleId: 'scientific',
    displayName: 'Dr. Jamie Roberts (Scientific, Analytical Writer)'
  },
  {
    id: 'scientific-data-technical',
    name: 'Data-Driven, Technical',
    styleId: 'scientific',
    displayName: 'Professor Jordan Miller (Data-Driven, Technical Expert)'
  },
  
  // Female - Direct Response tones
  {
    id: 'direct-response-results-persuasive-female',
    name: 'Results-Driven, Persuasive',
    styleId: 'direct-response-female',
    displayName: 'Alexandra Morgan (Results-Driven, Persuasive Copywriter)'
  },
  {
    id: 'direct-response-optimized-direct-female',
    name: 'Optimized, Direct',
    styleId: 'direct-response-female',
    displayName: 'Rachel Cooper (Optimized, Direct Copywriter)'
  },
  {
    id: 'direct-response-conversion-persuasive-female',
    name: 'Conversion-Focused, Persuasive',
    styleId: 'direct-response-female',
    displayName: 'Jessica Lang (Conversion-Focused, Persuasive Specialist)'
  },
  
  // Female - Brand Storytelling tones
  {
    id: 'brand-storytelling-creative-persuasive-female',
    name: 'Creative, Persuasive',
    styleId: 'brand-storytelling-female',
    displayName: 'Julie Riley (Creative, Persuasive Storyteller)'
  },
  {
    id: 'brand-storytelling-optimized-conversion-female',
    name: 'Optimized, High-Conversion',
    styleId: 'brand-storytelling-female',
    displayName: 'Emma Lee (Optimized, High-Conversion Expert)'
  },
  {
    id: 'brand-storytelling-heartfelt-persuasive-female',
    name: 'Heartfelt, Persuasive',
    styleId: 'brand-storytelling-female',
    displayName: 'Samantha Richards (Heartfelt, Persuasive Leader)'
  },
  
  // Female - Digital & Modern-Day tones
  {
    id: 'digital-modern-persuasive-longform-female',
    name: 'Persuasive, Long-Form',
    styleId: 'digital-modern-female',
    displayName: 'Zoe Thompson (Persuasive, Long-Form Writer)'
  },
  {
    id: 'digital-modern-data-conversion-female',
    name: 'Data-Driven, Conversion-Oriented',
    styleId: 'digital-modern-female',
    displayName: 'Diana Kim (Data-Driven, Conversion-Oriented Writer)'
  },
  {
    id: 'digital-modern-seo-technical-female',
    name: 'SEO-Focused, Technical',
    styleId: 'digital-modern-female',
    displayName: 'Taylor Morgan (SEO-Focused, Technical Creator)'
  },
  
  // Female - Scientific tones
  {
    id: 'scientific-indepth-intellectual-female',
    name: 'In-depth, Intellectual',
    styleId: 'scientific-female',
    displayName: 'Dr. Michelle Cooper (In-depth, Intellectual Writer)'
  },
  {
    id: 'scientific-creative-engaging-female',
    name: 'Creative, Engaging',
    styleId: 'scientific-female',
    displayName: 'Dr. Jamie Roberts (Creative, Engaging Scientific Writer)'
  },
  {
    id: 'scientific-engaging-persuasive-female',
    name: 'Engaging, Persuasive',
    styleId: 'scientific-female',
    displayName: 'Professor Jordan Miller (Engaging, Persuasive Scientific Expert)'
  },
  
  // Neutral - Direct Response tones
  {
    id: 'direct-response-conversion-persuasive-neutral',
    name: 'Conversion-Focused, Persuasive',
    styleId: 'direct-response-neutral',
    displayName: 'A. Morgan (Conversion-Focused, Persuasive Copywriter)'
  },
  {
    id: 'direct-response-high-authentic-neutral',
    name: 'High-Converting, Authentic',
    styleId: 'direct-response-neutral',
    displayName: 'R. Cooper (High-Converting, Authentic Copywriter)'
  },
  {
    id: 'direct-response-engaging-customer-neutral',
    name: 'Engaging, Customer-Centered',
    styleId: 'direct-response-neutral',
    displayName: 'J. Lang (Engaging, Customer-Centered Specialist)'
  },
  
  // Neutral - Brand Storytelling tones
  {
    id: 'brand-storytelling-heart-persuasive-neutral',
    name: 'Heart-Centered, Persuasive',
    styleId: 'brand-storytelling-neutral',
    displayName: 'J. Riley (Heart-Centered, Persuasive Storyteller)'
  },
  {
    id: 'brand-storytelling-authentic-story-neutral',
    name: 'Authentic, Storytelling',
    styleId: 'brand-storytelling-neutral',
    displayName: 'E. Lee (Authentic Storytelling Expert)'
  },
  {
    id: 'brand-storytelling-ethical-nurturing-neutral',
    name: 'Ethical, Nurturing',
    styleId: 'brand-storytelling-neutral',
    displayName: 'S. Richards (Ethical, Nurturing Leader)'
  },
  
  // Neutral - Digital & Modern-Day tones
  {
    id: 'digital-modern-innovative-persuasive-neutral',
    name: 'Innovative, Persuasive',
    styleId: 'digital-modern-neutral',
    displayName: 'Z. Thompson (Innovative, Persuasive Digital Writer)'
  },
  {
    id: 'digital-modern-iconic-persuasive-neutral',
    name: 'Iconic, Persuasive',
    styleId: 'digital-modern-neutral',
    displayName: 'D. Kim (Iconic, Persuasive Content Writer)'
  },
  {
    id: 'digital-modern-creative-persuasive-neutral',
    name: 'Creative, Persuasive',
    styleId: 'digital-modern-neutral',
    displayName: 'T. Morgan (Creative, Persuasive Content Creator)'
  },
  
  // Neutral - Scientific tones
  {
    id: 'scientific-authentic-relationship-neutral',
    name: 'Authentic, Relationship-Building',
    styleId: 'scientific-neutral',
    displayName: 'Dr. M. Cooper (Authentic, Relationship-Building Writer)'
  },
  {
    id: 'scientific-creative-persuasive-neutral',
    name: 'Creative, Persuasive',
    styleId: 'scientific-neutral',
    displayName: 'Dr. J. Roberts (Creative, Persuasive Scientific Writer)'
  },
  {
    id: 'scientific-engaging-persuasive-neutral',
    name: 'Engaging, Persuasive',
    styleId: 'scientific-neutral',
    displayName: 'Professor J. Miller (Engaging, Persuasive Scientific Expert)'
  }
];

// Helper functions to filter the data
export const getStylesByGender = (genderId: string): CopywritingStyle[] => {
  return styles.filter(style => style.genderId === genderId);
};

export const getTonesByStyle = (styleId: string): CopywritingTone[] => {
  return tones.filter(tone => tone.styleId === styleId);
};

export const findToneById = (toneId: string): CopywritingTone | undefined => {
  return tones.find(tone => tone.id === toneId);
};