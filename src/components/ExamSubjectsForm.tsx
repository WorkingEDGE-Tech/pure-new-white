import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { subjectService, examSubjectService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';

interface ExamSubjectsFormProps {
  exam: any;
  onBack: () => void;
  onProceedToGrades: () => void;
}

export const ExamSubjectsForm = ({ exam, onBack, onProceedToGrades }: ExamSubjectsFormProps) => {
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: subjectService.getAll,
  });

  const { data: examSubjects = [] } = useQuery({
    queryKey: ['examSubjects', exam.id],
    queryFn: () => examSubjectService.getByExam(exam.id),
  });

  const addExamSubjectsMutation = useMutation({
    mutationFn: examSubjectService.createMultiple,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examSubjects'] });
      toast({
        title: "Success",
        description: "Subjects added to exam successfully",
      });
      setSelectedSubjects([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add subjects",
        variant: "destructive",
      });
    },
  });

  const addSubject = () => {
    setSelectedSubjects([...selectedSubjects, { subject_id: '', max_marks: 100 }]);
  };

  const updateSubject = (index: number, field: string, value: any) => {
    const updated = [...selectedSubjects];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedSubjects(updated);
  };

  const removeSubject = (index: number) => {
    setSelectedSubjects(selectedSubjects.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "Warning",
        description: "Please add at least one subject",
        variant: "destructive",
      });
      return;
    }

    const validSubjects = selectedSubjects.filter(s => s.subject_id && s.max_marks);
    if (validSubjects.length === 0) {
      toast({
        title: "Warning",
        description: "Please select subjects and enter valid marks",
        variant: "destructive",
      });
      return;
    }

    const examSubjectsData = validSubjects.map(subject => ({
      exam_id: exam.id,
      subject_id: subject.subject_id,
      max_marks: Number(subject.max_marks)
    }));

    addExamSubjectsMutation.mutate(examSubjectsData);
  };

  // Filter available subjects and ensure they have valid IDs
  const availableSubjects = subjects.filter(subject => 
    subject?.id && 
    typeof subject.id === 'string' && 
    subject.id.trim() !== '' && 
    subject?.name && 
    !examSubjects.some(es => es.subject_id === subject.id)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Configure Subjects for {exam.name}
            </div>
            <Badge>Class {exam.class} - {exam.section}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Existing Subjects */}
          {examSubjects.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Current Subjects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {examSubjects.map((examSubject: any) => (
                  <div key={examSubject.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{examSubject.subjects?.name || 'Unknown Subject'}</span>
                      {examSubject.subjects?.code && (
                        <span className="text-sm text-gray-500 ml-2">({examSubject.subjects.code})</span>
                      )}
                    </div>
                    <Badge variant="secondary">{examSubject.max_marks} marks</Badge>
                  </div>
                ))}
              </div>
              
              {examSubjects.length > 0 && (
                <div className="mt-4">
                  <Button onClick={onProceedToGrades} className="w-full">
                    Proceed to Grade Entry
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Add New Subjects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Add Subjects</h3>
              <Button onClick={addSubject} size="sm" disabled={availableSubjects.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </div>

            {availableSubjects.length === 0 && selectedSubjects.length === 0 && (
              <p className="text-sm text-gray-500 mb-3">
                All available subjects have been added to this exam.
              </p>
            )}

            {selectedSubjects.length > 0 && (
              <div className="space-y-3">
                {selectedSubjects.map((subject, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label>Subject</Label>
                      <Select 
                        value={subject.subject_id || ''} 
                        onValueChange={(value) => updateSubject(index, 'subject_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableSubjects.map((subj: any) => (
                            <SelectItem key={subj.id} value={subj.id}>
                              {subj.name} {subj.code ? `(${subj.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-32">
                      <Label>Max Marks</Label>
                      <Input
                        type="number"
                        value={subject.max_marks || ''}
                        onChange={(e) => updateSubject(index, 'max_marks', e.target.value)}
                        min="1"
                        placeholder="100"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeSubject(index)}
                      className="mt-6"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  onClick={handleSave} 
                  disabled={addExamSubjectsMutation.isPending}
                  className="w-full"
                >
                  {addExamSubjectsMutation.isPending ? 'Adding...' : 'Add Selected Subjects'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
