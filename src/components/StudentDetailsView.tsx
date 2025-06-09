
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, Award, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import { studentService, gradeService, attendanceService, feesService } from '@/services/database';
import { format } from 'date-fns';

interface StudentDetailsViewProps {
  studentId: string;
  onBack: () => void;
}

export const StudentDetailsView = ({ studentId, onBack }: StudentDetailsViewProps) => {
  const [student, setStudent] = useState<any>(null);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentDetails();
  }, [studentId]);

  const loadStudentDetails = async () => {
    try {
      setLoading(true);
      const [studentData, gradesData, attendanceData, feesData] = await Promise.all([
        studentService.getAll().then(students => students.find(s => s.id === studentId)),
        gradeService.getByStudent(studentId),
        attendanceService.getByStudent(studentId),
        feesService.getByStudent(studentId)
      ]);

      setStudent(studentData);
      setGrades(gradesData || []);
      setAttendance(attendanceData || []);
      setFees(feesData || []);
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAttendancePercentage = () => {
    if (attendance.length === 0) return 0;
    const presentDays = attendance.filter(record => record.status === 'present').length;
    return Math.round((presentDays / attendance.length) * 100);
  };

  const calculateAverageGrade = () => {
    if (grades.length === 0) return 'N/A';
    const numericGrades = grades.filter(grade => !isNaN(Number(grade.marks_obtained)));
    if (numericGrades.length === 0) return 'N/A';
    const average = numericGrades.reduce((sum, grade) => sum + Number(grade.marks_obtained), 0) / numericGrades.length;
    return average.toFixed(1);
  };

  const getTotalFeesDue = () => {
    return fees
      .filter(fee => fee.status === 'pending' || fee.status === 'partially_paid')
      .reduce((sum, fee) => sum + Number(fee.amount), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">Student not found</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Students
        </Button>
        <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
          {student.status}
        </Badge>
      </div>

      {/* Student Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <User className="w-5 h-5 mr-2" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-semibold text-xl">{student.first_name} {student.last_name}</h3>
              <p className="text-gray-600 dark:text-gray-400">Roll: {student.roll_number}</p>
              <p className="text-gray-600 dark:text-gray-400">Class: {student.class} - {student.section}</p>
              <p className="text-gray-600 dark:text-gray-400">
                DOB: {student.date_of_birth ? format(new Date(student.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{calculateAverageGrade()}</div>
              <p className="text-gray-600 dark:text-gray-400">Average Grade</p>
              <div className="mt-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">{grades.length} Exams</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{calculateAttendancePercentage()}%</div>
              <p className="text-gray-600 dark:text-gray-400">Attendance Rate</p>
              <div className="mt-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">{attendance.length} Days Recorded</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="w-5 h-5 mr-2" />
              Fees Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">₹{getTotalFeesDue()}</div>
              <p className="text-gray-600 dark:text-gray-400">Pending Dues</p>
              <div className="mt-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">{fees.length} Fee Records</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</label>
                <p className="font-semibold">{student.first_name} {student.last_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                <p>{student.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone</label>
                <p>{student.phone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Guardian</label>
                <p>{student.guardian_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Guardian Phone</label>
                <p>{student.guardian_phone || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Admission Date</label>
                <p>{student.admission_date ? format(new Date(student.admission_date), 'dd/MM/yyyy') : 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Address</label>
                <p>{student.address || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grade History</CardTitle>
            </CardHeader>
            <CardContent>
              {grades.length > 0 ? (
                <div className="space-y-3">
                  {grades.map((grade) => (
                    <div key={grade.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div>
                        <p className="font-medium">{grade.exams?.name || 'Exam'}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {grade.exams?.exam_date ? format(new Date(grade.exams.exam_date), 'dd/MM/yyyy') : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{grade.marks_obtained}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">/ {grade.exams?.total_marks || 100}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">No grades recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Record</CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {attendance.map((record) => (
                    <div key={record.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-slate-700 rounded">
                      <span>{format(new Date(record.date), 'dd/MM/yyyy')}</span>
                      <Badge variant={record.status === 'present' ? 'default' : record.status === 'absent' ? 'destructive' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">No attendance records yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Records</CardTitle>
            </CardHeader>
            <CardContent>
              {fees.length > 0 ? (
                <div className="space-y-3">
                  {fees.map((fee) => (
                    <div key={fee.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                      <div>
                        <p className="font-medium">{fee.fee_type}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Due: {format(new Date(fee.due_date), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">₹{fee.amount}</p>
                        <Badge variant={fee.status === 'paid' ? 'default' : fee.status === 'partially_paid' ? 'secondary' : 'destructive'}>
                          {fee.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400 py-8">No fee records yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
