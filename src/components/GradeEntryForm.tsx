import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Users } from 'lucide-react';
import { studentService, examService, gradeService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useClassRestrictions } from '@/hooks/useClassRestrictions';

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

interface GradeEntryFormProps {
  onBack: () => void;
}

export const GradeEntryForm = ({ onBack }: GradeEntryFormProps) => {
  const { trackActivity } = useActivityTracker();
  const { getAvailableClasses, getAvailableSections, canAccessClass, isRestricted } = useClassRestrictions();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [grades, setGrades] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const availableClasses = getAvailableClasses();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSection) {
      loadStudents();
    }
  }, [selectedClass, selectedSection]);

  useEffect(() => {
    if (selectedExam && students.length > 0) {
      loadExistingGrades();
    }
  }, [selectedExam, students]);

  const loadExams = async () => {
    try {
      const data = await examService.getAll();
      // Filter exams based on user's class assignments
      const filteredExams = data.filter((exam: any) => canAccessClass(exam.class, exam.section));
      setExams(filteredExams || []);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast({
        title: "Error",
        description: "Failed to load exams",
        variant: "destructive",
      });
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      if (!canAccessClass(selectedClass, selectedSection)) {
        toast({
          title: "Access Denied",
          description: "You don't have access to this class/section",
          variant: "destructive",
        });
        setStudents([]);
        return;
      }
      const data = await studentService.getByClass(selectedClass, selectedSection);
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExistingGrades = async () => {
    try {
      const data = await gradeService.getByExam(selectedExam);
      const existingGrades: {[key: string]: string} = {};
      
      data.forEach((grade: any) => {
        existingGrades[grade.student_id] = grade.marks_obtained || '';
      });
      
      setGrades(existingGrades);
    } catch (error) {
      console.error('Error loading existing grades:', error);
    }
  };

  const handleGradeChange = (studentId: string, value: string) => {
    // Allow only valid grade formats: numbers, letters, or combinations like "AB", "A+", etc.
    const validGradePattern = /^[0-9]*\.?[0-9]*$|^[A-F][+-]?$|^AB$|^$/;
    
    if (validGradePattern.test(value) || value === '') {
      setGrades(prev => ({
        ...prev,
        [studentId]: value
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, studentId: string) => {
    // Handle backspace properly
    if (e.key === 'Backspace') {
      const currentValue = grades[studentId] || '';
      if (currentValue.length > 0) {
        const newValue = currentValue.slice(0, -1);
        setGrades(prev => ({
          ...prev,
          [studentId]: newValue
        }));
      }
      e.preventDefault();
    }
  };

  const saveGrades = async () => {
    if (!selectedExam) {
      toast({
        title: "Error",
        description: "Please select an exam",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const gradesToSave = Object.entries(grades)
        .filter(([_, grade]) => grade.trim() !== '')
        .map(([studentId, grade]) => ({
          student_id: studentId,
          exam_id: selectedExam,
          marks_obtained: grade.trim(),
          exam_subject_id: null
        }));

      if (gradesToSave.length === 0) {
        toast({
          title: "Warning",
          description: "No grades to save",
          variant: "destructive",
        });
        return;
      }

      await gradeService.batchUpsert(gradesToSave);
      
      // Track activity
      const selectedExamData = exams.find(exam => exam.id === selectedExam);
      await trackActivity(
        'Grades Entered',
        `Grades entered for ${gradesToSave.length} students in ${selectedExamData?.name || 'exam'}`,
        'Grades'
      );
      
      toast({
        title: "Success",
        description: `Saved grades for ${gradesToSave.length} students`,
      });
      
      onBack();
    } catch (error) {
      console.error('Error saving grades:', error);
      toast({
        title: "Error",
        description: "Failed to save grades",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedExamData = exams.find(exam => exam.id === selectedExam);
  const filteredExams = exams.filter(exam => 
    !selectedClass || !selectedSection || 
    (exam.class === selectedClass && exam.section === selectedSection)
  );

  const availableSections = getAvailableSections(selectedClass);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Grades
        </Button>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            {students.length} Students
          </Badge>
          {isRestricted && (
            <Badge variant="secondary">
              Limited Access
            </Badge>
          )}
        </div>
      </div>

      {/* Selection Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Grade Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map(cls => (
                  <SelectItem key={cls} value={cls}>Class {cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger>
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {availableSections.map(section => (
                  <SelectItem key={section} value={section}>Section {section}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedExam} onValueChange={setSelectedExam}>
              <SelectTrigger>
                <SelectValue placeholder="Select Exam" />
              </SelectTrigger>
              <SelectContent>
                {filteredExams.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name} - {exam.subjects?.name || 'All Subjects'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedExamData && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Exam Details</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                Total Marks: {selectedExamData.total_marks} | 
                Date: {new Date(selectedExamData.exam_date).toLocaleDateString()} |
                Duration: {selectedExamData.duration_minutes} minutes
              </p>
              {selectedExamData.description && (
                <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                  {selectedExamData.description}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students Grade Entry */}
      {selectedClass && selectedSection && selectedExam && (
        <Card>
          <CardHeader>
            <CardTitle>Student Marks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading students...</p>
              </div>
            ) : students.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-4 py-2 border-b font-medium text-sm text-gray-600 dark:text-gray-400">
                  <div className="col-span-2">Roll No.</div>
                  <div className="col-span-6">Student Name</div>
                  <div className="col-span-4">Marks / Grade</div>
                </div>
                
                {students.map((student) => (
                  <div key={student.id} className="grid grid-cols-12 gap-4 py-2 items-center hover:bg-gray-50 dark:hover:bg-slate-800 rounded">
                    <div className="col-span-2 font-medium">
                      {student.roll_number}
                    </div>
                    <div className="col-span-6">
                      <div>
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Class {student.class} - {student.section}</p>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="text"
                        placeholder="Enter marks or grade"
                        value={grades[student.id] || ''}
                        onChange={(e) => handleGradeChange(student.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, student.id)}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-end pt-4 border-t">
                  <Button 
                    onClick={saveGrades} 
                    disabled={saving || Object.values(grades).every(grade => !grade.trim())}
                    className="transition-all duration-200 hover:scale-105"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Grades
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {!canAccessClass(selectedClass, selectedSection) 
                    ? "You don't have access to this class/section"
                    : "No students found for the selected class and section"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
