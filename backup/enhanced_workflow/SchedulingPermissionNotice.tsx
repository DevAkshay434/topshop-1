import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SchedulingPermissionNoticeProps {
  storeName: string;
}

export function SchedulingPermissionNotice({ storeName }: SchedulingPermissionNoticeProps) {
  return (
    <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Permission Required</AlertTitle>
      <AlertDescription>
        Content scheduling requires additional permissions for {storeName}. The content will be saved as a draft instead.
      </AlertDescription>
    </Alert>
  );
}