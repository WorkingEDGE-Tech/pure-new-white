
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export const useClassFilter = () => {
  const { profile, assignedClasses, isAdmin } = useAuth();

  const availableClasses = useMemo(() => {
    if (isAdmin()) {
      // Admin can see all classes
      return [
        '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'
      ];
    }

    // Regular users only see their assigned classes
    return [...new Set(assignedClasses.map(assignment => assignment.class))];
  }, [assignedClasses, isAdmin]);

  const availableSections = useMemo(() => {
    return (className: string) => {
      if (isAdmin()) {
        // Admin can see all sections
        return ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      }

      // Regular users only see sections they're assigned to for this class
      return assignedClasses
        .filter(assignment => assignment.class === className)
        .map(assignment => assignment.section);
    };
  }, [assignedClasses, isAdmin]);

  const canAccessClass = useMemo(() => {
    return (className: string, section: string) => {
      if (isAdmin()) {
        return true;
      }

      return assignedClasses.some(
        assignment => assignment.class === className && assignment.section === section
      );
    };
  }, [assignedClasses, isAdmin]);

  return {
    availableClasses,
    availableSections,
    canAccessClass,
    isAdmin: isAdmin()
  };
};
