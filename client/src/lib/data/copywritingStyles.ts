// This file contains the gender, style, and tone combinations for copywriting
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

// Available genders (from sheet data)
export const genders: CopywritingGender[] = [
  {
    id: 'male',
    name: 'Male',
    description: 'Male-oriented copywriting style'
  },
  {
    id: 'female',
    name: 'Female',
    description: 'Female-oriented copywriting style'
  },
  {
    id: 'neutral',
    name: 'Gender Neutral',
    description: 'Gender-neutral copywriting style'
  }
];

// Styles associated with each gender (from sheet data)
export const styles: CopywritingStyle[] = [
  // Male styles
  {
    id: 'male-professional',
    name: 'Professional',
    genderId: 'male',
    description: 'Formal and business-oriented style'
  },
  {
    id: 'male-conversational',
    name: 'Conversational',
    genderId: 'male',
    description: 'Natural, everyday language style'
  },
  {
    id: 'male-academic',
    name: 'Academic',
    genderId: 'male',
    description: 'Scholarly and research-oriented style'
  },
  {
    id: 'male-creative',
    name: 'Creative',
    genderId: 'male',
    description: 'Imaginative and artistic style'
  },
  {
    id: 'male-technical',
    name: 'Technical',
    genderId: 'male',
    description: 'Detailed and specialized technical style'
  },
  
  // Female styles
  {
    id: 'female-professional',
    name: 'Professional',
    genderId: 'female',
    description: 'Formal and business-oriented style'
  },
  {
    id: 'female-conversational',
    name: 'Conversational',
    genderId: 'female',
    description: 'Natural, everyday language style'
  },
  {
    id: 'female-academic',
    name: 'Academic',
    genderId: 'female',
    description: 'Scholarly and research-oriented style'
  },
  {
    id: 'female-creative',
    name: 'Creative',
    genderId: 'female',
    description: 'Imaginative and artistic style'
  },
  {
    id: 'female-technical',
    name: 'Technical',
    genderId: 'female',
    description: 'Detailed and specialized technical style'
  },
  
  // Neutral styles
  {
    id: 'neutral-professional',
    name: 'Professional',
    genderId: 'neutral',
    description: 'Formal and business-oriented style'
  },
  {
    id: 'neutral-conversational',
    name: 'Conversational',
    genderId: 'neutral',
    description: 'Natural, everyday language style'
  },
  {
    id: 'neutral-academic',
    name: 'Academic',
    genderId: 'neutral',
    description: 'Scholarly and research-oriented style'
  },
  {
    id: 'neutral-creative',
    name: 'Creative',
    genderId: 'neutral',
    description: 'Imaginative and artistic style'
  },
  {
    id: 'neutral-technical',
    name: 'Technical',
    genderId: 'neutral',
    description: 'Detailed and specialized technical style'
  }
];

