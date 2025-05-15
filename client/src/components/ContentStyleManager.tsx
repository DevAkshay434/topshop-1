import { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  genders as defaultGenders, 
  styles as defaultStyles, 
  tones as defaultTones,
  CopywritingGender,
  CopywritingStyle,
  CopywritingTone,
  getStylesByGender,
  getTonesByStyle
} from '@/lib/data/copywritingStyles';
import { ContentStyleSelector } from './ContentStyleSelector';

// Mock save function - in a real app, this would call an API
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
};

// Mock load function - in a real app, this would call an API
const loadFromLocalStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return defaultValue;
  }
};

export function ContentStyleManager() {
  // State for all data
  const [genders, setGenders] = useState<CopywritingGender[]>([]);
  const [styles, setStyles] = useState<CopywritingStyle[]>([]);
  const [tones, setTones] = useState<CopywritingTone[]>([]);
  
  // State for currently selected items
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  
  // State for new/edit items
  const [newGender, setNewGender] = useState<CopywritingGender>({ id: '', name: '' });
  const [newStyle, setNewStyle] = useState<CopywritingStyle>({ id: '', name: '', genderId: '' });
  const [newTone, setNewTone] = useState<CopywritingTone>({ id: '', name: '', styleId: '', displayName: '' });
  
  // Load data on mount
  useEffect(() => {
    const loadedGenders = loadFromLocalStorage('contentStyleGenders', defaultGenders);
    const loadedStyles = loadFromLocalStorage('contentStyleStyles', defaultStyles);
    const loadedTones = loadFromLocalStorage('contentStyleTones', defaultTones);
    
    setGenders(loadedGenders);
    setStyles(loadedStyles);
    setTones(loadedTones);
  }, []);
  
  // When gender selection changes, update styles list
  useEffect(() => {
    if (selectedGender) {
      setSelectedStyle('');
    }
  }, [selectedGender]);
  
  // Save functions
  const saveGender = () => {
    if (!newGender.name) return;
    
    // Create a valid ID from the name
    const id = newGender.id || `gender-${newGender.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    const updatedGender = { ...newGender, id };
    const updatedGenders = [...genders];
    
    // If editing, replace the existing gender
    const existingIndex = genders.findIndex(g => g.id === id);
    if (existingIndex >= 0) {
      updatedGenders[existingIndex] = updatedGender;
    } else {
      updatedGenders.push(updatedGender);
    }
    
    setGenders(updatedGenders);
    saveToLocalStorage('contentStyleGenders', updatedGenders);
    setNewGender({ id: '', name: '' });
  };
  
  const saveStyle = () => {
    if (!newStyle.name || !newStyle.genderId) return;
    
    // Create a valid ID from the name and gender
    const id = newStyle.id || `${newStyle.genderId}-${newStyle.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    const updatedStyle = { ...newStyle, id };
    const updatedStyles = [...styles];
    
    // If editing, replace the existing style
    const existingIndex = styles.findIndex(s => s.id === id);
    if (existingIndex >= 0) {
      updatedStyles[existingIndex] = updatedStyle;
    } else {
      updatedStyles.push(updatedStyle);
    }
    
    setStyles(updatedStyles);
    saveToLocalStorage('contentStyleStyles', updatedStyles);
    setNewStyle({ id: '', name: '', genderId: newStyle.genderId });
  };
  
  const saveTone = () => {
    if (!newTone.name || !newTone.styleId || !newTone.displayName) return;
    
    // Create a valid ID from the name and style
    const id = newTone.id || `${newTone.styleId}-${newTone.name.toLowerCase().replace(/\s+/g, '-')}`;
    
    const updatedTone = { ...newTone, id };
    const updatedTones = [...tones];
    
    // If editing, replace the existing tone
    const existingIndex = tones.findIndex(t => t.id === id);
    if (existingIndex >= 0) {
      updatedTones[existingIndex] = updatedTone;
    } else {
      updatedTones.push(updatedTone);
    }
    
    setTones(updatedTones);
    saveToLocalStorage('contentStyleTones', updatedTones);
    setNewTone({ id: '', name: '', styleId: newTone.styleId, displayName: '' });
  };
  
  // Edit functions
  const editGender = (gender: CopywritingGender) => {
    setNewGender({ ...gender });
  };
  
  const editStyle = (style: CopywritingStyle) => {
    setNewStyle({ ...style });
  };
  
  const editTone = (tone: CopywritingTone) => {
    setNewTone({ ...tone });
  };
  
  // Delete functions
  const deleteGender = (id: string) => {
    // Check if there are styles using this gender
    const relatedStyles = styles.filter(style => style.genderId === id);
    if (relatedStyles.length > 0) {
      alert('Cannot delete this gender as it has styles associated with it.');
      return;
    }
    
    const updatedGenders = genders.filter(gender => gender.id !== id);
    setGenders(updatedGenders);
    saveToLocalStorage('contentStyleGenders', updatedGenders);
  };
  
  const deleteStyle = (id: string) => {
    // Check if there are tones using this style
    const relatedTones = tones.filter(tone => tone.styleId === id);
    if (relatedTones.length > 0) {
      alert('Cannot delete this style as it has tones associated with it.');
      return;
    }
    
    const updatedStyles = styles.filter(style => style.id !== id);
    setStyles(updatedStyles);
    saveToLocalStorage('contentStyleStyles', updatedStyles);
  };
  
  const deleteTone = (id: string) => {
    const updatedTones = tones.filter(tone => tone.id !== id);
    setTones(updatedTones);
    saveToLocalStorage('contentStyleTones', updatedTones);
  };
  
  // Preview content style selection
  const [previewToneId, setPreviewToneId] = useState('');
  const [previewDisplayName, setPreviewDisplayName] = useState('');
  
  const handlePreviewSelection = (toneId: string, displayName: string) => {
    setPreviewToneId(toneId);
    setPreviewDisplayName(displayName);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Style Manager</CardTitle>
          <CardDescription>
            Configure gender, style, and tone combinations for content copywriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList className="mb-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="genders">Genders</TabsTrigger>
              <TabsTrigger value="styles">Styles</TabsTrigger>
              <TabsTrigger value="tones">Tones</TabsTrigger>
            </TabsList>
            
            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ContentStyleSelector 
                    onSelectionChange={handlePreviewSelection}
                  />
                </div>
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Selection Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {previewToneId ? (
                        <div className="space-y-2">
                          <p>Selected Tone ID: <code>{previewToneId}</code></p>
                          <p>Display Name: <strong>{previewDisplayName}</strong></p>
                          <p className="text-sm text-muted-foreground mt-4">
                            This name will be added to the content generation prompt.
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          Select a gender, style, and tone to see the preview.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            {/* Genders Tab */}
            <TabsContent value="genders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add/Edit Gender</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="gender-name">Name</Label>
                      <Input 
                        id="gender-name" 
                        value={newGender.name}
                        onChange={(e) => setNewGender({ ...newGender, name: e.target.value })}
                        placeholder="e.g., Male, Female, etc."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="gender-description">Description (Optional)</Label>
                      <Input 
                        id="gender-description" 
                        value={newGender.description || ''}
                        onChange={(e) => setNewGender({ ...newGender, description: e.target.value })}
                        placeholder="Short description of this gender orientation"
                      />
                    </div>
                    <Button onClick={saveGender}>
                      {newGender.id ? 'Update Gender' : 'Add Gender'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Genders</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {genders.map((gender) => (
                          <TableRow key={gender.id}>
                            <TableCell>{gender.name}</TableCell>
                            <TableCell>{gender.description || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => editGender(gender)}>
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteGender(gender.id)} className="text-destructive">
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Styles Tab */}
            <TabsContent value="styles" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add/Edit Style</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="style-gender">Gender</Label>
                      <select 
                        id="style-gender"
                        value={newStyle.genderId}
                        onChange={(e) => setNewStyle({ ...newStyle, genderId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Gender</option>
                        {genders.map((gender) => (
                          <option key={gender.id} value={gender.id}>{gender.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="style-name">Name</Label>
                      <Input 
                        id="style-name" 
                        value={newStyle.name}
                        onChange={(e) => setNewStyle({ ...newStyle, name: e.target.value })}
                        placeholder="e.g., Professional, Casual, etc."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="style-description">Description (Optional)</Label>
                      <Input 
                        id="style-description" 
                        value={newStyle.description || ''}
                        onChange={(e) => setNewStyle({ ...newStyle, description: e.target.value })}
                        placeholder="Short description of this style"
                      />
                    </div>
                    <Button onClick={saveStyle} disabled={!newStyle.genderId}>
                      {newStyle.id ? 'Update Style' : 'Add Style'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Styles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Label htmlFor="filter-gender">Filter by Gender</Label>
                    <select 
                      id="filter-gender"
                      value={selectedGender}
                      onChange={(e) => setSelectedGender(e.target.value)}
                      className="flex h-10 w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">All Genders</option>
                      {genders.map((gender) => (
                        <option key={gender.id} value={gender.id}>{gender.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Gender</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {styles
                          .filter(style => !selectedGender || style.genderId === selectedGender)
                          .map((style) => {
                            const gender = genders.find(g => g.id === style.genderId);
                            return (
                              <TableRow key={style.id}>
                                <TableCell>{style.name}</TableCell>
                                <TableCell>{gender?.name || style.genderId}</TableCell>
                                <TableCell>{style.description || '-'}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => editStyle(style)}>
                                    Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteStyle(style.id)} className="text-destructive">
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Tones Tab */}
            <TabsContent value="tones" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add/Edit Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tone-gender">Gender</Label>
                      <select 
                        id="tone-gender"
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select Gender</option>
                        {genders.map((gender) => (
                          <option key={gender.id} value={gender.id}>{gender.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tone-style">Style</Label>
                      <select 
                        id="tone-style"
                        value={newTone.styleId}
                        onChange={(e) => setNewTone({ ...newTone, styleId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!selectedGender}
                      >
                        <option value="">Select Style</option>
                        {styles
                          .filter(style => style.genderId === selectedGender)
                          .map((style) => (
                            <option key={style.id} value={style.id}>{style.name}</option>
                          ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tone-name">Name</Label>
                      <Input 
                        id="tone-name" 
                        value={newTone.name}
                        onChange={(e) => setNewTone({ ...newTone, name: e.target.value })}
                        placeholder="e.g., Authoritative, Friendly, etc."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tone-display-name">Display Name</Label>
                      <Input 
                        id="tone-display-name" 
                        value={newTone.displayName}
                        onChange={(e) => setNewTone({ ...newTone, displayName: e.target.value })}
                        placeholder="e.g., John Smith, Emma Johnson, etc."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tone-description">Description (Optional)</Label>
                      <Input 
                        id="tone-description" 
                        value={newTone.description || ''}
                        onChange={(e) => setNewTone({ ...newTone, description: e.target.value })}
                        placeholder="Short description of this tone"
                      />
                    </div>
                    <Button onClick={saveTone} disabled={!newTone.styleId}>
                      {newTone.id ? 'Update Tone' : 'Add Tone'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Tones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="filter-gender-tones">Filter by Gender</Label>
                      <select 
                        id="filter-gender-tones"
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="flex h-10 w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">All Genders</option>
                        {genders.map((gender) => (
                          <option key={gender.id} value={gender.id}>{gender.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="filter-style">Filter by Style</Label>
                      <select 
                        id="filter-style"
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="flex h-10 w-full mt-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!selectedGender}
                      >
                        <option value="">All Styles</option>
                        {styles
                          .filter(style => !selectedGender || style.genderId === selectedGender)
                          .map((style) => (
                            <option key={style.id} value={style.id}>{style.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Style</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tones
                          .filter(tone => {
                            const style = styles.find(s => s.id === tone.styleId);
                            return (
                              (!selectedStyle || tone.styleId === selectedStyle) &&
                              (!selectedGender || style?.genderId === selectedGender)
                            );
                          })
                          .map((tone) => {
                            const style = styles.find(s => s.id === tone.styleId);
                            return (
                              <TableRow key={tone.id}>
                                <TableCell>{tone.name}</TableCell>
                                <TableCell>{style?.name || tone.styleId}</TableCell>
                                <TableCell>{tone.displayName}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm" onClick={() => editTone(tone)}>
                                    Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteTone(tone.id)} className="text-destructive">
                                    Delete
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}