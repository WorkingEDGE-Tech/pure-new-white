import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, BookOpen, Calculator, Edit, Trash2, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExamForm } from './ExamForm';
import { EnhancedGradeEntryForm } from './EnhancedGradeEntryForm';
import { examService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { useClassRestrictions } from '@/hooks/useClassRestrictions';

export const GradesModule = () => {
  const [showExamForm, setShowExamForm] = useState(false);
  const [showGradeEntry, setShowGradeEntry] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAvailableClasses, getAvailableSections, canAccessClass, isRestricted } = useClassRestrictions();

  const availableClasses = getAvailableClasses();
  const availableSections = getAvailableSections(filterClass);

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams', filterClass, filterSection],
    queryFn: () => {
      if (filterClass && filterClass !== 'all' && filterSection && filterSection !== 'all') {
        return examService.getByClassAndSection(filterClass, filterSection);
      }
      return examService.getAll();
    },
  });

  // Filter exams based on user's class assignments
  const filteredExams = exams.filter(exam => 
    canAccessClass(exam.class, exam.section)
  );

  const createExamMutation = useMutation({
    mutationFn: examService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setShowExamForm(false);
      toast({
        title: "Success",
        description: "Exam created successfully with subjects automatically added",
      });
      return data; // Return the created exam data
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create exam",
        variant: "destructive",
      });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      examService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setShowExamForm(false);
      setEditingExam(null);
      toast({
        title: "Success",
        description: "Exam updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exam",
        variant: "destructive",
      });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: examService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast({
        title: "Success",
        description: "Exam deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exam",
        variant: "destructive",
      });
    },
  });

  const handleExamSubmit = async (examData: any) => {
    if (editingExam) {
      return await updateExamMutation.mutateAsync({ 
        id: editingExam.id, 
        updates: examData 
      });
    } else {
      return await createExamMutation.mutateAsync(examData);
    }
  };

  const handleEditExam = (exam: any) => {
    setEditingExam(exam);
    setShowExamForm(true);
  };

  const handleDeleteExam = (examId: string) => {
    if (confirm('Are you sure you want to delete this exam? This will also delete all associated grades.')) {
      deleteExamMutation.mutate(examId);
    }
  };

  const handleEnterGrades = (exam: any) => {
    setSelectedExam(exam);
    setShowGradeEntry(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'ongoing': return 'bg-blue-500';
      case 'scheduled': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (showExamForm) {
    return (
      <div className="space-y-6">
        <ExamForm
          exam={editingExam}
          onSubmit={handleExamSubmit}
          onCancel={() => {
            setShowExamForm(false);
            setEditingExam(null);
          }}
        />
      </div>
    );
  }

  if (showGradeEntry && selectedExam) {
    return (
      <EnhancedGradeEntryForm
        exam={selectedExam}
        onBack={() => {
          setShowGradeEntry(false);
          setSelectedExam(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Grades & Exams</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage exams and enter student grades with automatic subject mapping
            {isRestricted && (
              <span className="block text-sm text-blue-600 dark:text-blue-400 mt-1">
                • Access limited to your assigned classes
              </span>
            )}
          </p>
        </div>
        <Button 
          className="flex items-center space-x-2"
          onClick={() => setShowExamForm(true)}
        >
          <Plus className="w-4 h-4" />
          <span>Create Exam</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex space-x-4">
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">Class</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        Grade {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-900 dark:text-white">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(filterClass && filterClass !== 'all') || (filterSection && filterSection !== 'all') ? (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterClass('');
                    setFilterSection('');
                  }}
                  className="mt-7"
                >
                  Clear Filters
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Exams</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading exams...</div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {filterClass || filterSection 
                ? `No exams found for the selected class/section.`
                : isRestricted 
                  ? 'No exams found for your assigned classes.'
                  : 'No exams created yet. Create your first exam to get started with automatic subject mapping.'
              }
            </div>
          ) : (
            <div className="space-y-4">
              {filteredExams.map((exam: any) => (
                <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                     onClick={() => handleEnterGrades(exam)}>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{exam.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Class {exam.class} - {exam.section} • {new Date(exam.exam_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{exam.duration_minutes}m</p>
                    </div>
                    <Badge className={`text-white ${getStatusColor(exam.status)}`}>
                      {exam.status}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditExam(exam);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Exam
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEnterGrades(exam);
                        }}>
                          <Calculator className="w-4 h-4 mr-2" />
                          Enter Grades
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteExam(exam.id);
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
