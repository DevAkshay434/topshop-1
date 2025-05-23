/**
 * Content style options for the project setup flow
 * These options allow users to customize their content generation preferences
 */

// Tone options
export interface ToneOption {
  id: string;
  name: string;
  description: string;
}

export const toneOptions: ToneOption[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Formal, authoritative tone appropriate for business audiences'
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, approachable tone that builds rapport with readers'
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Light-hearted, fun tone with personality and humor'
  },
  {
    id: 'conversational',
    name: 'Conversational',
    description: 'Natural, everyday language that feels like a person talking'
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Informative tone focused on teaching concepts clearly'
  },
  {
    id: 'persuasive',
    name: 'Persuasive',
    description: 'Convincing tone designed to influence reader decisions'
  }
];

// Perspective options
export interface PerspectiveOption {
  id: string;
  name: string;
  description: string;
  example: string;
}

export const perspectiveOptions: PerspectiveOption[] = [
  {
    id: 'first_person_singular',
    name: 'First-person (I/Me)',
    description: 'Content written from the individual author perspective',
    example: 'I recommend this product because I have found it effective.'
  },
  {
    id: 'first_person_plural',
    name: 'First-person plural (We/Us)',
    description: 'Content written from the company or team perspective',
    example: 'We believe our solution will help you succeed.'
  },
  {
    id: 'second_person',
    name: 'Second-person (You/Your)',
    description: 'Content addressing the reader directly',
    example: 'You will notice improved results within weeks.'
  },
  {
    id: 'third_person',
    name: 'Third-person (They/He/She/It)',
    description: 'Content written in an objective, observational style',
    example: 'Customers report significant improvements after using this product.'
  }
];

// Content structure options
export interface StructureOption {
  id: string;
  name: string;
  description: string;
}

export const structureOptions: StructureOption[] = [
  {
    id: 'narrative',
    name: 'Narrative',
    description: 'Story-based content with a beginning, middle, and end'
  },
  {
    id: 'informational',
    name: 'Informational',
    description: 'Fact-focused content that clearly presents information'
  },
  {
    id: 'how_to',
    name: 'How-To Guide',
    description: 'Step-by-step instructions to accomplish a specific task'
  },
  {
    id: 'listicle',
    name: 'Listicle',
    description: 'Content organized as a numbered or bulleted list'
  },
  {
    id: 'comparison',
    name: 'Comparison',
    description: 'Content that evaluates different options or approaches'
  },
  {
    id: 'problem_solution',
    name: 'Problem-Solution',
    description: 'Content that identifies a problem and presents a solution'
  }
];