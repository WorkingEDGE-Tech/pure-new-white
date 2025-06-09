import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Plus, Filter, FileText } from 'lucide-react';
import { FeeRecordForm } from './FeeRecordForm';
import { FeeAddDueForm } from './FeeAddDueForm';
import { StudentFeeDetails } from './StudentFeeDetails';
import { feesService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export const FeesModule = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [viewMode, setViewMode] = useState<'overview' | 'record-payment' | 'add-due' | 'student-details'>('overview');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState('');
  const [selectedFeeId, setSelectedFeeId] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['fees', filterClass, filterSection],
    queryFn: () => {
      if (filterClass && filterClass !== 'all' && filterSection && filterSection !== 'all') {
        return feesService.getByClass(filterClass, filterSection);
      }
      return feesService.getAll();
    },
  });

  const { data: allFees = [] } = useQuery({
    queryKey: ['allFees'],
    queryFn: feesService.getAll,
  });

  const { data: duesByClass = [], isLoading: isDuesLoading } = useQuery({
    queryKey: ['duesByClass', filterClass, filterSection],
    queryFn: () => {
      if (filterClass && filterSection) {
        return feesService.getDuesByClass(filterClass, filterSection);
      }
      return [];
    },
    enabled: !!(filterClass && filterSection && activeTab === 'students')
  });

  const createFeeMutation = useMutation({
    mutationFn: feesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['allFees'] });
      queryClient.invalidateQueries({ queryKey: ['duesByClass'] });
      queryClient.invalidateQueries({ queryKey: ['studentFees'] });
      setViewMode('overview');
      toast({
        title: "Success",
        description: "Fee record created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fee record",
        variant: "destructive",
      });
    },
  });

  const createMultipleFeeMutation = useMutation({
    mutationFn: feesService.createMultiple,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['allFees'] });
      queryClient.invalidateQueries({ queryKey: ['duesByClass'] });
      queryClient.invalidateQueries({ queryKey: ['studentFees'] });
      setViewMode('overview');
      toast({
        title: "Success",
        description: `Created ${data.length} fee records successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fee records",
        variant: "destructive",
      });
    },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: feesService.recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['allFees'] });
      queryClient.invalidateQueries({ queryKey: ['duesByClass'] });
      queryClient.invalidateQueries({ queryKey: ['studentFees'] });
      setViewMode('overview');
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const handlePaymentSubmit = (paymentData: any) => {
    recordPaymentMutation.mutate(paymentData);
  };

  const handleDueSubmit = (fees: any[]) => {
    createMultipleFeeMutation.mutate(fees);
  };

  const showStudentDetails = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setViewMode('student-details');
  };

  const handleRecordPaymentForFee = (feeId: string) => {
    setSelectedFeeId(feeId);
    setViewMode('record-payment');
  };

  // Calculate statistics from the actual fees data
  const calculateStats = () => {
    if (!allFees || allFees.length === 0) {
      return {
        totalCollected: 0,
        totalPending: 0,
        collectionRate: 0,
        thisMonth: 0,
        byCategory: {}
      };
    }

    const collected = allFees
      .filter(fee => fee.status === 'paid')
      .reduce((sum, fee) => sum + Number(fee.amount), 0);
    
    const pending = allFees
      .filter(fee => fee.status === 'pending' || fee.status === 'partially_paid')
      .reduce((sum, fee) => sum + Number(fee.amount), 0);
    
    const total = collected + pending;
    const collectionRate = total > 0 ? (collected / total) * 100 : 0;

    // Calculate this month's collections using created_at or paid_date
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    const thisMonthCollected = allFees
      .filter(fee => {
        if (fee.status !== 'paid') return false;
        const dateToCheck = fee.paid_date || fee.created_at;
        return dateToCheck && dateToCheck >= thisMonthStart && dateToCheck <= thisMonthEnd;
      })
      .reduce((sum, fee) => sum + Number(fee.amount), 0);

    // Calculate by category
    const byCategory = allFees.reduce((acc: any, fee) => {
      if (!acc[fee.fee_type]) {
        acc[fee.fee_type] = { collected: 0, pending: 0 };
      }
      if (fee.status === 'paid') {
        acc[fee.fee_type].collected += Number(fee.amount);
      } else {
        acc[fee.fee_type].pending += Number(fee.amount);
      }
      return acc;
    }, {});

    return {
      totalCollected: collected,
      totalPending: pending,
      collectionRate,
      thisMonth: thisMonthCollected,
      byCategory
    };
  };

  const stats = calculateStats();
  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'Science', 'Commerce'];

  const getRecentPayments = () => {
    return allFees
      .filter(fee => fee.status === 'paid')
      .sort((a, b) => {
        const dateA = new Date(b.paid_date || b.created_at || 0).getTime();
        const dateB = new Date(a.paid_date || a.created_at || 0).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  };

  if (viewMode === 'record-payment') {
    return (
      <div className="space-y-6">
        <FeeRecordForm
          onSubmit={handlePaymentSubmit}
          onCancel={() => setViewMode('overview')}
          existingFee={selectedFeeId ? { id: selectedFeeId } : undefined}
        />
      </div>
    );
  }

  if (viewMode === 'add-due') {
    return (
      <div className="space-y-6">
        <FeeAddDueForm
          onSubmit={handleDueSubmit}
          onCancel={() => setViewMode('overview')}
        />
      </div>
    );
  }

  if (viewMode === 'student-details') {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setViewMode('overview')} className="mb-4">
          &larr; Back to Fees Management
        </Button>
        <StudentFeeDetails
          studentId={selectedStudentId}
          studentName={selectedStudentName}
          onRecordPayment={handleRecordPaymentForFee}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fees Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track fee collections across different categories</p>
        </div>
        <div className="flex space-x-3">
          <Button 
            className="flex items-center space-x-2"
            variant="outline"
            onClick={() => setViewMode('add-due')}
          >
            <FileText className="w-4 h-4" />
            <span>Create Due</span>
          </Button>
          <Button 
            className="flex items-center space-x-2"
            onClick={() => setViewMode('record-payment')}
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {/* Fee Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Collected</p>
                    <p className="text-2xl font-bold text-green-600">₹{stats.totalCollected.toLocaleString()}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                    <p className="text-2xl font-bold text-red-600">₹{stats.totalPending.toLocaleString()}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Collection Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.collectionRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
                    <p className="text-2xl font-bold text-purple-600">₹{stats.thisMonth.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category-wise Breakdown */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Fee Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.byCategory).length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No fee data available. Start by recording some payments.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(stats.byCategory).map(([category, data]: [string, any]) => {
                    const total = data.collected + data.pending;
                    const percentage = total > 0 ? (data.collected / total) * 100 : 0;
                    const colors = {
                      tuition: 'bg-blue-500',
                      bus: 'bg-green-500',
                      canteen: 'bg-yellow-500',
                      miscellaneous: 'bg-purple-500',
                      event: 'bg-pink-500',
                      custom: 'bg-gray-500'
                    };
                    const color = colors[category as keyof typeof colors] || 'bg-gray-500';
                    
                    return (
                      <div key={category} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                        <div className="flex items-center space-x-4">
                          <div className={`w-4 h-4 ${color} rounded`} />
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{category}</h3>
                            <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 ${color} rounded-full`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Collected</p>
                            <p className="font-semibold text-green-600">₹{data.collected.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                            <p className="font-semibold text-red-600">₹{data.pending.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Rate</p>
                            <p className="font-semibold">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {getRecentPayments().length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No recent payments found.
                </div>
              ) : (
                <div className="space-y-3">
                  {getRecentPayments().map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded dark:border-gray-700">
                      <div>
                        <p className="font-medium">
                          {payment.students?.first_name} {payment.students?.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.fee_type} • {payment.paid_date || 'Recently'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold">₹{Number(payment.amount).toLocaleString()}</span>
                        <Badge variant="default">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="students">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <Filter className="w-4 h-4 text-gray-400" />
                <div className="flex space-x-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={filterClass} onValueChange={setFilterClass}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All" />
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
                    <Label>Section</Label>
                    <Select value={filterSection} onValueChange={setFilterSection}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="All" />
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
                  {filterClass && filterSection ? (
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

          {/* Students List with Dues */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Student Fee Status</CardTitle>
            </CardHeader>
            <CardContent>
              {!filterClass || !filterSection ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Please select a class and section to view student fee status.
                </div>
              ) : isDuesLoading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading student dues...
                </div>
              ) : duesByClass.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No students found in this class/section.
                </div>
              ) : (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Total Due</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duesByClass.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.roll_number}</TableCell>
                          <TableCell>{student.first_name} {student.last_name}</TableCell>
                          <TableCell>
                            <span className={`font-semibold ${student.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{student.totalDue.toLocaleString()}
                            </span>
                            <Badge 
                              className={`ml-2 ${student.totalDue > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                            >
                              {student.totalDue > 0 ? 'Due' : 'Paid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => showStudentDetails(student.id, `${student.first_name} ${student.last_name}`)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
