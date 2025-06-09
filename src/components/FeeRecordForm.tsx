import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { studentService, feesService } from '@/services/database';

interface FeeRecordFormProps {
  onSubmit: (fee: any) => void;
  onCancel: () => void;
  existingFee?: any;
}

export const FeeRecordForm = ({ onSubmit, onCancel, existingFee }: FeeRecordFormProps) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [availableDues, setAvailableDues] = useState<any[]>([]);
  const [selectedDueId, setSelectedDueId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [formData, setFormData] = useState({
    student_id: '',
    student_name: '',
    fee_type: '',
    amount: '',
    payment_amount: '',
    due_date: '',
    academic_year: new Date().getFullYear().toString(),
    term: '',
    status: 'pending',
    remarks: '',
    original_fee_id: null,
    is_partial_payment: false
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

  const { data: studentFees = [], isLoading: isLoadingFees } = useQuery({
    queryKey: ['studentFees', selectedStudentId],
    queryFn: () => feesService.getByStudent(selectedStudentId),
    enabled: !!selectedStudentId
  });

  useEffect(() => {
    if (studentFees) {
      const pendingFees = studentFees.filter(fee => 
        fee.status === 'pending' || fee.status === 'partially_paid'
      );
      setAvailableDues(pendingFees);
    }
  }, [studentFees]);

  useEffect(() => {
    if (selectedDueId && availableDues.length > 0) {
      const selectedDue = availableDues.find(due => due.id === selectedDueId);
      if (selectedDue) {
        setFormData(prev => ({
          ...prev,
          fee_type: selectedDue.fee_type,
          amount: selectedDue.amount.toString(),
          payment_amount: selectedDue.amount.toString(),
          due_date: selectedDue.due_date,
          academic_year: selectedDue.academic_year,
          term: selectedDue.term || '',
          status: 'paid',
          original_fee_id: selectedDue.id,
          is_partial_payment: false
        }));
        setPaymentAmount(selectedDue.amount.toString());
      }
    }
  }, [selectedDueId, availableDues]);

  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        setFormData(prev => ({
          ...prev,
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
        }));
      }
    }
  }, [selectedStudentId, students]);

  const handlePaymentAmountChange = (value: string) => {
    setPaymentAmount(value);
    
    if (selectedDueId && availableDues.length > 0) {
      const selectedDue = availableDues.find(due => due.id === selectedDueId);
      if (selectedDue) {
        const dueAmount = Number(selectedDue.amount);
        const payAmount = Number(value);
        
        setFormData(prev => ({
          ...prev,
          payment_amount: value,
          is_partial_payment: payAmount < dueAmount,
          status: payAmount >= dueAmount ? 'paid' : 'partially_paid'
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentData = {
      ...formData,
      amount: Number(paymentAmount),
      payment_amount: Number(paymentAmount),
    };
    
    onSubmit(paymentData);
  };
  
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{existingFee ? 'Update Payment' : 'Record Fee Payment'}</CardTitle>
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

          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select 
              value={selectedStudentId} 
              onValueChange={setSelectedStudentId}
              disabled={!selectedClass || !selectedSection || students.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !selectedClass || !selectedSection 
                    ? "Select class and section first" 
                    : students.length === 0 
                    ? "No students found" 
                    : "Select student"
                } />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name} ({student.roll_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStudentId && (
            <div className="space-y-2">
              <Label htmlFor="due">Select Due to Pay *</Label>
              <Select 
                value={selectedDueId} 
                onValueChange={setSelectedDueId}
                disabled={isLoadingFees || availableDues.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isLoadingFees 
                      ? "Loading dues..." 
                      : availableDues.length === 0 
                      ? "No pending dues found" 
                      : "Select due to pay"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableDues.map((due) => (
                    <SelectItem key={due.id} value={due.id}>
                      {due.fee_type} - ₹{Number(due.amount).toLocaleString()} ({due.term || due.academic_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedDueId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => handlePaymentAmountChange(e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                {formData.is_partial_payment && (
                  <p className="text-sm text-amber-600">
                    This is a partial payment. The remaining amount will stay as due.
                  </p>
                )}
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
            </>
          )}

          {!selectedDueId && selectedStudentId && !isLoadingFees && availableDues.length === 0 && (
            <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
              <p className="text-blue-600">No pending dues found for this student. You can create a new due in the Fees Management page.</p>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedStudentId || !selectedDueId || !paymentAmount || Number(paymentAmount) <= 0}
            >
              Record Payment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
