// Define all types and interfaces for the application

// User roles
export type Role = 'admin' | 'teacher' | 'student';

// User interface
export interface User {
  id: string;
  email: string;
  password?: string;
  role: Role;
  name: string;
  createdAt?: any;
}

// Student interface (extends User)
export interface Student extends User {
  studentId: string;
  major?: string;
  study?: string;
  group?: string;
}

// Lecture interface
export interface Lecture {
  id: string;
  title: string;
  subject: string;
  stage: string;
  pdfUrl: string;
  uploadedBy: string;
  uploadDate: string;
}

// Category interface
export interface Category {
  id: string;
  name: string;
  type: 'subject' | 'stage';
  createdAt: any;
}

// NFC Attendance Tracking Interfaces

// Attendance Record interface
export interface AttendanceRecord {
  id: string;
  lectureId: string;      // Reference to the lecture
  studentId: string;      // Reference to the student user
  timestamp: any;         // When attendance was recorded
  status: 'present' | 'absent' | 'late';
  recordedBy: string;     // Teacher who recorded the attendance
}

// NFC Tag interface
export interface NFCTag {
  id: string;
  tagId: string;          // Unique identifier from the NFC tag
  studentId: string;      // Associated student user ID
  isActive: boolean;      // Whether the tag is currently active
  assignedDate: any;
  lastUsed?: any;         // Last time the tag was scanned
}

// Attendance Session interface
export interface AttendanceSession {
  id: string;
  lectureId: string;      // Reference to the lecture
  teacherId: string;      // Teacher who created the session
  startTime: any;         // When the session started
  endTime?: any;          // When the session ended (or null if ongoing)
  isActive: boolean;      // Whether the session is currently active
  totalStudents: number;  // Total number of students expected
  presentCount: number;   // Number of students marked present
}

// Student Attendance Summary interface
export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
}