import { supabase } from '@/integrations/supabase/client';

// Student services
export const studentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByClass(classNumber: string, section: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('class', classNumber)
      .eq('section', section)
      .order('roll_number');
    if (error) throw error;
    return data;
  },

  async getAllowedStudents(assignedClasses: any[]) {
    if (assignedClasses.length === 0) {
      return [];
    }

    // Create OR conditions for each assigned class
    let query = supabase.from('students').select('*');
    
    const classConditions = assignedClasses.map(assignment => 
      `(class.eq.${assignment.class},section.eq.${assignment.section})`
    ).join(',');

    const { data, error } = await supabase
      .from('students')
      .select('*')
      .or(classConditions)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(student: any) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('students')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Subject services
export const subjectService = {
  async getAll() {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  }
};

// Class subjects services
export const classSubjectService = {
  async getByClass(classNumber: string, section: string) {
    const { data, error } = await supabase
      .from('class_subjects')
      .select(`
        *,
        subjects:subject_id (id, name, code)
      `)
      .eq('class', classNumber)
      .eq('section', section);
    if (error) throw error;
    return data;
  },

  async create(classSubject: any) {
    const { data, error } = await supabase
      .from('class_subjects')
      .insert(classSubject)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

// Exam services
export const examService = {
  async getAll() {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        subjects:subject_id (name, code)
      `)
      .order('exam_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByClassAndSection(classNumber: string, section: string) {
    const { data, error } = await supabase
      .from('exams')
      .select(`
        *,
        subjects:subject_id (name, code)
      `)
      .eq('class', classNumber)
      .eq('section', section)
      .order('exam_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(exam: any) {
    // Ensure all required fields are properly set
    const examData = {
      ...exam,
      grade_class: exam.class || exam.grade_class,
      class: exam.class,
      section: exam.section
    };
    
    const { data, error } = await supabase
      .from('exams')
      .insert(examData)
      .select(`
        *,
        subjects:subject_id (name, code)
      `)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    // Ensure all required fields are properly set
    const updateData = {
      ...updates,
      grade_class: updates.class || updates.grade_class,
      class: updates.class,
      section: updates.section
    };
    
    const { data, error } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        subjects:subject_id (name, code)
      `)
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Exam subjects services
export const examSubjectService = {
  async getByExam(examId: string) {
    const { data, error } = await supabase
      .from('exam_subjects')
      .select(`
        *,
        subjects:subject_id (name, code),
        exams:exam_id (name, class, section)
      `)
      .eq('exam_id', examId);
    if (error) throw error;
    return data;
  },

  async create(examSubject: any) {
    const { data, error } = await supabase
      .from('exam_subjects')
      .insert(examSubject)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createMultiple(examSubjects: any[]) {
    const { data, error } = await supabase
      .from('exam_subjects')
      .insert(examSubjects)
      .select();
    if (error) throw error;
    return data;
  }
};

// Grade services
export const gradeService = {
  async getByExam(examId: string) {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number),
        exams:exam_id (name, total_marks),
        exam_subjects:exam_subject_id (max_marks, subjects:subject_id (name))
      `)
      .eq('exam_id', examId);
    if (error) throw error;
    return data;
  },

  async getByStudent(studentId: string) {
    const { data, error } = await supabase
      .from('grades')
      .select(`
        *,
        exams:exam_id (name, total_marks, exam_date, subjects:subject_id (name))
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(grade: any) {
    const { data, error } = await supabase
      .from('grades')
      .insert(grade)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('grades')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsert(grade: any) {
    const { data, error } = await supabase
      .from('grades')
      .upsert(grade, { onConflict: 'student_id,exam_subject_id' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async batchUpsert(grades: any[]) {
    const { data, error } = await supabase
      .from('grades')
      .upsert(grades, { onConflict: 'student_id,exam_subject_id' })
      .select();
    if (error) throw error;
    return data;
  }
};

// Attendance services
export const attendanceService = {
  async getByDate(date: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .eq('date', date)
      .order('students(roll_number)');
    if (error) throw error;
    return data;
  },

  async getByDateAndClass(date: string, classNumber: string, section: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .eq('date', date)
      .eq('students.class', classNumber)
      .eq('students.section', section);
    if (error) throw error;
    return data;
  },

  async getByStudent(studentId: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async markAttendance(attendanceRecords: any[]) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(attendanceRecords, { onConflict: 'student_id,date' })
      .select();
    if (error) throw error;
    return data;
  },

  async getClassAttendanceStats(classNumber: string, section: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        status,
        students:student_id (class, section)
      `)
      .eq('students.class', classNumber)
      .eq('students.section', section)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;
    return data;
  }
};

export const feesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByStudent(studentId: string) {
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('student_id', studentId)
      .order('due_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getByClass(classNumber: string, section: string) {
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .eq('students.class', classNumber)
      .eq('students.section', section)
      .order('due_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async create(fee: any) {
    const { data, error } = await supabase
      .from('fees')
      .insert(fee)
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .single();
    if (error) throw error;
    return data;
  },

  async createMultiple(fees: any[]) {
    const { data, error } = await supabase
      .from('fees')
      .insert(fees)
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `);
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const { data, error } = await supabase
      .from('fees')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .single();
    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async recordPayment(paymentData: any) {
    // If it's a partial payment, update the original fee to reduce the amount
    if (paymentData.original_fee_id && paymentData.is_partial_payment) {
      const originalFee = await feesService.getById(paymentData.original_fee_id);
      if (originalFee) {
        const remainingAmount = Number(originalFee.amount) - Number(paymentData.payment_amount);
        
        // Update the original fee with the remaining amount
        await feesService.update(originalFee.id, {
          amount: remainingAmount,
          status: remainingAmount > 0 ? 'partially_paid' : 'paid'
        });
      }
    } else if (paymentData.original_fee_id) {
      // If it's a full payment, mark the original fee as paid
      await feesService.update(paymentData.original_fee_id, { status: 'paid' });
    }

    // Create a payment record
    const paymentRecord = {
      student_id: paymentData.student_id,
      fee_type: paymentData.fee_type,
      amount: paymentData.payment_amount,
      status: 'paid',
      academic_year: paymentData.academic_year,
      term: paymentData.term,
      due_date: paymentData.due_date,
      paid_date: new Date().toISOString().split('T')[0],
      remarks: paymentData.remarks || `Payment for ${paymentData.fee_type}`
    };

    // Insert the payment record
    const { data, error } = await supabase
      .from('fees')
      .insert(paymentRecord)
      .select(`
        *,
        students:student_id (first_name, last_name, roll_number, class, section)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getStats() {
    const { data, error } = await supabase
      .from('fees')
      .select('fee_type, amount, status');
    if (error) throw error;
    return data;
  },

  async getDuesByClass(classNumber: string, section: string) {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, first_name, last_name, roll_number')
      .eq('class', classNumber)
      .eq('section', section);
    
    if (studentsError) throw studentsError;
    
    const studentIds = students.map(student => student.id);
    
    if (studentIds.length === 0) {
      return [];
    }
    
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .select('*')
      .in('student_id', studentIds)
      .or('status.eq.pending,status.eq.partially_paid');
      
    if (feesError) throw feesError;
    
    // Merge student info with fees
    const result = students.map(student => {
      const studentFees = fees.filter(fee => fee.student_id === student.id);
      const totalDue = studentFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
      
      return {
        ...student,
        totalDue,
        fees: studentFees
      };
    });
    
    return result;
  }
};

export const chatService = {
  async getChannels() {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },

  async getMessages(channelId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async sendMessage(message: any) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createChannel(channel: any) {
    const { data, error } = await supabase
      .from('chat_channels')
      .insert(channel)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};

export const activitiesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  },

  async create(activity: { action: string; details?: string; module: string }) {
    const { data, error } = await supabase
      .from('activities')
      .insert(activity)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
