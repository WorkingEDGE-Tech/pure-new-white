
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, GraduationCap, DollarSign, Calendar, Clock, Activity } from 'lucide-react';
import { studentService, attendanceService, feesService, activitiesService } from '@/services/database';
import { format } from 'date-fns';

export const Dashboard = () => {
  const [selectedDateRange, setSelectedDateRange] = useState('today');

  // Fetch recent activities
  const { data: recentActivities = [] } = useQuery({
    queryKey: ['activities'],
    queryFn: activitiesService.getAll,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch stats
  const { data: totalStudents = [] } = useQuery({
    queryKey: ['students'],
    queryFn: studentService.getAll
  });

  const { data: totalFees = [] } = useQuery({
    queryKey: ['fees'],
    queryFn: feesService.getAll
  });

  const todayDate = new Date().toISOString().split('T')[0];
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['attendance', todayDate],
    queryFn: () => attendanceService.getByDate(todayDate)
  });

  // Calculate stats
  const activeStudents = totalStudents.filter(student => student.status === 'active').length;
  const totalDues = totalFees
    .filter(fee => fee.status === 'pending' || fee.status === 'partially_paid')
    .reduce((sum, fee) => sum + Number(fee.amount), 0);
  const presentToday = todayAttendance.filter(att => att.status === 'present').length;
  const attendancePercentage = todayAttendance.length > 0 
    ? ((presentToday / todayAttendance.length) * 100).toFixed(1)
    : '0';

  const getActivityIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'students':
        return <Users className="w-4 h-4" />;
      case 'attendance':
        return <Calendar className="w-4 h-4" />;
      case 'grades':
        return <GraduationCap className="w-4 h-4" />;
      case 'fees':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (module: string) => {
    switch (module.toLowerCase()) {
      case 'students':
        return 'bg-blue-100 text-blue-800';
      case 'attendance':
        return 'bg-green-100 text-green-800';
      case 'grades':
        return 'bg-purple-100 text-purple-800';
      case 'fees':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your school management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeStudents}</div>
            <p className="text-xs text-muted-foreground">Active students</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendancePercentage}%</div>
            <p className="text-xs text-muted-foreground">{presentToday} of {todayAttendance.length} present</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dues</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalDues.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outstanding fees</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-200 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentActivities.length}</div>
            <p className="text-xs text-muted-foreground">Latest actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>No recent activities</p>
              <p className="text-sm">Start using the system to see activities here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0">
                    <Badge className={getActivityColor(activity.module)}>
                      {getActivityIcon(activity.module)}
                      <span className="ml-1">{activity.module}</span>
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    {activity.details && (
                      <p className="text-sm text-gray-500 truncate">{activity.details}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Users className="w-6 h-6" />
              <span>Add Student</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Calendar className="w-6 h-6" />
              <span>Mark Attendance</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <GraduationCap className="w-6 h-6" />
              <span>Enter Grades</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <BarChart3 className="w-6 h-6" />
              <span>View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
