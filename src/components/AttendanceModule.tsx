
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, UserCheck, UserX, Clock, ArrowLeft } from 'lucide-react';
import { AttendanceForm } from './AttendanceForm';
import { attendanceService, studentService } from '@/services/database';

export const AttendanceModule = () => {
  const [showMarkAttendance, setShowMarkAttendance] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['attendance', today],
    queryFn: () => attendanceService.getByDate(today),
  });

  const { data: allStudents = [] } = useQuery({
    queryKey: ['students'],
    queryFn: studentService.getAll,
  });

  // Calculate today's stats
  const presentCount = todayAttendance.filter((att: any) => att.status === 'present').length;
  const absentCount = todayAttendance.filter((att: any) => att.status === 'absent').length;
  const lateCount = todayAttendance.filter((att: any) => att.status === 'late').length;
  const excusedCount = todayAttendance.filter((att: any) => att.status === 'excused').length;
  const totalStudents = allStudents.length;
  const attendanceRate = totalStudents > 0 ? ((presentCount + lateCount) / totalStudents * 100).toFixed(1) : '0';

  // Group by class for class-wise view
  const classwiseStats = todayAttendance.reduce((acc: any, attendance: any) => {
    const className = attendance.students?.grade_class;
    if (!className) return acc;
    
    if (!acc[className]) {
      acc[className] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    }
    
    acc[className][attendance.status]++;
    acc[className].total++;
    
    return acc;
  }, {});

  if (showMarkAttendance) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMarkAttendance(false)}
              className="md:hidden transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Mark Attendance</h1>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowMarkAttendance(false)}
            className="hidden md:flex transition-all duration-200 hover:scale-105"
          >
            Back to Overview
          </Button>
        </div>
        <AttendanceForm />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-2">Track student attendance and generate reports</p>
        </div>
        <Button 
          className="flex items-center space-x-2 w-full md:w-auto transition-all duration-200 hover:scale-105"
          onClick={() => setShowMarkAttendance(true)}
        >
          <UserCheck className="w-4 h-4" />
          <span>Mark Attendance</span>
        </Button>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card className="transition-all duration-200 hover:scale-105 animate-scale-in">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Present Today</p>
                <p className="text-xl md:text-2xl font-bold text-green-600">{presentCount}</p>
              </div>
              <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-200 hover:scale-105 animate-scale-in">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Absent</p>
                <p className="text-xl md:text-2xl font-bold text-red-600">{absentCount}</p>
              </div>
              <UserX className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-200 hover:scale-105 animate-scale-in">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Late</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-600">{lateCount}</p>
              </div>
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="transition-all duration-200 hover:scale-105 animate-scale-in">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600">Attendance Rate</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{attendanceRate}%</p>
              </div>
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class-wise Attendance */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Class-wise Attendance Today</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(classwiseStats).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No attendance data for today. Start by marking attendance for a class.
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {Object.entries(classwiseStats).map(([className, stats]: [string, any]) => (
                <div key={className} className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border rounded-lg space-y-3 md:space-y-0 transition-all duration-200 hover:scale-105">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm md:text-base">{className}</h3>
                    <p className="text-xs md:text-sm text-gray-500">Total Students: {stats.total}</p>
                  </div>
                  
                  <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        Present: {stats.present}
                      </Badge>
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        Absent: {stats.absent}
                      </Badge>
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        Late: {stats.late}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                        Excused: {stats.excused}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between md:justify-end space-x-4">
                      <div className="text-right">
                        <p className="text-xs md:text-sm text-gray-600">Attendance</p>
                        <p className="font-semibold text-green-600 text-sm md:text-base">
                          {((stats.present + stats.late) / stats.total * 100).toFixed(1)}%
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">
                        View Details
                      </Button>
                    </div>
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
