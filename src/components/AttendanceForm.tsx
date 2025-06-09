import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { studentService, attendanceService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { useActivityTracker } from '@/hooks/useActivityTracker';

export const AttendanceForm = ({ onBack }: { onBack?: () => void }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const {
    data: students = []
  } = useQuery({
    queryKey: ['students', selectedClass, selectedSection],
    queryFn: () => selectedClass && selectedSection ? studentService.getByClass(selectedClass, selectedSection) : [],
    enabled: !!(selectedClass && selectedSection)
  });
  const {
    data: existingAttendance = []
  } = useQuery({
    queryKey: ['attendance', selectedDate, selectedClass, selectedSection],
    queryFn: () => attendanceService.getByDateAndClass(selectedDate, selectedClass, selectedSection),
    enabled: !!(selectedDate && selectedClass && selectedSection)
  });
  const { trackActivity } = useActivityTracker();
  const markAttendanceMutation = useMutation({
    mutationFn: attendanceService.markAttendance,
    onSuccess: async () => {
      queryClient.invalidateQueries({
        queryKey: ['attendance']
      });
      
      // Track activity
      await trackActivity(
        'Attendance Marked',
        `Attendance marked for Class ${selectedClass}-${selectedSection} on ${selectedDate}`,
        'Attendance'
      );
      
      toast({
        title: "Success",
        description: "Attendance marked successfully"
      });
      
      if (onBack) {
        onBack();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance",
        variant: "destructive"
      });
    }
  });
  useEffect(() => {
    if (students.length > 0) {
      const records = students.map((student: any) => {
        const existing = existingAttendance.find((att: any) => att.student_id === student.id);
        return {
          student_id: student.id,
          date: selectedDate,
          status: existing?.status || 'present',
          remarks: existing?.remarks || ''
        };
      });
      setAttendanceRecords(records);
    }
  }, [students, existingAttendance, selectedDate]);
  const updateAttendanceRecord = (studentId: string, field: string, value: string) => {
    setAttendanceRecords(prev => prev.map(record => record.student_id === studentId ? {
      ...record,
      [field]: value
    } : record));
  };
  const handleSubmit = () => {
    if (attendanceRecords.length === 0) {
      toast({
        title: "Error",
        description: "Please select a class, section and date first",
        variant: "destructive"
      });
      return;
    }
    markAttendanceMutation.mutate(attendanceRecords);
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <UserCheck className="w-4 h-4 text-green-600" />;
      case 'absent':
        return <UserX className="w-4 h-4 text-red-600" />;
      case 'late':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'excused':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <UserCheck className="w-4 h-4 text-gray-600" />;
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Define valid classes and sections with proper validation
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  return <div className="space-y-4 md:space-y-6 animate-fade-in">
      <Card className="transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Input id="date" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class" className="text-sm font-medium">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => <SelectItem key={cls} value={cls}>
                      Grade {cls}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section" className="text-sm font-medium">Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => <SelectItem key={section} value={section}>
                      {section}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedSection && students.length > 0 && <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-base md:text-lg">
              Attendance for Class {selectedClass} - {selectedSection} - {new Date(selectedDate).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 md:space-y-3">
              {students.map((student: any, index: number) => {
            const record = attendanceRecords.find(r => r.student_id === student.id);
            return <div key={student.id} className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg space-y-3 md:space-y-0 transition-all duration-200 ">
                    <div className="flex items-center space-x-3">
                      <span className="w-6 md:w-8 text-sm text-gray-500 font-medium">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{student.first_name} {student.last_name}</p>
                        <p className="text-xs md:text-sm text-gray-500">{student.roll_number}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                      <div className="flex justify-center md:justify-start space-x-1 md:space-x-2">
                        {['present', 'absent', 'late', 'excused'].map(status => <button key={status} onClick={() => updateAttendanceRecord(student.id, 'status', status)} className={`p-2 rounded-lg border transition-all duration-200 hover:scale-110 ${record?.status === status ? getStatusColor(status) : 'bg-gray-50 hover:bg-gray-100'}`} title={status.charAt(0).toUpperCase() + status.slice(1)}>
                            {getStatusIcon(status)}
                          </button>)}
                      </div>
                      <Badge className={`${getStatusColor(record?.status || 'present')} text-xs md:text-sm self-center md:self-auto`}>
                        {record?.status || 'present'}
                      </Badge>
                    </div>
                  </div>;
          })}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSubmit} disabled={markAttendanceMutation.isPending} className="w-full md:w-auto transition-all duration-200 hover:scale-105">
                {markAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>}

      {selectedClass && selectedSection && students.length === 0 && <div className="text-center py-8 text-gray-500 animate-fade-in">
          No students found in the selected class and section.
        </div>}

      {(!selectedClass || !selectedSection) && <div className="text-center py-8 text-gray-500 animate-fade-in">
          Please select both class and section to view students.
        </div>}
    </div>;
};
