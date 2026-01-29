import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Send, AlertTriangle } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSubmitIncident } from '@/hooks/useApi';
import { EntityType, IncidentCategory } from '@/types';

const formSchema = z.object({
  entityType: z.enum(['person', 'business', 'phone', 'website', 'service'] as const),
  entityName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  entityIdentifier: z.string().trim().min(2, 'Identifier must be at least 2 characters').max(255, 'Identifier must be less than 255 characters'),
  title: z.string().trim().min(10, 'Title must be at least 10 characters').max(200, 'Title must be less than 200 characters'),
  description: z.string().trim().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  whatWasPromised: z.string().max(1000, 'Must be less than 1000 characters').optional(),
  whatActuallyHappened: z.string().max(1000, 'Must be less than 1000 characters').optional(),
  category: z.enum(['fraud', 'scam', 'harassment', 'misrepresentation', 'non_delivery', 'quality_issue', 'safety_concern', 'data_breach', 'unauthorized_charges', 'other'] as const),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const),
  dateOccurred: z.string().min(1, 'Date is required'),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
});

type FormData = z.infer<typeof formSchema>;

const entityTypeOptions: { value: EntityType; label: string; placeholder: string }[] = [
  { value: 'person', label: 'Person', placeholder: 'Name, social handle, or other identifier' },
  { value: 'business', label: 'Business', placeholder: 'Website, registration number, or address' },
  { value: 'phone', label: 'Phone Number', placeholder: 'Phone number (e.g., +1-555-0123)' },
  { value: 'website', label: 'Website', placeholder: 'Full URL (e.g., example.com)' },
  { value: 'service', label: 'Service', placeholder: 'Service name, website, or app store link' },
];

const categoryOptions: { value: IncidentCategory; label: string; description: string }[] = [
  { value: 'fraud', label: 'Fraud', description: 'Intentional deception for financial gain' },
  { value: 'scam', label: 'Scam', description: 'Deceptive scheme to obtain money or data' },
  { value: 'harassment', label: 'Harassment', description: 'Unwanted, aggressive contact' },
  { value: 'misrepresentation', label: 'Misrepresentation', description: 'False or misleading claims' },
  { value: 'non_delivery', label: 'Non-Delivery', description: 'Goods/services not provided after payment' },
  { value: 'quality_issue', label: 'Quality Issue', description: 'Product/service significantly below expectations' },
  { value: 'safety_concern', label: 'Safety Concern', description: 'Health or safety risks' },
  { value: 'data_breach', label: 'Data Breach', description: 'Unauthorized access to personal data' },
  { value: 'unauthorized_charges', label: 'Unauthorized Charges', description: 'Charges made without consent' },
  { value: 'other', label: 'Other', description: 'Other incident type' },
];

const severityOptions = [
  { value: 'low', label: 'Low', description: 'Minor inconvenience, easily resolved' },
  { value: 'medium', label: 'Medium', description: 'Moderate impact, some difficulty resolving' },
  { value: 'high', label: 'High', description: 'Significant harm, financial loss, or difficulty' },
  { value: 'critical', label: 'Critical', description: 'Severe harm, major financial loss, or safety risk' },
];

interface IncidentFormProps {
  prefilledEntityId?: string;
  prefilledEntityName?: string;
  prefilledEntityType?: EntityType;
  prefilledEntityIdentifier?: string;
}

export function IncidentForm({
  prefilledEntityId,
  prefilledEntityName,
  prefilledEntityType,
  prefilledEntityIdentifier,
}: IncidentFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const submitMutation = useSubmitIncident();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entityType: prefilledEntityType || 'business',
      entityName: prefilledEntityName || '',
      entityIdentifier: prefilledEntityIdentifier || '',
      title: '',
      description: '',
      whatWasPromised: '',
      whatActuallyHappened: '',
      category: 'fraud',
      severity: 'medium',
      dateOccurred: '',
      location: '',
    },
  });

  const selectedEntityType = form.watch('entityType');
  const identifierPlaceholder = entityTypeOptions.find(e => e.value === selectedEntityType)?.placeholder || '';

  const onSubmit = async (data: FormData) => {
    try {
      const result = await submitMutation.mutateAsync({
        entity_id: prefilledEntityId,
        entity: prefilledEntityId ? undefined : {
          type: data.entityType,
          name: data.entityName,
          identifier: data.entityIdentifier,
        },
        title: data.title,
        description: data.description,
        what_was_promised: data.whatWasPromised || undefined,
        what_actually_happened: data.whatActuallyHappened || undefined,
        category: data.category,
        severity: data.severity,
        date_occurred: data.dateOccurred,
        location: data.location || undefined,
      });

      toast({
        title: 'Report Submitted',
        description: 'Your incident report has been submitted and is pending review.',
      });

      navigate(`/entity/${result.entity_id}`);
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Submit an Incident Report</CardTitle>
            <CardDescription>
              Help others by documenting your experience
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Please provide factual, accurate information. Reports are reviewed before publication. 
            False reports may be removed.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Entity Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Subject of Report
              </h3>
              
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={!!prefilledEntityId}
                    >
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
                        <Input 
                          placeholder="Name of person, business, or service" 
                          {...field} 
                          disabled={!!prefilledEntityId}
                        />
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
                        <Input 
                          placeholder={identifierPlaceholder} 
                          {...field} 
                          disabled={!!prefilledEntityId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Incident Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground uppercase tracking-wide">
                Incident Details
              </h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief, factual summary of the incident" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      A clear, objective title (10-200 characters)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide a detailed, factual account of what occurred..."
                        className="min-h-[120px] resize-y"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Include dates, amounts, and specific details. Avoid assumptions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="whatWasPromised"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What was promised? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe expectations or promises made..."
                          className="min-h-[80px] resize-y"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="whatActuallyHappened"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What actually happened? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the actual outcome..."
                          className="min-h-[80px] resize-y"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
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
                              <div>
                                <span>{option.label}</span>
                              </div>
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
                      <FormLabel>Date of Incident</FormLabel>
                      <FormControl>
                        <Input type="date" max={new Date().toISOString().split('T')[0]} {...field} />
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
                        <Input placeholder="City, State or 'Online'" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
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
