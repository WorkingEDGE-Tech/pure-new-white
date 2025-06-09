
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { classSubjectService, examSubjectService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';

interface ExamFormProps {
  exam?: any;
  onSubmit: (exam: any) => Promise<any> | void;
  onCancel: () => void;
}

export const ExamForm = ({ exam, onSubmit, onCancel }: ExamFormProps) => {
  const [formData, setFormData] = useState({
    name: exam?.name || '',
    class: exam?.class || '',
    section: exam?.section || '',
    exam_date: exam?.exam_date || '',
    duration_minutes: exam?.duration_minutes || 180,
    status: exam?.status || 'scheduled',
    description: exam?.description || ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get class subjects when class and section are selected
  const { data: classSubjects = [] } = useQuery({
    queryKey: ['classSubjects', formData.class, formData.section],
    queryFn: () => classSubjectService.getByClass(formData.class, formData.section),
    enabled: !!(formData.class && formData.section),
  });

  const createExamSubjectsMutation = useMutation({
    mutationFn: examSubjectService.createMultiple,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSubjects'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Ensure all required fields are set properly
      const examDataWithRequiredFields = {
        ...formData,
        grade_class: formData.class,
        class: formData.class,
        section: formData.section
      };
      
      // Create the exam first
      const examResult = await onSubmit(examDataWithRequiredFields);
      
      // If it's a new exam and we have class subjects, automatically create exam subjects
      if (!exam && examResult && classSubjects.length > 0) {
        const examSubjectsData = classSubjects.map((classSubject: any) => ({
          exam_id: examResult.id,
          subject_id: classSubject.subject_id,
          max_marks: 100 // Default to 100 marks per subject
        }));

        try {
          await createExamSubjectsMutation.mutateAsync(examSubjectsData);
          toast({
            title: "Success",
            description: `Exam created with ${classSubjects.length} subjects automatically added`,
          });
        } catch (error: any) {
          toast({
            title: "Warning",
            description: "Exam created but failed to add subjects automatically",
            variant: "destructive",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save exam",
        variant: "destructive",
      });
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  
  // Updated sections - only alphabets A-G
  const getSectionsForClass = (selectedClass: string) => {
    if (selectedClass === '11' || selectedClass === '12') {
      return [
        { value: 'A', label: 'A (Science)' },
        { value: 'B', label: 'B (Commerce)' },
        { value: 'C', label: 'C (Arts)' }
      ];
    }
    return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(section => ({ value: section, label: section }));
  };

  const availableSections = getSectionsForClass(formData.class);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-white dark:text-white">{exam ? 'Edit Exam' : 'Create New Exam'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-900 dark:text-white">Exam Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              placeholder="e.g., Mid-term Exam"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class" className="text-gray-900 dark:text-white">Class *</Label>
              <Select value={formData.class} onValueChange={(value) => handleChange('class', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Grade {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section" className="text-gray-900 dark:text-white">Section *</Label>
              <Select value={formData.section} onValueChange={(value) => handleChange('section', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {availableSections.map((section) => (
                    <SelectItem key={section.value} value={section.value}>
                      {section.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Show preview of subjects that will be added */}
          {classSubjects.length > 0 && !exam && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                Subjects to be added automatically:
              </h4>
              <div className="flex flex-wrap gap-2">
                {classSubjects.map((classSubject: any) => (
                  <span 
                    key={classSubject.id} 
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-xs rounded"
                  >
                    {classSubject.subjects?.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam_date" className="text-gray-900 dark:text-white">Exam Date *</Label>
              <Input
                id="exam_date"
                type="date"
                value={formData.exam_date}
                onChange={(e) => handleChange('exam_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-gray-900 dark:text-white">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration_minutes" className="text-gray-900 dark:text-white">Duration (minutes)</Label>
            <Input
              id="duration_minutes"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => handleChange('duration_minutes', Number(e.target.value))}
              min="30"
              step="30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 dark:text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Additional details about the exam..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {exam ? 'Update Exam' : 'Create Exam'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
