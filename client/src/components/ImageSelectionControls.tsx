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
    <div className="absolute inset-0">
      {/* Primary/Secondary indicators - always visible */}
      <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
        {isPrimary && (
          <Badge className="bg-blue-600 text-white">
            <Star className="h-3 w-3 mr-1" />
            Primary
          </Badge>
        )}
        {isSecondary && (
          <Badge className="bg-green-600 text-white">
            <Plus className="h-3 w-3 mr-1" />
            Secondary
          </Badge>
        )}
      </div>

      {/* Preview button - always visible */}
      <Button 
        size="sm" 
        variant="outline"
        className="absolute top-2 right-2 z-20 h-8 w-8 p-0 rounded-full bg-white/90 hover:bg-white border-slate-300"
        onClick={(e) => {
          e.stopPropagation();
          onPreview(image);
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>

      {/* Action buttons - always visible at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 z-20 flex justify-center gap-2">
        <Button 
          size="sm" 
          className={`h-8 ${isPrimary ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSetPrimary(image);
          }}
        >
          <Star className="h-4 w-4 mr-1" />
          {isPrimary ? 'Primary' : 'Set Primary'}
        </Button>
        
        <Button 
          size="sm" 
          className={`h-8 ${isSecondary ? 'bg-green-600 hover:bg-green-700' : 'bg-white text-green-600 hover:bg-green-50'}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSecondary(image);
          }}
        >
          {isSecondary ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Secondary
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Add Secondary
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ImageSelectionControls;