import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/database';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface FeeAddDueFormProps {
  onSubmit: (fees: any[]) => void;
  onCancel: () => void;
}

export const FeeAddDueForm = ({ onSubmit, onCancel }: FeeAddDueFormProps) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [applyToAllStudents, setApplyToAllStudents] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    fee_type: '',
    amount: '',
    due_date: '',
    academic_year: new Date().getFullYear().toString(),
    term: '',
    status: 'pending',
    remarks: ''
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', selectedClass, selectedSection],
    queryFn: () => {
      if (selectedClass && selectedSection) {
        return studentService.getByClass(selectedClass, selectedSection);
      }
      return [];
    },
    enabled: !!(selectedClass && selectedSection)
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const targetStudents = applyToAllStudents 
      ? students 
      : students.filter(student => selectedStudents.includes(student.id));
      
    if (targetStudents.length === 0) {
      return;
    }
    
    const feesToAdd = targetStudents.map(student => ({
      student_id: student.id,
      fee_type: formData.fee_type,
      amount: Number(formData.amount),
      due_date: formData.due_date,
      academic_year: formData.academic_year,
      term: formData.term,
      status: 'pending',
      remarks: formData.remarks
    }));
    
    onSubmit(feesToAdd);
  };
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const feeTypes = ['tuition', 'bus', 'canteen', 'miscellaneous', 'event', 'custom'];
  const terms = ['1st Term', '2nd Term', '3rd Term', 'Annual'];
  const academicYears = [
    (new Date().getFullYear() - 1).toString(),
    new Date().getFullYear().toString(),
    (new Date().getFullYear() + 1).toString()
  ];
  const CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Add New Fee Due</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Grade {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section *</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTIONS.map((section) => (
                    <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClass && selectedSection && students.length > 0 && (
            <div className="flex items-center space-x-2">
              <Switch 
                id="apply-all" 
                checked={applyToAllStudents} 
                onCheckedChange={setApplyToAllStudents}
              />
              <Label htmlFor="apply-all" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span>Apply to all students in this class/section</span>
              </Label>
            </div>
          )}

          {!applyToAllStudents && selectedClass && selectedSection && students.length > 0 && (
            <div className="border rounded-md max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => (
                    <TableRow 
                      key={student.id} 
                      className={selectedStudents.includes(student.id) ? "bg-blue-50" : ""}
                      onClick={() => toggleStudentSelection(student.id)}
                    >
                      <TableCell>
                        <input 
                          type="checkbox" 
                          checked={selectedStudents.includes(student.id)} 
                          onChange={() => toggleStudentSelection(student.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </TableCell>
                      <TableCell>{student.roll_number}</TableCell>
                      <TableCell>{student.first_name} {student.last_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fee_type">Fee Type *</Label>
              <Select value={formData.fee_type} onValueChange={(value) => handleChange('fee_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fee type" />
                </SelectTrigger>
                <SelectContent>
                  {feeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Select value={formData.academic_year} onValueChange={(value) => handleChange('academic_year', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Select value={formData.term} onValueChange={(value) => handleChange('term', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          {selectedClass && selectedSection && students.length === 0 && (
            <div className="p-4 border border-amber-200 bg-amber-50 rounded-md">
              <p className="text-amber-600">No students found in this class/section.</p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                !formData.fee_type || 
                !formData.amount || 
                !formData.due_date || 
                (students.length === 0) ||
                (!applyToAllStudents && selectedStudents.length === 0)
              }
            >
              Add Fee Due{applyToAllStudents ? ` for All ${students.length} Student(s)` : ` for ${selectedStudents.length} Selected Student(s)`}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
