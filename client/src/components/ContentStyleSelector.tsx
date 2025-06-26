import { useState, useEffect } from 'react';
import { 
  FormItem, 
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { genders, styles, tones, getStylesByGender, getTonesByStyle, findToneById } from '@/lib/data/copywritingStyles';

interface ContentStyleSelectorProps {
  onSelectionChange: (selectedToneId: string, displayName: string) => void;
  initialGenderId?: string;
  initialStyleId?: string;
  initialToneId?: string;
  className?: string;
}

export function ContentStyleSelector({
  onSelectionChange,
  initialGenderId = '',
  initialStyleId = '',
  initialToneId = '',
  className = ''
}: ContentStyleSelectorProps) {
  const [selectedGender, setSelectedGender] = useState<string>(initialGenderId);
  const [selectedStyle, setSelectedStyle] = useState<string>(initialStyleId);
  const [selectedTone, setSelectedTone] = useState<string>(initialToneId);
  
  const [availableStyles, setAvailableStyles] = useState(selectedGender ? getStylesByGender(selectedGender) : []);
  const [availableTones, setAvailableTones] = useState(selectedStyle ? getTonesByStyle(selectedStyle) : []);

  // Initialize based on initial values
  useEffect(() => {
    console.log("ContentStyleSelector useEffect triggered:", { initialGenderId, initialStyleId, initialToneId });
    if (initialToneId) {
      // Find the tone and derive gender and style from it
      const tone = findToneById(initialToneId);
      if (tone) {
        const style = styles.find(s => s.id === tone.styleId);
        if (style) {
          setSelectedGender(style.genderId);
          setSelectedStyle(style.id);
          setSelectedTone(initialToneId);
          setAvailableStyles(getStylesByGender(style.genderId));
          setAvailableTones(getTonesByStyle(style.id));
          
          // Notify parent component
          onSelectionChange(initialToneId, tone.displayName);
        }
      }
    } else if (initialGenderId) {
      setSelectedGender(initialGenderId);
      setAvailableStyles(getStylesByGender(initialGenderId));
      
      if (initialStyleId) {
        setSelectedStyle(initialStyleId);
        setAvailableTones(getTonesByStyle(initialStyleId));
        
        if (initialToneId) {
          setSelectedTone(initialToneId);
          const tone = findToneById(initialToneId);
          if (tone) {
            onSelectionChange(initialToneId, tone.displayName);
          }
        }
      }
    } else {
      // Clear all selections if no initial values
      setSelectedGender('');
      setSelectedStyle('');
      setSelectedTone('');
      setAvailableStyles([]);
      setAvailableTones([]);
    }
  }, [initialGenderId, initialStyleId, initialToneId]);

  // When gender changes, update styles and reset tone
  const handleGenderChange = (value: string) => {
    setSelectedGender(value);
    const filteredStyles = getStylesByGender(value);
    setAvailableStyles(filteredStyles);
    
    // Reset style and tone when gender changes
    setSelectedStyle('');
    setSelectedTone('');
    setAvailableTones([]);
    
    // Don't notify parent until complete selection is made
    // onSelectionChange('', '');
  };

  // When style changes, update tones
  const handleStyleChange = (value: string) => {
    setSelectedStyle(value);
    const filteredTones = getTonesByStyle(value);
    setAvailableTones(filteredTones);
    
    // Reset tone when style changes
    setSelectedTone('');
    
    // Don't notify parent until tone is selected
    // onSelectionChange('', '');
  };

  // When tone changes, notify parent
  const handleToneChange = (value: string) => {
    setSelectedTone(value);
    const tone = findToneById(value);
    if (tone) {
      onSelectionChange(value, tone.displayName);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Content Style</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <FormItem>
            <FormLabel>Gender</FormLabel>
            <Select value={selectedGender} onValueChange={handleGenderChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {genders.map((gender) => (
                  <SelectItem key={gender.id} value={gender.id}>
                    {gender.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Choose the gender orientation for your content
            </FormDescription>
          </FormItem>
        </div>

        <div className="space-y-2">
          <FormItem>
            <FormLabel>Content Style</FormLabel>
            <Select 
              value={selectedStyle} 
              onValueChange={handleStyleChange}
              disabled={!selectedGender}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select style" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableStyles.map((style) => (
                  <SelectItem key={style.id} value={style.id}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Choose the writing style for your content
            </FormDescription>
          </FormItem>
        </div>

        <div className="space-y-2">
          <FormItem>
            <FormLabel>Tone</FormLabel>
            <Select 
              value={selectedTone} 
              onValueChange={handleToneChange}
              disabled={!selectedStyle}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableTones.map((tone) => (
                  <SelectItem key={tone.id} value={tone.id}>
                    {tone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Choose the tone of voice for your content
            </FormDescription>
          </FormItem>
        </div>


      </CardContent>
    </Card>
  );
}