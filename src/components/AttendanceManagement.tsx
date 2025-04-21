import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Lecture, AttendanceSession, AttendanceRecord } from '../types';
import NFCScanner from './NFCScanner';
import { FileText, Users, Clock, Download, CheckSquare, X } from 'lucide-react';

// Helper functions for date/time formatting
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Unknown';
  
  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

const formatTime = (timestamp: any) => {
  if (!timestamp) return 'Unknown';
  
  try {
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleTimeString();
    } else if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleTimeString();
    }
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

interface AttendanceManagementProps {
  currentUser: User;
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ currentUser }) => {
  // State for lectures and sessions
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLecture, setSelectedLecture] = useState<string>('');
  const [activeSessions, setActiveSessions] = useState<AttendanceSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  
  // State for attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'create' | 'active' | 'history'>('create');

  // Fetch lectures for the current teacher
  useEffect(() => {
    const fetchLectures = async () => {
      if (!currentUser || currentUser.role !== 'teacher') return;
      
      setIsLoading(true);
      try {
        const lecturesQuery = query(
          collection(db, 'lectures'),
          where('uploadedBy', '==', currentUser.id),
          orderBy('uploadDate', 'desc')
        );
        
        const lecturesSnapshot = await getDocs(lecturesQuery);
        const lecturesList = lecturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lecture[];
        
        setLectures(lecturesList);
      } catch (error) {
        console.error('Error fetching lectures:', error);
        setMessage('Failed to load lectures');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLectures();
  }, [currentUser]);

  // Fetch active sessions for the current teacher
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'teacher') return;
    
    const sessionsQuery = query(
      collection(db, 'attendanceSessions'),
      where('teacherId', '==', currentUser.id),
      where('isActive', '==', true)
    );
    
    const unsubscribe = onSnapshot(sessionsQuery, (snapshot) => {
      const sessionsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceSession[];
      
      setActiveSessions(sessionsList);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Fetch students for attendance tracking
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student')
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        setStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    
    fetchStudents();
  }, []);

  // Fetch attendance records when a session is selected
  useEffect(() => {
    if (!currentSession) return;
    
    const recordsQuery = query(
      collection(db, 'attendanceRecords'),
      where('lectureId', '==', currentSession.lectureId)
    );
    
    const unsubscribe = onSnapshot(recordsQuery, (snapshot) => {
      const recordsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      
      setAttendanceRecords(recordsList);
    });
    
    return () => unsubscribe();
  }, [currentSession]);

  // Create a new attendance session
  const createAttendanceSession = async () => {
    if (!currentUser) {
      setMessage('User information not available');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if there's already an active session for this teacher
      const existingSessionQuery = query(
        collection(db, 'attendanceSessions'),
        where('teacherId', '==', currentUser.id),
        where('isActive', '==', true)
      );
      
      const existingSessionSnapshot = await getDocs(existingSessionQuery);
      
      if (!existingSessionSnapshot.empty) {
        setMessage('You already have an active attendance session');
        return;
      }
      
      // Create new session without requiring lecture selection
      const newSession: Omit<AttendanceSession, 'id'> = {
        lectureId: selectedLecture || 'direct-attendance-session', // Use default if no lecture selected
        teacherId: currentUser.id,
        startTime: serverTimestamp(),
        isActive: true,
        totalStudents: students.length,
        presentCount: 0
      };
      
      const sessionRef = await addDoc(collection(db, 'attendanceSessions'), newSession);
      
      setMessage('Attendance session started successfully');
      setActiveTab('active');
    } catch (error) {
      console.error('Error creating attendance session:', error);
      setMessage('Failed to create attendance session');
    } finally {
      setIsLoading(false);
    }
  };

  // End an active attendance session
  const endAttendanceSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this attendance session?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'attendanceSessions', sessionId), {
        isActive: false,
        endTime: serverTimestamp()
      });
      
      setMessage('Attendance session ended');
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Error ending attendance session:', error);
      setMessage('Failed to end attendance session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle NFC scan completion
  const handleScanComplete = (studentName: string) => {
    setMessage(`${studentName} marked present`);
    // In a real app, you might want to update the UI to show the student is present
  };

  // Handle NFC scan error
  const handleScanError = (error: string) => {
    setMessage(error);
  };

  // Mark student attendance manually
  const markAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!currentSession) {
      setMessage('No active session selected');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if attendance already recorded
      const existingRecordQuery = query(
        collection(db, 'attendanceRecords'),
        where('lectureId', '==', currentSession.lectureId),
        where('studentId', '==', studentId)
      );
      
      const existingRecordSnapshot = await getDocs(existingRecordQuery);
      
      if (!existingRecordSnapshot.empty) {
        // Update existing record
        const recordId = existingRecordSnapshot.docs[0].id;
        await updateDoc(doc(db, 'attendanceRecords', recordId), {
          status,
          timestamp: serverTimestamp()
        });
      } else {
        // Create new record
        const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
          lectureId: currentSession.lectureId,
          studentId,
          timestamp: serverTimestamp(),
          status,
          recordedBy: currentUser.id
        };
        
        await addDoc(collection(db, 'attendanceRecords'), attendanceRecord);
        
        // Update session's present count if marking as present
        if (status === 'present') {
          await updateDoc(doc(db, 'attendanceSessions', currentSession.id), {
            presentCount: currentSession.presentCount + 1
          });
        }
      }
      
      const student = students.find(s => s.id === studentId);
      setMessage(`${student?.name || 'Student'} marked ${status}`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      setMessage('Failed to mark attendance');
    } finally {
      setIsLoading(false);
    }
  };

  // Export attendance to Excel
  const exportToExcel = () => {
    if (!currentSession) {
      setMessage('No session selected for export');
      return;
    }
    
    // In a real implementation, this would generate an Excel file
    // For this example, we'll just show a message
    setMessage('Export functionality would be implemented here');
    
    // The actual implementation would use a library like xlsx
    // to generate and download an Excel file with attendance data
  };

  // Get student attendance status
  const getStudentAttendanceStatus = (studentId: string) => {
    if (!attendanceRecords.length) return 'Not recorded';
    
    const record = attendanceRecords.find(r => r.studentId === studentId);
    return record ? record.status : 'Not recorded';
  };

  // Render the create session tab
  const renderCreateSessionTab = () => (
    <div className="create-session-tab">
      <h3>Create Attendance Session</h3>
      
      <div className="form-group">
        <label htmlFor="lecture-select">Select Lecture (Optional)</label>
        <select
          id="lecture-select"
          className="input-field"
          value={selectedLecture}
          onChange={(e) => setSelectedLecture(e.target.value)}
        >
          <option value="">-- No lecture selected --</option>
          {lectures.map(lecture => (
            <option key={lecture.id} value={lecture.id}>
              {lecture.title} ({lecture.subject}, {lecture.stage})
            </option>
          ))}
        </select>
      </div>
      
      <button
        className="btn-primary"
        onClick={createAttendanceSession}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="loading-spinner"></span>
        ) : (
          <>Start Attendance Session</>
        )}
      </button>
    </div>
  );

  // Render the active sessions tab
  const renderActiveSessionsTab = () => (
    <div className="active-sessions-tab">
      <h3>Active Attendance Sessions</h3>
      
      {activeSessions.length === 0 ? (
        <p>No active attendance sessions</p>
      ) : (
        <div className="sessions-list">
          {activeSessions.map(session => {
            // Find the lecture details
            const lecture = lectures.find(l => l.id === session.lectureId);
            
            return (
              <div key={session.id} className="session-card">
                <div className="session-header">
                  <h4>{lecture?.title || 'Unknown Lecture'}</h4>
                  <div className="session-meta">
                    <span className="session-subject">{lecture?.subject}</span>
                    <span className="session-stage">{lecture?.stage}</span>
                  </div>
                </div>
                
                <div className="session-stats">
                  <div className="stat">
                    <Users size={18} />
                    <span>{session.presentCount}/{session.totalStudents} Present</span>
                  </div>
                  <div className="stat">
                    <Clock size={18} />
                    <span>Started: {session.startTime?.toDate?.().toLocaleTimeString() || 'Unknown'}</span>
                  </div>
                </div>
                
                <div className="session-actions">
                  <button
                    className="btn-primary"
                    onClick={() => setCurrentSession(session)}
                  >
                    Manage Attendance
                  </button>
                  
                  <button
                    className="btn-secondary"
                    onClick={() => endAttendanceSession(session.id)}
                  >
                    End Session
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // Render the attendance history tab
  const renderAttendanceHistoryTab = () => (
    <div className="attendance-history-tab">
      <h3>Attendance History</h3>
      <p>Attendance history will be displayed here</p>
      {/* This would be implemented in a real application */}
    </div>
  );

  // Render the attendance management interface for a selected session
  const renderAttendanceManagement = () => {
    if (!currentSession) return null;
    
    // Find the lecture details
    const lecture = lectures.find(l => l.id === currentSession.lectureId);
    
    return (
      <div className="attendance-management">
        <div className="attendance-header">
          <button className="btn-secondary" onClick={() => setCurrentSession(null)}>
            Back to Sessions
          </button>
          
          <h3>{lecture?.title || 'Unknown Lecture'}</h3>
          
          <div className="attendance-actions">
            <button className="btn-primary" onClick={exportToExcel}>
              <Download size={18} /> Export to Excel
            </button>
          </div>
        </div>
        
        <div className="attendance-scanner">
          <h4>NFC Scanner</h4>
          <NFCScanner
            sessionId={currentSession.id}
            onScanComplete={handleScanComplete}
            onError={handleScanError}
          />
        </div>
        
        <div className="attendance-list">
          <h4>Student Attendance</h4>
          <div className="attendance-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const status = getStudentAttendanceStatus(student.id);
                  
                  return (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>
                        <span className={`status-badge status-${status.toLowerCase()}`}>
                          {status}
                        </span>
                      </td>
                      <td>
                        <div className="attendance-buttons">
                          <button
                            className="btn-small btn-present"
                            onClick={() => markAttendance(student.id, 'present')}
                          >
                            Present
                          </button>
                          <button
                            className="btn-small btn-absent"
                            onClick={() => markAttendance(student.id, 'absent')}
                          >
                            Absent
                          </button>
                          <button
                            className="btn-small btn-late"
                            onClick={() => markAttendance(student.id, 'late')}
                          >
                            Late
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // If user is not a teacher, show error
  if (currentUser.role !== 'teacher') {
    return (
      <div className="error-message">
        <p>Only teachers can access attendance management</p>
      </div>
    );
  }

  return (
    <div className="attendance-management">
      <h2 className="section-title">Attendance Management</h2>
      
      <div className="attendance-tabs">
        <div
          className={`attendance-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <Clock size={18} />
          Create Session
        </div>
        <div
          className={`attendance-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <CheckSquare size={18} />
          Active Sessions
        </div>
        <div
          className={`attendance-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <FileText size={18} />
          History
        </div>
      </div>
      
      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
          <button className="close-btn" onClick={() => setMessage('')}>×</button>
        </div>
      )}
      
      {activeTab === 'create' && (
        <div className="card">
          <h3 className="card-title">Create New Attendance Session</h3>
          <div className="form-group">
            <label htmlFor="lectureSelect">Select Lecture (Optional)</label>
            <select
              id="lectureSelect"
              value={selectedLecture}
              onChange={(e) => setSelectedLecture(e.target.value)}
              className="input-field"
            >
              <option value="">-- No lecture selected --</option>
              {lectures.map(lecture => (
                <option key={lecture.id} value={lecture.id}>
                  {lecture.title} ({lecture.subject} - {lecture.stage})
                </option>
              ))}
            </select>
          </div>
          
          <button 
            className="btn-primary w-full"
            onClick={createAttendanceSession}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>Start Attendance Session</>
            )}
          </button>
        </div>
      )}
      
      {activeTab === 'active' && (
        <div className="active-sessions">
          {activeSessions.length === 0 ? (
            <div className="empty-state">
              <Clock size={48} />
              <p>No active sessions found</p>
              <button 
                className="btn-primary"
                onClick={() => setActiveTab('create')}
              >
                Create New Session
              </button>
            </div>
          ) : (
            <div className="sessions-list">
              {activeSessions.map(session => {
                const lecture = lectures.find(l => l.id === session.lectureId);
                return (
                  <div key={session.id} className="attendance-session-card">
                    <div className="session-header">
                      <div className="session-title">{lecture ? lecture.title : 'Unknown Lecture'}</div>
                      <div className="session-status status-active">Active</div>
                    </div>
                    
                    <div className="session-details">
                      {lecture && (
                        <div className="session-detail">
                          <FileText size={16} />
                          <span>{lecture.subject} - {lecture.stage}</span>
                        </div>
                      )}
                      <div className="session-detail">
                        <Clock size={16} />
                        <span>Started: {formatDate(session.startTime)}</span>
                      </div>
                    </div>
                    
                    <div className="attendance-stats">
                      <div className="stat-box">
                        <div className="stat-value">{session.presentCount}</div>
                        <div className="stat-label">Present</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-value">{session.totalStudents - session.presentCount}</div>
                        <div className="stat-label">Absent</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-value">
                          {session.totalStudents > 0 
                            ? Math.round((session.presentCount / session.totalStudents) * 100) 
                            : 0}%
                        </div>
                        <div className="stat-label">Attendance Rate</div>
                      </div>
                    </div>
                    
                    <div className="attendance-actions">
                      <button 
                        className="btn-primary"
                        onClick={() => setCurrentSession(session)}
                      >
                        Take Attendance
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => endAttendanceSession(session.id)}
                      >
                        End Session
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'history' && (
        <div className="card">
          <h3 className="card-title">Attendance History</h3>
          <p className="text-center text-muted">Coming soon...</p>
        </div>
      )}
      
      {currentSession && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Take Attendance</h3>
              <button 
                className="btn-icon"
                onClick={() => setCurrentSession(null)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <NFCScanner 
                sessionId={currentSession.id}
                onScanComplete={handleScanComplete}
                onError={(error) => setMessage(error)}
              />
              
              <div className="attendance-records">
                <h4>Attendance Records</h4>
                
                {attendanceRecords.length === 0 ? (
                  <div className="empty-state small">
                    <p>No records yet. Scan student NFC tags to mark attendance.</p>
                  </div>
                ) : (
                  <div className="records-list">
                    {attendanceRecords.map(record => {
                      const student = students.find(s => s.id === record.studentId);
                      return (
                        <div key={record.id} className="record-item">
                          <div className="student-avatar">
                            {student ? student.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className="record-info">
                            <div className="student-name">{student ? student.name : 'Unknown Student'}</div>
                            <div className="record-time">{formatTime(record.timestamp)}</div>
                          </div>
                          <div className={`record-status status-${record.status}`}>{record.status}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;