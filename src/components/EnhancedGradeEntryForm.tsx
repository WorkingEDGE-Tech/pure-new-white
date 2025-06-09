
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save } from 'lucide-react';
import { studentService, examSubjectService, gradeService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';

interface EnhancedGradeEntryFormProps {
  exam: any;
  onBack: () => void;
}

export const EnhancedGradeEntryForm = ({ exam, onBack }: EnhancedGradeEntryFormProps) => {
  const [grades, setGrades] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ['students', exam.class, exam.section],
    queryFn: () => studentService.getByClass(exam.class, exam.section),
  });

  const { data: examSubjects = [] } = useQuery({
    queryKey: ['examSubjects', exam.id],
    queryFn: () => examSubjectService.getByExam(exam.id),
  });

  const { data: existingGrades = [] } = useQuery({
    queryKey: ['grades', exam.id],
    queryFn: () => gradeService.getByExam(exam.id),
  });

  const saveGradesMutation = useMutation({
    mutationFn: gradeService.batchUpsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grades'] });
      toast({
        title: "Success",
        description: "Grades saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save grades",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (students.length > 0 && examSubjects.length > 0) {
      const gradeMatrix = students.map((student: any) => {
        const studentGrades: any = { studentId: student.id, grades: {} };
        
        examSubjects.forEach((examSubject: any) => {
          const existing = existingGrades.find((g: any) => 
            g.student_id === student.id && g.exam_subject_id === examSubject.id
          );
          studentGrades.grades[examSubject.id] = existing?.marks_obtained || '';
        });
        
        return studentGrades;
      });
      setGrades(gradeMatrix);
    }
  }, [students, examSubjects, existingGrades]);

  const validateMarks = (value: string): boolean => {
    if (value === '' || value === 'AB') return true;
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  };

  const getCellStyle = (value: string): string => {
    if (value === 'AB') return 'bg-yellow-100 text-yellow-800';
    if (value !== '' && !validateMarks(value)) return 'bg-red-100 text-red-800';
    return '';
  };

  const updateGrade = (studentId: string, examSubjectId: string, value: string) => {
    // Handle 'a' or 'A' conversion to 'AB'
    if (value.toLowerCase() === 'a') {
      value = 'AB';
    }

    setGrades(prev => prev.map(grade => 
      grade.studentId === studentId 
        ? { 
            ...grade, 
            grades: { 
              ...grade.grades, 
              [examSubjectId]: value 
            } 
          }
        : grade
    ));
  };

  const handleSave = () => {
    const gradeRecords: any[] = [];
    let hasInvalidData = false;
    
    grades.forEach((studentGrade) => {
      Object.entries(studentGrade.grades).forEach(([examSubjectId, marks]) => {
        if (marks !== '' && marks !== null && marks !== undefined) {
          if (!validateMarks(marks as string)) {
            hasInvalidData = true;
            return;
          }
          
          gradeRecords.push({
            student_id: studentGrade.studentId,
            exam_id: exam.id,
            exam_subject_id: examSubjectId,
            marks_obtained: marks as string
          });
        }
      });
    });

    if (hasInvalidData) {
      toast({
        title: "Invalid Data",
        description: "Please fix invalid marks (red cells) before saving",
        variant: "destructive",
      });
      return;
    }

    if (gradeRecords.length === 0) {
      toast({
        title: "Warning",
        description: "Please enter at least one grade before saving",
        variant: "destructive",
      });
      return;
    }

    saveGradesMutation.mutate(gradeRecords);
  };

  if (examSubjects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            Grade Entry - {exam.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-gray-500">
            No subjects found for this exam. Subjects should have been automatically added when the exam was created.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Grade Entry - {exam.name}
            </div>
            <div className="flex items-center gap-2">
              <Badge>Class {exam.class} - {exam.section}</Badge>
              <Button onClick={handleSave} disabled={saveGradesMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {saveGradesMutation.isPending ? 'Saving...' : 'Save Grades'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Instructions */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Enter marks between 0-100</li>
              <li>• Type 'a' or 'A' for absent (converts to 'AB')</li>
              <li>• Invalid entries are highlighted in red</li>
              <li>• Absent entries are highlighted in yellow</li>
            </ul>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-semibold min-w-[100px]">Roll No.</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold min-w-[200px]">Student Name</th>
                  {examSubjects.map((examSubject: any) => (
                    <th key={examSubject.id} className="border border-gray-300 p-3 text-center font-semibold min-w-[120px]">
                      {examSubject.subjects?.name || 'Unknown Subject'}
                      <br />
                      <span className="text-xs text-gray-500 font-normal">Max: {examSubject.max_marks}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student: any, index: number) => {
                  const studentGrade = grades.find(g => g.studentId === student.id);
                  return (
                    <tr key={student.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-3 font-medium">{student.roll_number}</td>
                      <td className="border border-gray-300 p-3">
                        {student.first_name} {student.last_name}
                      </td>
                      {examSubjects.map((examSubject: any) => {
                        const currentValue = studentGrade?.grades[examSubject.id] || '';
                        return (
                          <td key={examSubject.id} className="border border-gray-300 p-2">
                            <Input
                              type="text"
                              value={currentValue}
                              onChange={(e) => updateGrade(student.id, examSubject.id, e.target.value)}
                              className={`text-center ${getCellStyle(currentValue)}`}
                              placeholder="0 or AB"
                              onKeyPress={(e) => {
                                // Allow numbers, backspace, delete, tab, escape, enter, and 'a' or 'A'
                                if (!/[0-9aA]/.test(e.key) && 
                                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-4 text-sm text-gray-600">
            <p>Students: {students.length} | Subjects: {examSubjects.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
