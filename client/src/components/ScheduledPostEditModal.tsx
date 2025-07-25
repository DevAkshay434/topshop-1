import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { BlogPost } from '@shared/schema';
import { Calendar, Clock, Loader2, Save, X } from 'lucide-react';

interface ScheduledPostEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
}

export default function ScheduledPostEditModal({
  open,
  onOpenChange,
  post
}: ScheduledPostEditModalProps) {
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize form values when post changes
  useEffect(() => {
    if (post) {
      setScheduleDate(post.scheduledPublishDate || '');
      setScheduleTime(post.scheduledPublishTime || '');
    }
  }, [post]);

  // Mutation to update scheduled time
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ postId, scheduleData }: { postId: number; scheduleData: any }) => {
      const response = await apiRequest({
        url: `/api/posts/${postId}/schedule`,
        method: 'PUT',
        data: scheduleData
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Schedule Updated",
        description: "The post schedule has been updated successfully.",
      });
      
      // Refresh scheduled posts list
      queryClient.invalidateQueries({ queryKey: ['/api/posts/scheduled'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Error updating schedule:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update post schedule",
        variant: "destructive",
      });
    }
  });

  const handleSave = () => {
    if (!post) return;
    
    if (!scheduleDate || !scheduleTime) {
      toast({
        title: "Validation Error",
        description: "Please select both date and time for scheduling",
        variant: "destructive",
      });
      return;
    }

    // Validate that the scheduled time is in the future
    // Create date object with proper timezone handling
    const selectedDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    const now = new Date();
    
    // Add a small buffer (2 minutes) to account for processing time
    const minScheduleTime = new Date(now.getTime() + 2 * 60 * 1000);
    
    if (selectedDateTime <= minScheduleTime) {
      toast({
        title: "Invalid Schedule Time",
        description: "Scheduled time must be at least 2 minutes in the future",
        variant: "destructive",
      });
      return;
    }

    updateScheduleMutation.mutate({
      postId: post.id,
      scheduleData: {
        scheduledPublishDate: scheduleDate,
        scheduledPublishTime: scheduleTime,
        status: 'scheduled'
      }
    });
  };

  const formatPostType = (contentType: string | null) => {
    return contentType === 'page' ? 'Page' : 'Post';
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1); // At least 1 minute in the future
    return now.toISOString().slice(0, 16);
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Edit Schedule
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Post Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 line-clamp-2">{post.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {formatPostType(post.contentType)} • {post.category || 'No category'}
            </p>
          </div>

          {/* Current Schedule */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 p-3 rounded-lg">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              Current schedule: {post.scheduledPublishDate} at {post.scheduledPublishTime}
            </span>
          </div>

          {/* New Schedule Form */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Set New Schedule</h4>
            
            {/* Schedule Date Input */}
            <div className="space-y-2">
              <Label htmlFor="scheduleDate">Schedule Date</Label>
              <Input
                id="scheduleDate"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            {/* Schedule Time Input */}
            <div className="space-y-2">
              <Label htmlFor="scheduleTime">Schedule Time</Label>
              <Input
                id="scheduleTime"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Preview */}
            {scheduleDate && scheduleTime && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>New schedule:</strong> {scheduleDate} at {scheduleTime}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-6 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateScheduleMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateScheduleMutation.isPending || !scheduleDate || !scheduleTime}
            className="min-w-[130px]"
          >
            {updateScheduleMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Schedule
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}