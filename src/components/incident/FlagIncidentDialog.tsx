import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFlagIncident } from '@/hooks/useApi';

const flagSchema = z.object({
  action: z.enum(['dispute', 'flag_false', 'flag_duplicate']),
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters').max(500, 'Reason must be less than 500 characters'),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
});

type FlagFormData = z.infer<typeof flagSchema>;

interface FlagIncidentDialogProps {
  incidentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionOptions = [
  { value: 'dispute', label: 'Dispute this report', description: 'I am the subject and believe this is inaccurate' },
  { value: 'flag_false', label: 'Report as false', description: 'This report contains false information' },
  { value: 'flag_duplicate', label: 'Report as duplicate', description: 'This is a duplicate of another report' },
];

export function FlagIncidentDialog({ incidentId, open, onOpenChange }: FlagIncidentDialogProps) {
  const { toast } = useToast();
  const flagMutation = useFlagIncident();

  const form = useForm<FlagFormData>({
    resolver: zodResolver(flagSchema),
    defaultValues: {
      action: 'dispute',
      reason: '',
      contactEmail: '',
    },
  });

  const onSubmit = async (data: FlagFormData) => {
    try {
      const result = await flagMutation.mutateAsync({
        incident_id: incidentId,
        action: data.action,
        reason: data.reason,
        contact_email: data.contactEmail || undefined,
      });

      toast({
        title: 'Report Submitted',
        description: result.message,
      });

      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an Issue</DialogTitle>
          <DialogDescription>
            If you believe this incident report is inaccurate or problematic, please let us know.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Issue</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {actionOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why you are reporting this..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={flagMutation.isPending}>
                {flagMutation.isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
