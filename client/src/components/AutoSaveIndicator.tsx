import React from 'react';
import { useProject } from '../contexts/ProjectContext';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

export function AutoSaveIndicator() {
  const { isAutoSaving } = useProject();

  if (isAutoSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Clock className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span>Auto-saved</span>
    </div>
  );
}