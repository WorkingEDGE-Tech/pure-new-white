import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, FileDown, Users, GraduationCap, Calendar, TrendingUp, Printer, User, BookOpen } from 'lucide-react';
import { studentService, attendanceService, gradeService, examService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';

export const ReportsModule = () => {
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studentReportType, setStudentReportType] = useState<'all' | 'individual'>('all');
  
  const { toast } = useToast();

  const reportTypes = [
    { id: 'class-attendance', name: 'Class Attendance Report', icon: Users, description: 'Attendance report for entire class' },
    { id: 'student-attendance', name: 'Student Attendance Report', icon: User, description: 'Individual student attendance' },
    { id: 'class-marks', name: 'Class Exam Marks Report', icon: GraduationCap, description: 'Exam marks for entire class' },
    { id: 'student-marks', name: 'Student Marks Report', icon: BookOpen, description: 'Individual student exam marks' },
    { id: 'monthly-summary', name: 'Monthly Summary', icon: Calendar, description: 'Monthly attendance and performance summary' },
  ];

  // Fetch data for dropdowns
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students'],
    queryFn: studentService.getAll,
  });

  const { data: classStudents = [] } = useQuery({
    queryKey: ['students', selectedClass, selectedSection],
    queryFn: () => selectedClass && selectedSection ? studentService.getByClass(selectedClass, selectedSection) : [],
    enabled: !!(selectedClass && selectedSection)
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['exams', selectedClass, selectedSection],
    queryFn: () => selectedClass && selectedSection ? examService.getByClassAndSection(selectedClass, selectedSection) : [],
    enabled: !!(selectedClass && selectedSection)
  });

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'Science', 'Commerce'];

  const generateReport = async () => {
    if (!selectedReport) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      let data = null;

      switch (selectedReport) {
        case 'class-attendance':
          if (!selectedClass || !selectedSection || !startDate || !endDate) {
            throw new Error('Please select class, section, start date and end date');
          }
          data = await generateClassAttendanceReport();
          break;

        case 'student-attendance':
          if (studentReportType === 'all') {
            if (!selectedClass || !selectedSection || !startDate || !endDate) {
              throw new Error('Please select class, section, start date and end date');
            }
            data = await generateClassAttendanceReport();
          } else {
            if (!selectedStudent || !startDate || !endDate) {
              throw new Error('Please select student, start date and end date');
            }
            data = await generateStudentAttendanceReport();
          }
          break;

        case 'class-marks':
          if (!selectedClass || !selectedSection || !selectedExam) {
            throw new Error('Please select class, section and exam');
          }
          data = await generateClassMarksReport();
          break;

        case 'student-marks':
          if (!selectedStudent) {
            throw new Error('Please select a student');
          }
          data = await generateStudentMarksReport();
          break;

        case 'monthly-summary':
          if (!selectedClass || !selectedSection) {
            throw new Error('Please select class and section');
          }
          data = await generateMonthlySummaryReport();
          break;
      }

      setReportData(data);
      toast({
        title: "Success",
        description: "Report generated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateClassAttendanceReport = async () => {
    const students = await studentService.getByClass(selectedClass, selectedSection);
    const attendanceData = [];

    for (const student of students) {
      const attendance = await attendanceService.getByStudent(student.id, startDate, endDate);
      const totalDays = attendance.length;
      const presentDays = attendance.filter(att => att.status === 'present' || att.status === 'late').length;
      const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

      attendanceData.push({
        student,
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        attendancePercentage,
        attendance
      });
    }

    return {
      type: 'class-attendance',
      title: `Class ${selectedClass}-${selectedSection} Attendance Report`,
      period: `${startDate} to ${endDate}`,
      data: attendanceData,
      summary: {
        totalStudents: students.length,
        averageAttendance: attendanceData.length > 0 
          ? (attendanceData.reduce((sum, item) => sum + parseFloat(item.attendancePercentage), 0) / attendanceData.length).toFixed(1)
          : '0'
      }
    };
  };

  const generateStudentAttendanceReport = async () => {
    const student = allStudents.find(s => s.id === selectedStudent);
    if (!student) throw new Error('Student not found');

    const attendance = await attendanceService.getByStudent(selectedStudent, startDate, endDate);
    const totalDays = attendance.length;
    const presentDays = attendance.filter(att => att.status === 'present' || att.status === 'late').length;
    const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : '0';

    return {
      type: 'student-attendance',
      title: `${student.first_name} ${student.last_name} Attendance Report`,
      period: `${startDate} to ${endDate}`,
      student,
      data: {
        totalDays,
        presentDays,
        absentDays: totalDays - presentDays,
        lateCount: attendance.filter(att => att.status === 'late').length,
        excusedCount: attendance.filter(att => att.status === 'excused').length,
        attendancePercentage,
        dailyAttendance: attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      }
    };
  };

  const generateClassMarksReport = async () => {
    const students = await studentService.getByClass(selectedClass, selectedSection);
    const grades = await gradeService.getByExam(selectedExam);
    const exam = exams.find(e => e.id === selectedExam);

    const studentsWithGrades = students.map(student => {
      const studentGrades = grades.filter(grade => grade.student_id === student.id);
      const totalMarks = studentGrades.reduce((sum, grade) => sum + (parseFloat(grade.marks_obtained) || 0), 0);
      const percentage = exam?.total_marks ? ((totalMarks / exam.total_marks) * 100).toFixed(1) : '0';

      return {
        student,
        grades: studentGrades,
        totalMarks,
        percentage,
        grade: getGrade(parseFloat(percentage))
      };
    });

    return {
      type: 'class-marks',
      title: `Class ${selectedClass}-${selectedSection} - ${exam?.name} Marks Report`,
      exam,
      data: studentsWithGrades,
      summary: {
        totalStudents: students.length,
        averageMarks: studentsWithGrades.length > 0 
          ? (studentsWithGrades.reduce((sum, item) => sum + item.totalMarks, 0) / studentsWithGrades.length).toFixed(1)
          : '0',
        highestMarks: Math.max(...studentsWithGrades.map(item => item.totalMarks)),
        lowestMarks: Math.min(...studentsWithGrades.map(item => item.totalMarks))
      }
    };
  };

  const generateStudentMarksReport = async () => {
    const student = allStudents.find(s => s.id === selectedStudent);
    if (!student) throw new Error('Student not found');

    const grades = await gradeService.getByStudent(selectedStudent);
    
    return {
      type: 'student-marks',
      title: `${student.first_name} ${student.last_name} Marks Report`,
      student,
      data: grades,
      summary: {
        totalExams: grades.length,
        averagePercentage: grades.length > 0 
          ? (grades.reduce((sum, grade) => {
              const percentage = grade.exams?.total_marks 
                ? ((parseFloat(grade.marks_obtained) / grade.exams.total_marks) * 100)
                : 0;
              return sum + percentage;
            }, 0) / grades.length).toFixed(1)
          : '0'
      }
    };
  };

  const generateMonthlySummaryReport = async () => {
    const currentDate = new Date();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const attendanceData = await generateClassAttendanceReport();
    const currentMonthExams = exams.filter(exam => {
      const examDate = new Date(exam.exam_date);
      const currentMonth = new Date();
      return examDate.getMonth() === currentMonth.getMonth() && examDate.getFullYear() === currentMonth.getFullYear();
    });

    return {
      type: 'monthly-summary',
      title: `Monthly Summary - Class ${selectedClass}-${selectedSection}`,
      period: `${firstDay} to ${lastDay}`,
      attendance: attendanceData,
      exams: currentMonthExams,
      summary: {
        totalStudents: attendanceData.summary.totalStudents,
        averageAttendance: attendanceData.summary.averageAttendance,
        examsHeld: currentMonthExams.length
      }
    };
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-green-100 text-green-800';
      case 'B+':
      case 'B':
        return 'bg-blue-100 text-blue-800';
      case 'C':
        return 'bg-yellow-100 text-yellow-800';
      case 'D':
        return 'bg-orange-100 text-orange-800';
      case 'F':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const printReport = () => {
    const printContent = document.getElementById('report-content');
    if (printContent) {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f5f5f5; }
                .header { text-align: center; margin-bottom: 30px; }
                .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
                @media print { button { display: none; } }
              </style>
            </head>
            <body>
              ${printContent.innerHTML}
            </body>
          </html>
        `);
        newWindow.document.close();
        newWindow.print();
      }
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    return (
      <div id="report-content" className="space-y-6">
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold">{reportData.title}</h2>
          <p className="text-gray-600 mt-2">{reportData.period}</p>
          <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleString()}</p>
        </div>

        {/* Attendance Reports */}
        {(reportData.type === 'class-attendance' || reportData.type === 'student-attendance') && (
          <div className="space-y-4">
            {reportData.type === 'class-attendance' && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Attendance</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.summary.averageAttendance}%</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Total Days</TableHead>
                      <TableHead>Present</TableHead>
                      <TableHead>Absent</TableHead>
                      <TableHead>Attendance %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.map((item: any) => (
                      <TableRow key={item.student.id}>
                        <TableCell>{item.student.first_name} {item.student.last_name}</TableCell>
                        <TableCell>{item.student.roll_number}</TableCell>
                        <TableCell>{item.totalDays}</TableCell>
                        <TableCell>{item.presentDays}</TableCell>
                        <TableCell>{item.absentDays}</TableCell>
                        <TableCell>
                          <Badge className={parseFloat(item.attendancePercentage) >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {item.attendancePercentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {reportData.type === 'student-attendance' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Total Days</p>
                      <p className="text-2xl font-bold">{reportData.data.totalDays}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Present</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.data.presentDays}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Absent</p>
                      <p className="text-2xl font-bold text-red-600">{reportData.data.absentDays}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">Attendance</p>
                      <p className="text-2xl font-bold text-blue-600">{reportData.data.attendancePercentage}%</p>
                    </CardContent>
                  </Card>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.dailyAttendance.map((attendance: any) => (
                      <TableRow key={attendance.date}>
                        <TableCell>{new Date(attendance.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={
                            attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                            attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                            attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {attendance.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{attendance.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        )}

        {/* Marks Reports */}
        {(reportData.type === 'class-marks' || reportData.type === 'student-marks') && (
          <div className="space-y-4">
            {reportData.type === 'class-marks' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Marks</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.summary.averageMarks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Highest Marks</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.summary.highestMarks}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Lowest Marks</p>
                    <p className="text-2xl font-bold text-red-600">{reportData.summary.lowestMarks}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.map((item: any) => (
                      <TableRow key={item.student.id}>
                        <TableCell>{item.student.first_name} {item.student.last_name}</TableCell>
                        <TableCell>{item.student.roll_number}</TableCell>
                        <TableCell>{item.totalMarks}/{reportData.exam?.total_marks}</TableCell>
                        <TableCell>{item.percentage}%</TableCell>
                        <TableCell>
                          <Badge className={getGradeColor(item.grade)}>
                            {item.grade}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {reportData.type === 'student-marks' && (
              <>
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Total Exams</p>
                    <p className="text-2xl font-bold">{reportData.summary.totalExams}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Percentage</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.summary.averagePercentage}%</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Marks Obtained</TableHead>
                      <TableHead>Total Marks</TableHead>
                      <TableHead>Percentage</TableHead>
                      <TableHead>Grade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.data.map((grade: any) => {
                      const percentage = grade.exams?.total_marks 
                        ? ((parseFloat(grade.marks_obtained) / grade.exams.total_marks) * 100).toFixed(1)
                        : '0';
                      const gradeValue = getGrade(parseFloat(percentage));
                      
                      return (
                        <TableRow key={grade.id}>
                          <TableCell>{grade.exams?.name}</TableCell>
                          <TableCell>{grade.exams?.subjects?.name}</TableCell>
                          <TableCell>{grade.marks_obtained}</TableCell>
                          <TableCell>{grade.exams?.total_marks}</TableCell>
                          <TableCell>{percentage}%</TableCell>
                          <TableCell>
                            <Badge className={getGradeColor(gradeValue)}>
                              {gradeValue}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
        )}

        {/* Monthly Summary */}
        {reportData.type === 'monthly-summary' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold">{reportData.summary.totalStudents}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Attendance</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.summary.averageAttendance}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Exams Held</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.examsHeld}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Attendance Summary</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Present Days</TableHead>
                    <TableHead>Absent Days</TableHead>
                    <TableHead>Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.attendance.data.map((item: any) => (
                    <TableRow key={item.student.id}>
                      <TableCell>{item.student.first_name} {item.student.last_name}</TableCell>
                      <TableCell>{item.presentDays}</TableCell>
                      <TableCell>{item.absentDays}</TableCell>
                      <TableCell>
                        <Badge className={parseFloat(item.attendancePercentage) >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {item.attendancePercentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {reportData.exams.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Exams This Month</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total Marks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.exams.map((exam: any) => (
                      <TableRow key={exam.id}>
                        <TableCell>{exam.name}</TableCell>
                        <TableCell>{exam.subjects?.name}</TableCell>
                        <TableCell>{new Date(exam.exam_date).toLocaleDateString()}</TableCell>
                        <TableCell>{exam.total_marks}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-2">Generate comprehensive attendance and academic reports</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Configuration */}
        <div className="lg:col-span-1">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Generate Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Report Type</Label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(selectedReport === 'class-attendance' || selectedReport === 'class-marks' || selectedReport === 'monthly-summary') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
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
                    <Label className="text-sm font-medium">Section</Label>
                    <Select value={selectedSection} onValueChange={setSelectedSection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section} value={section}>
                            {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(selectedReport === 'student-attendance' || selectedReport === 'student-marks') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {allStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} ({student.roll_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedReport === 'class-marks' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Exam</Label>
                  <Select value={selectedExam} onValueChange={setSelectedExam}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(selectedReport === 'class-attendance' || selectedReport === 'student-attendance') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Start Date</Label>
                    <Input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">End Date</Label>
                    <Input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                    />
                  </div>
                </>
              )}

              <Button 
                onClick={generateReport} 
                className="w-full transition-all duration-200 hover:scale-105"
                disabled={!selectedReport || isGenerating}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Reports */}
        <div className="lg:col-span-2">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Quick Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {reportTypes.map((report) => {
                  const Icon = report.icon;
                  return (
                    <div
                      key={report.id}
                      className="p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 hover:scale-105"
                      onClick={() => setSelectedReport(report.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-8 h-8 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{report.name}</h3>
                          <p className="text-sm text-gray-500">{report.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Display */}
      {reportData && (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Report Results</CardTitle>
            <Button 
              onClick={printReport} 
              variant="outline" 
              className="transition-all duration-200 hover:scale-105"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Report
            </Button>
          </CardHeader>
          <CardContent>
            {renderReportContent()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
