
import { useAuth } from '@/contexts/AuthContext';

export const useClassRestrictions = () => {
  const { profile, assignedClasses, isAdmin } = useAuth();

  const getAvailableClasses = () => {
    // Admin or users with no assigned classes have access to all classes
    if (isAdmin() || assignedClasses.length === 0) {
      return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    }
    
    // Return only assigned classes, removing duplicates
    const uniqueClasses = [...new Set(assignedClasses.map(assignment => assignment.class))];
    return uniqueClasses.sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getAvailableSections = (selectedClass?: string) => {
    // Admin or users with no assigned classes have access to all sections
    if (isAdmin() || assignedClasses.length === 0) {
      return ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    }
    
    // If no class is selected, return all possible sections from assignments
    if (!selectedClass) {
      const uniqueSections = [...new Set(assignedClasses.map(assignment => assignment.section))];
      return uniqueSections.sort();
    }
    
    // Return sections for the specific class
    const sectionsForClass = assignedClasses
      .filter(assignment => assignment.class === selectedClass)
      .map(assignment => assignment.section);
    
    return [...new Set(sectionsForClass)].sort();
  };

  const canAccessClass = (className: string, section?: string) => {
    // Admin or users with no assigned classes can access everything
    if (isAdmin() || assignedClasses.length === 0) {
      return true;
    }
    
    // Check if user has access to this specific class/section combination
    if (section) {
      return assignedClasses.some(assignment => 
        assignment.class === className && assignment.section === section
      );
    }
    
    // Check if user has access to this class (any section)
    return assignedClasses.some(assignment => assignment.class === className);
  };

  const isRestricted = !isAdmin() && assignedClasses.length > 0;

  return {
    getAvailableClasses,
    getAvailableSections,
    canAccessClass,
    isRestricted,
    assignedClasses
  };
};
