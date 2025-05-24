import React from 'react';
import { Button } from './ui/button';
import { Check, Star, Plus, Eye } from 'lucide-react';
import { MediaImage } from './MediaSelectionStep';
import { Badge } from './ui/badge';

interface ImageSelectionControlsProps {
  image: MediaImage;
  isPrimary: boolean;
  isSecondary: boolean;
  onSetPrimary: (image: MediaImage) => void;
  onToggleSecondary: (image: MediaImage) => void;
  onPreview: (image: MediaImage) => void;
}

/**
 * Component for consistent image selection controls across the application
 */
const ImageSelectionControls: React.FC<ImageSelectionControlsProps> = ({
  image,
  isPrimary,
  isSecondary,
  onSetPrimary,
  onToggleSecondary,
  onPreview
}) => {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Selection indicator badges - always visible */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        {isPrimary && (
          <Badge variant="default" className="bg-blue-600 text-xs">
            <Star className="h-3 w-3 mr-1" />
            Primary
          </Badge>
        )}
        {isSecondary && (
          <Badge variant="default" className="bg-green-600 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Secondary
          </Badge>
        )}
      </div>
      
      {/* Quick actions - always visible */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {/* Preview button */}
        <Button 
          size="sm" 
          variant="secondary"
          className="p-1 h-7 w-7 rounded-full bg-white/90 hover:bg-white text-slate-600 hover:text-slate-700"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(image);
          }}
          title="Preview full image"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Selection buttons - always visible in a semi-transparent footer */}
      <div className="mt-auto w-full bg-black/50 p-2 flex justify-center gap-2">
        <Button 
          size="sm" 
          variant={isPrimary ? "default" : "outline"} 
          className={isPrimary 
            ? "bg-blue-600 hover:bg-blue-700 border-none h-7 text-xs" 
            : "bg-white/90 text-blue-600 hover:bg-blue-50 border-blue-200 h-7 text-xs"
          }
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary(image);
          }}
        >
          {isPrimary ? (
            <div className="flex items-center justify-center gap-1">
              <Check className="h-3 w-3" />
              <span>Primary</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <Star className="h-3 w-3" />
              <span>Set Primary</span>
            </div>
          )}
        </Button>
        
        <Button 
          size="sm" 
          variant={isSecondary ? "default" : "outline"} 
          className={isSecondary 
            ? "bg-green-600 hover:bg-green-700 border-none h-7 text-xs" 
            : "bg-white/90 text-green-600 hover:bg-green-50 border-green-200 h-7 text-xs"
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleSecondary(image);
          }}
        >
          {isSecondary ? (
            <div className="flex items-center justify-center gap-1">
              <Check className="h-3 w-3" />
              <span>Secondary</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <Plus className="h-3 w-3" />
              <span>Add Secondary</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ImageSelectionControls;