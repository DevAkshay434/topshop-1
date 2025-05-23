import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { toneOptions, perspectiveOptions, structureOptions } from '@/lib/data/contentStyleOptions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Define schema for content style form
const contentStyleSchema = z.object({
  tone: z.string().min(1, { message: 'Please select a tone' }),
  perspective: z.string().min(1, { message: 'Please select a perspective' }),
  structure: z.string().min(1, { message: 'Please select a structure' })
});

type ContentStyleFormValues = z.infer<typeof contentStyleSchema>;

interface ContentStyleSettingsProps {
  onSettingsChange: (values: ContentStyleFormValues) => void;
  defaultValues?: Partial<ContentStyleFormValues>;
  className?: string;
}

export function ContentStyleSettings({
  onSettingsChange,
  defaultValues = {
    tone: 'friendly',
    perspective: 'first_person_plural',
    structure: 'informational'
  },
  className = ''
}: ContentStyleSettingsProps) {
  // Set up form with default values
  const form = useForm<ContentStyleFormValues>({
    resolver: zodResolver(contentStyleSchema),
    defaultValues: defaultValues as ContentStyleFormValues,
  });

  // When values change, notify parent component
  const onSubmit = (values: ContentStyleFormValues) => {
    onSettingsChange(values);
  };

  // Watch for changes to notify parent component
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.tone && value.perspective && value.structure) {
        onSettingsChange(value as ContentStyleFormValues);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, onSettingsChange]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Content Style Settings</CardTitle>
        <CardDescription>
          Customize how your content sounds and reads
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Tone Selection */}
            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {toneOptions.map((tone) => (
                        <SelectItem key={tone.id} value={tone.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{tone.name}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-2">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <p className="text-sm">{tone.description}</p>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How your content should sound to readers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Perspective Selection */}
            <FormField
              control={form.control}
              name="perspective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perspective</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select perspective" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {perspectiveOptions.map((perspective) => (
                        <SelectItem key={perspective.id} value={perspective.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{perspective.name}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-2">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <p className="text-sm">{perspective.description}</p>
                                <div className="mt-2 text-sm italic border-l-2 border-gray-200 pl-2">
                                  Example: "{perspective.example}"
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    The point of view used in your content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Structure Selection */}
            <FormField
              control={form.control}
              name="structure"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Structure</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {structureOptions.map((structure) => (
                        <SelectItem key={structure.id} value={structure.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{structure.name}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 ml-2">
                                  <Info className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <p className="text-sm">{structure.description}</p>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How your content is organized and presented
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}