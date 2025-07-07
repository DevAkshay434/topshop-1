import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { BlogPost } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const rescheduleSchema = z.object({
  scheduledPublishDate: z.string().min(1, "Please select a date"),
  scheduledPublishTime: z.string().min(1, "Please select a time"),
});

type RescheduleForm = z.infer<typeof rescheduleSchema>;

interface RescheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: BlogPost | null;
  onSuccess?: () => void;
}

export function RescheduleModal({
  open,
  onOpenChange,
  post,
  onSuccess,
}: RescheduleModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RescheduleForm>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      scheduledPublishDate: post?.scheduledPublishDate || "",
      scheduledPublishTime: post?.scheduledPublishTime || "",
    },
  });

  // Update form when post changes
  useEffect(() => {
    if (post) {
      form.reset({
        scheduledPublishDate: post.scheduledPublishDate || "",
        scheduledPublishTime: post.scheduledPublishTime || "",
      });
    }
  }, [post, form]);

  const onSubmit = async (data: RescheduleForm) => {
    if (!post) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', `/api/posts/${post.id}/reschedule`, {
        scheduledPublishDate: data.scheduledPublishDate,
        scheduledPublishTime: data.scheduledPublishTime,
      });

      if (response.success) {
        toast({
          title: "Post Rescheduled",
          description: response.message || "The post has been rescheduled successfully.",
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        throw new Error(response.message || "Failed to reschedule post");
      }
    } catch (error) {
      console.error('Error rescheduling post:', error);
      toast({
        title: "Reschedule Failed",
        description: error instanceof Error ? error.message : "There was an error rescheduling the post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get today's date for minimum date validation
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reschedule Post</DialogTitle>
          <DialogDescription>
            Update the scheduled publication date and time for "{post?.title}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="scheduledPublishDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Publication Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={today}
                        placeholder="Select date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledPublishTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Publication Time
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        placeholder="Select time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {post?.scheduledPublishDate && post?.scheduledPublishTime && (
              <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">
                <p className="font-medium">Current Schedule:</p>
                <p>
                  {format(new Date(post.scheduledPublishDate), 'MMM d, yyyy')} at{' '}
                  {format(new Date(`2000-01-01T${post.scheduledPublishTime}`), 'h:mm a')}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rescheduling...
                  </>
                ) : (
                  "Reschedule Post"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}