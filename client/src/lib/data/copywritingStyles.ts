// This file contains the gender, style, and tone combinations for copywriting
// Data is structured based on the Google Sheet reference

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

// Available genders
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
  }
];

// Styles associated with each gender
export const styles: CopywritingStyle[] = [
  // Male styles
  {
    id: 'male-professional',
    name: 'Professional',
    genderId: 'male',
    description: 'Formal and business-oriented style for male audience'
  },
  {
    id: 'male-casual',
    name: 'Casual',
    genderId: 'male',
    description: 'Relaxed and informal style for male audience'
  },
  {
    id: 'male-trendy',
    name: 'Trendy',
    genderId: 'male',
    description: 'Modern and fashionable style for male audience'
  },
  
  // Female styles
  {
    id: 'female-professional',
    name: 'Professional',
    genderId: 'female',
    description: 'Formal and business-oriented style for female audience'
  },
  {
    id: 'female-casual',
    name: 'Casual',
    genderId: 'female',
    description: 'Relaxed and informal style for female audience'
  },
  {
    id: 'female-trendy',
    name: 'Trendy',
    genderId: 'female',
    description: 'Modern and fashionable style for female audience'
  }
];

// Tones associated with each style and gender
export const tones: CopywritingTone[] = [
  // Male Professional tones
  {
    id: 'male-professional-authoritative',
    name: 'Authoritative',
    styleId: 'male-professional',
    displayName: 'John Smith'
  },
  {
    id: 'male-professional-informative',
    name: 'Informative',
    styleId: 'male-professional',
    displayName: 'David Johnson'
  },
  {
    id: 'male-professional-analytical',
    name: 'Analytical',
    styleId: 'male-professional',
    displayName: 'Michael Brown'
  },
  
  // Male Casual tones
  {
    id: 'male-casual-friendly',
    name: 'Friendly',
    styleId: 'male-casual',
    displayName: 'Jake Williams'
  },
  {
    id: 'male-casual-conversational',
    name: 'Conversational',
    styleId: 'male-casual',
    displayName: 'Tom Anderson'
  },
  {
    id: 'male-casual-humorous',
    name: 'Humorous',
    styleId: 'male-casual',
    displayName: 'Nick Peterson'
  },
  
  // Male Trendy tones
  {
    id: 'male-trendy-edgy',
    name: 'Edgy',
    styleId: 'male-trendy',
    displayName: 'Alex Carter'
  },
  {
    id: 'male-trendy-inspirational',
    name: 'Inspirational',
    styleId: 'male-trendy',
    displayName: 'Ryan Hughes'
  },
  {
    id: 'male-trendy-enthusiastic',
    name: 'Enthusiastic',
    styleId: 'male-trendy',
    displayName: 'Justin Miller'
  },
  
  // Female Professional tones
  {
    id: 'female-professional-authoritative',
    name: 'Authoritative',
    styleId: 'female-professional',
    displayName: 'Emma Johnson'
  },
  {
    id: 'female-professional-informative',
    name: 'Informative',
    styleId: 'female-professional',
    displayName: 'Sarah Williams'
  },
  {
    id: 'female-professional-analytical',
    name: 'Analytical',
    styleId: 'female-professional',
    displayName: 'Jennifer Davis'
  },
  
  // Female Casual tones
  {
    id: 'female-casual-friendly',
    name: 'Friendly',
    styleId: 'female-casual',
    displayName: 'Amy Roberts'
  },
  {
    id: 'female-casual-conversational',
    name: 'Conversational',
    styleId: 'female-casual',
    displayName: 'Jessica Thompson'
  },
  {
    id: 'female-casual-humorous',
    name: 'Humorous',
    styleId: 'female-casual',
    displayName: 'Rachel Wilson'
  },
  
  // Female Trendy tones
  {
    id: 'female-trendy-edgy',
    name: 'Edgy',
    styleId: 'female-trendy',
    displayName: 'Zoe Parker'
  },
  {
    id: 'female-trendy-inspirational',
    name: 'Inspirational',
    styleId: 'female-trendy',
    displayName: 'Olivia Bennett'
  },
  {
    id: 'female-trendy-enthusiastic',
    name: 'Enthusiastic',
    styleId: 'female-trendy',
    displayName: 'Sophia Martin'
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