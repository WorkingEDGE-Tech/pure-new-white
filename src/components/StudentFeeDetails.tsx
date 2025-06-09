
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { feesService } from '@/services/database';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface StudentFeeDetailsProps {
  studentId: string;
  studentName: string;
  onRecordPayment: (feeId: string) => void;
}

export const StudentFeeDetails = ({ studentId, studentName, onRecordPayment }: StudentFeeDetailsProps) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  const { data: fees = [], isLoading } = useQuery({
    queryKey: ['studentFees', studentId],
    queryFn: () => feesService.getByStudent(studentId),
    enabled: !!studentId
  });

  const filteredFees = fees.filter(fee => {
    if (filter === 'all') return true;
    if (filter === 'pending') return fee.status === 'pending' || fee.status === 'partially_paid';
    if (filter === 'paid') return fee.status === 'paid';
    return true;
  });

  const totalDue = fees
    .filter(fee => fee.status === 'pending' || fee.status === 'partially_paid')
    .reduce((sum, fee) => sum + Number(fee.amount), 0);

  const totalPaid = fees
    .filter(fee => fee.status === 'paid')
    .reduce((sum, fee) => sum + Number(fee.amount), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-red-500">Pending</Badge>;
      case 'partially_paid':
        return <Badge className="bg-amber-500">Partially Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading student fee details...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>Fee Details for {studentName}</div>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant={filter === 'all' ? 'default' : 'outline'} 
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button 
              size="sm" 
              variant={filter === 'pending' ? 'default' : 'outline'} 
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button 
              size="sm" 
              variant={filter === 'paid' ? 'default' : 'outline'} 
              onClick={() => setFilter('paid')}
            >
              Paid
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between mb-4">
          <div>
            <span className="text-sm text-gray-500">Total Due:</span>
            <span className="text-lg font-semibold text-red-600 ml-2">₹{totalDue.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500">Total Paid:</span>
            <span className="text-lg font-semibold text-green-600 ml-2">₹{totalPaid.toLocaleString()}</span>
          </div>
        </div>

        {filteredFees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No {filter !== 'all' ? filter : ''} fee records found.
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Type</TableHead>
                  <TableHead>Term/Year</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFees.map(fee => (
                  <TableRow key={fee.id}>
                    <TableCell className="capitalize">{fee.fee_type}</TableCell>
                    <TableCell>{fee.term || fee.academic_year}</TableCell>
                    <TableCell>
                      {fee.due_date ? format(new Date(fee.due_date), 'MMM d, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>₹{Number(fee.amount).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(fee.status)}</TableCell>
                    <TableCell className="text-right">
                      {(fee.status === 'pending' || fee.status === 'partially_paid') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onRecordPayment(fee.id)}
                        >
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
