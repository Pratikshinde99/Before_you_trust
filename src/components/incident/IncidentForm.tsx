import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Send } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { EntityType, IncidentCategory } from '@/types';

const formSchema = z.object({
  entityType: z.enum(['person', 'business', 'phone', 'website', 'service'] as const),
  entityName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  entityIdentifier: z.string().trim().min(2, 'Identifier must be at least 2 characters').max(255, 'Identifier must be less than 255 characters'),
  title: z.string().trim().min(10, 'Title must be at least 10 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().trim().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.enum(['fraud', 'scam', 'harassment', 'misrepresentation', 'non_delivery', 'quality_issue', 'safety_concern', 'data_breach', 'unauthorized_charges', 'other'] as const),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
  dateOccurred: z.string().min(1, 'Date is required'),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
});

type FormData = z.infer<typeof formSchema>;

const entityTypeOptions: { value: EntityType; label: string }[] = [
  { value: 'person', label: 'Person' },
  { value: 'business', label: 'Business' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'website', label: 'Website' },
  { value: 'service', label: 'Service' },
];

const categoryOptions: { value: IncidentCategory; label: string }[] = [
  { value: 'fraud', label: 'Fraud' },
  { value: 'scam', label: 'Scam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'misrepresentation', label: 'Misrepresentation' },
  { value: 'non_delivery', label: 'Non-Delivery' },
  { value: 'quality_issue', label: 'Quality Issue' },
  { value: 'safety_concern', label: 'Safety Concern' },
  { value: 'data_breach', label: 'Data Breach' },
  { value: 'unauthorized_charges', label: 'Unauthorized Charges' },
  { value: 'other', label: 'Other' },
];

const severityOptions = [
  { value: 'low', label: 'Low - Minor inconvenience' },
  { value: 'medium', label: 'Medium - Significant issue' },
  { value: 'high', label: 'High - Major harm or loss' },
  { value: 'critical', label: 'Critical - Severe damage or danger' },
];

export function IncidentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entityType: 'business',
      entityName: '',
      entityIdentifier: '',
      title: '',
      description: '',
      category: 'fraud',
      severity: 'medium',
      dateOccurred: '',
      location: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Report Submitted',
      description: 'Your incident report has been submitted for review. Thank you for helping keep our community safe.',
    });
    
    setIsSubmitting(false);
    navigate('/');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-primary" />
          <CardTitle>Report an Incident</CardTitle>
        </div>
        <CardDescription>
          Help others by reporting your experience. All submissions are anonymous and will be reviewed before publication.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Entity Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Who or what is this about?</h3>
              
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {entityTypeOptions.map(option => (
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
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="entityName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., QuickLoans Pro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="entityIdentifier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identifier</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone, website, address..." {...field} />
                      </FormControl>
                      <FormDescription>
                        Phone number, website URL, or other identifying info
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Incident Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">What happened?</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief summary of the incident" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide a detailed, factual account of what happened..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific and factual. Avoid assumptions or personal opinions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map(option => (
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
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Severity</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {severityOptions.map(option => (
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
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="dateOccurred"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>When did this occur?</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="City, State or Online" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Report
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