// Tones associated with each style and gender (from sheet data)
export const tones: CopywritingTone[] = [
  // Male Professional tones
  {
    id: 'male-professional-authoritative',
    name: 'Authoritative',
    styleId: 'male-professional',
    displayName: 'David Mitchell (Professional Expert)'
  },
  {
    id: 'male-professional-diplomatic',
    name: 'Diplomatic',
    styleId: 'male-professional',
    displayName: 'Jonathan Hayes (Diplomatic Professional)'
  },
  {
    id: 'male-professional-direct',
    name: 'Direct',
    styleId: 'male-professional',
    displayName: 'Michael Chen (Direct Communicator)'
  },
  
  // Male Conversational tones
  {
    id: 'male-conversational-friendly',
    name: 'Friendly',
    styleId: 'male-conversational',
    displayName: 'Jake Williams (Friendly Guide)'
  },
  {
    id: 'male-conversational-casual',
    name: 'Casual',
    styleId: 'male-conversational',
    displayName: 'Alex Thompson (Casual Explainer)'
  },
  {
    id: 'male-conversational-humorous',
    name: 'Humorous',
    styleId: 'male-conversational',
    displayName: 'Nick Peterson (Humorous Writer)'
  },
  
  // Male Academic tones
  {
    id: 'male-academic-analytical',
    name: 'Analytical',
    styleId: 'male-academic',
    displayName: 'Professor Robert Anderson (Analytical Scholar)'
  },
  {
    id: 'male-academic-scholarly',
    name: 'Scholarly',
    styleId: 'male-academic',
    displayName: 'Dr. James Wilson (Scholarly Expert)'
  },
  {
    id: 'male-academic-instructive',
    name: 'Instructive',
    styleId: 'male-academic',
    displayName: 'Thomas Brooks (Academic Instructor)'
  },
  
  // Male Creative tones
  {
    id: 'male-creative-inspirational',
    name: 'Inspirational',
    styleId: 'male-creative',
    displayName: 'Ryan Hughes (Inspirational Creator)'
  },
  {
    id: 'male-creative-narrative',
    name: 'Narrative',
    styleId: 'male-creative',
    displayName: 'Daniel Hart (Narrative Storyteller)'
  },
  {
    id: 'male-creative-enthusiastic',
    name: 'Enthusiastic',
    styleId: 'male-creative',
    displayName: 'Justin Miller (Enthusiastic Visionary)'
  },
  
  // Male Technical tones
  {
    id: 'male-technical-precise',
    name: 'Precise',
    styleId: 'male-technical',
    displayName: 'Nathan Cooper (Precision Engineer)'
  },
  {
    id: 'male-technical-informative',
    name: 'Informative',
    styleId: 'male-technical',
    displayName: 'Eric Stanford (Technical Information Expert)'
  },
  {
    id: 'male-technical-methodical',
    name: 'Methodical',
    styleId: 'male-technical',
    displayName: 'Brian Fletcher (Methodical Analyst)'
  },
  
  // Female Professional tones
  {
    id: 'female-professional-authoritative',
    name: 'Authoritative',
    styleId: 'female-professional',
    displayName: 'Emma Johnson (Professional Authority)'
  },
  {
    id: 'female-professional-diplomatic',
    name: 'Diplomatic',
    styleId: 'female-professional',
    displayName: 'Sarah Williams (Diplomatic Professional)'
  },
  {
    id: 'female-professional-direct',
    name: 'Direct',
    styleId: 'female-professional',
    displayName: 'Jennifer Davis (Direct Communicator)'
  },
  
  // Female Conversational tones
  {
    id: 'female-conversational-friendly',
    name: 'Friendly',
    styleId: 'female-conversational',
    displayName: 'Amy Roberts (Friendly Guide)'
  },
  {
    id: 'female-conversational-casual',
    name: 'Casual',
    styleId: 'female-conversational',
    displayName: 'Jessica Thompson (Casual Explainer)'
  },
  {
    id: 'female-conversational-humorous',
    name: 'Humorous',
    styleId: 'female-conversational',
    displayName: 'Rachel Wilson (Humorous Writer)'
  },
  
  // Female Academic tones
  {
    id: 'female-academic-analytical',
    name: 'Analytical',
    styleId: 'female-academic',
    displayName: 'Professor Katherine Sullivan (Analytical Scholar)'
  },
  {
    id: 'female-academic-scholarly',
    name: 'Scholarly',
    styleId: 'female-academic',
    displayName: 'Dr. Elizabeth Jenkins (Scholarly Expert)'
  },
  {
    id: 'female-academic-instructive',
    name: 'Instructive',
    styleId: 'female-academic',
    displayName: 'Margaret Hayes (Academic Instructor)'
  },
  
  // Female Creative tones
  {
    id: 'female-creative-inspirational',
    name: 'Inspirational',
    styleId: 'female-creative',
    displayName: 'Olivia Bennett (Inspirational Creator)'
  },
  {
    id: 'female-creative-narrative',
    name: 'Narrative',
    styleId: 'female-creative',
    displayName: 'Lily Morgan (Narrative Storyteller)'
  },
  {
    id: 'female-creative-enthusiastic',
    name: 'Enthusiastic',
    styleId: 'female-creative',
    displayName: 'Sophia Martin (Enthusiastic Visionary)'
  },
  
  // Female Technical tones
  {
    id: 'female-technical-precise',
    name: 'Precise',
    styleId: 'female-technical',
    displayName: 'Natalie Cooper (Precision Engineer)'
  },
  {
    id: 'female-technical-informative',
    name: 'Informative',
    styleId: 'female-technical',
    displayName: 'Emily Stanford (Technical Information Expert)'
  },
  {
    id: 'female-technical-methodical',
    name: 'Methodical',
    styleId: 'female-technical',
    displayName: 'Briana Fletcher (Methodical Analyst)'
  },
  
  // Neutral Professional tones
  {
    id: 'neutral-professional-authoritative',
    name: 'Authoritative',
    styleId: 'neutral-professional',
    displayName: 'Taylor Morgan (Professional Authority)'
  },
  {
    id: 'neutral-professional-diplomatic',
    name: 'Diplomatic',
    styleId: 'neutral-professional',
    displayName: 'Jordan Hayes (Diplomatic Professional)'
  },
  {
    id: 'neutral-professional-direct',
    name: 'Direct',
    styleId: 'neutral-professional',
    displayName: 'Casey Chen (Direct Communicator)'
  },
  
  // Neutral Conversational tones
  {
    id: 'neutral-conversational-friendly',
    name: 'Friendly',
    styleId: 'neutral-conversational',
    displayName: 'Sam Williams (Friendly Guide)'
  },
  {
    id: 'neutral-conversational-casual',
    name: 'Casual',
    styleId: 'neutral-conversational',
    displayName: 'Riley Thompson (Casual Explainer)'
  },
  {
    id: 'neutral-conversational-humorous',
    name: 'Humorous',
    styleId: 'neutral-conversational',
    displayName: 'Jamie Peterson (Humorous Writer)'
  },
  
  // Neutral Academic tones
  {
    id: 'neutral-academic-analytical',
    name: 'Analytical',
    styleId: 'neutral-academic',
    displayName: 'Dr. Avery Sullivan (Analytical Scholar)'
  },
  {
    id: 'neutral-academic-scholarly',
    name: 'Scholarly',
    styleId: 'neutral-academic',
    displayName: 'Professor Morgan Jenkins (Scholarly Expert)'
  },
  {
    id: 'neutral-academic-instructive',
    name: 'Instructive',
    styleId: 'neutral-academic',
    displayName: 'Alex Hayes (Academic Instructor)'
  },
  
  // Neutral Creative tones
  {
    id: 'neutral-creative-inspirational',
    name: 'Inspirational',
    styleId: 'neutral-creative',
    displayName: 'Cameron Bennett (Inspirational Creator)'
  },
  {
    id: 'neutral-creative-narrative',
    name: 'Narrative',
    styleId: 'neutral-creative',
    displayName: 'Riley Morgan (Narrative Storyteller)'
  },
  {
    id: 'neutral-creative-enthusiastic',
    name: 'Enthusiastic',
    styleId: 'neutral-creative',
    displayName: 'Jordan Martin (Enthusiastic Visionary)'
  },
  
  // Neutral Technical tones
  {
    id: 'neutral-technical-precise',
    name: 'Precise',
    styleId: 'neutral-technical',
    displayName: 'Taylor Cooper (Precision Engineer)'
  },
  {
    id: 'neutral-technical-informative',
    name: 'Informative',
    styleId: 'neutral-technical',
    displayName: 'Morgan Stanford (Technical Information Expert)'
  },
  {
    id: 'neutral-technical-methodical',
    name: 'Methodical',
    styleId: 'neutral-technical',
    displayName: 'Casey Fletcher (Methodical Analyst)'
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