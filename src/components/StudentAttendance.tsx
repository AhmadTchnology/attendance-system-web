import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User, AttendanceRecord, AttendanceSession, Lecture, AttendanceSummary } from '../types';
import { Calendar, CheckCircle, XCircle, Clock, BarChart2 } from 'lucide-react';

interface StudentAttendanceProps {
  currentUser: User;
}

const StudentAttendance: React.FC<StudentAttendanceProps> = ({ currentUser }) => {
  // State for attendance records and sessions
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string>('');

  // Fetch attendance records for the current student
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!currentUser || currentUser.role !== 'student') return;
      
      setIsLoading(true);
      try {
        // Fetch attendance records
        const recordsQuery = query(
          collection(db, 'attendanceRecords'),
          where('studentId', '==', currentUser.id)
        );
        
        const recordsSnapshot = await getDocs(recordsQuery);
        const recordsList = recordsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AttendanceRecord[];
        
        setAttendanceRecords(recordsList);
        
        // Fetch all sessions
        const sessionsQuery = query(collection(db, 'attendanceSessions'));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsList = sessionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AttendanceSession[];
        
        setSessions(sessionsList);
        
        // Fetch all lectures
        const lecturesQuery = query(collection(db, 'lectures'));
        const lecturesSnapshot = await getDocs(lecturesQuery);
        const lecturesList = lecturesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lecture[];
        
        setLectures(lecturesList);
        
        // Calculate attendance summary
        const totalSessions = sessionsList.length;
        const presentCount = recordsList.filter(record => record.status === 'present').length;
        const absentCount = recordsList.filter(record => record.status === 'absent').length;
        const lateCount = recordsList.filter(record => record.status === 'late').length;
        
        const attendancePercentage = totalSessions > 0 
          ? Math.round((presentCount / totalSessions) * 100) 
          : 0;
        
        setSummary({
          studentId: currentUser.id,
          studentName: currentUser.name,
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          attendancePercentage
        });
      } catch (error) {
        console.error('Error fetching attendance data:', error);
        setMessage('Failed to load attendance data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAttendanceData();
  }, [currentUser]);

  // Get lecture title by ID
  const getLectureTitle = (lectureId: string) => {
    const lecture = lectures.find(l => l.id === lectureId);
    return lecture ? lecture.title : 'Unknown Lecture';
  };

  // Get lecture details by ID
  const getLectureDetails = (lectureId: string) => {
    const lecture = lectures.find(l => l.id === lectureId);
    return lecture ? `${lecture.subject} - ${lecture.stage}` : '';
  };

  // Format date from timestamp
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

  // Render attendance summary
  const renderAttendanceSummary = () => {
    if (!summary) return null;
    
    return (
      <div className="attendance-summary">
        <h3>Attendance Summary</h3>
        
        <div className="summary-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summary.totalSessions}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle size={24} color="#4CAF50" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summary.presentCount}</div>
              <div className="stat-label">Present</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <XCircle size={24} color="#F44336" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summary.absentCount}</div>
              <div className="stat-label">Absent</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} color="#FF9800" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{summary.lateCount}</div>
              <div className="stat-label">Late</div>
            </div>
          </div>
        </div>
        
        <div className="attendance-percentage">
          <div className="percentage-label">
            <BarChart2 size={18} />
            <span>Attendance Rate</span>
          </div>
          <div className="percentage-bar">
            <div 
              className="percentage-fill"
              style={{ width: `${summary.attendancePercentage}%` }}
            ></div>
          </div>
          <div className="percentage-value">{summary.attendancePercentage}%</div>
        </div>
      </div>
    );
  };

  // Render attendance history
  const renderAttendanceHistory = () => {
    if (attendanceRecords.length === 0) {
      return (
        <div className="no-records">
          <p>No attendance records found</p>
        </div>
      );
    }
    
    return (
      <div className="attendance-history">
        <h3>Attendance History</h3>
        
        <div className="attendance-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Lecture</th>
                <th>Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceRecords.map(record => (
                <tr key={record.id}>
                  <td>{formatDate(record.timestamp)}</td>
                  <td>{getLectureTitle(record.lectureId)}</td>
                  <td>{getLectureDetails(record.lectureId)}</td>
                  <td>
                    <span className={`status-badge status-${record.status.toLowerCase()}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // If user is not a student, show error
  if (currentUser.role !== 'student') {
    return (
      <div className="error-message">
        <p>Only students can access attendance records</p>
      </div>
    );
  }

  return (
    <div className="student-attendance-container">
      {message && (
        <div className="message-banner">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Loading attendance data...</p>
        </div>
      ) : (
        <>
          {renderAttendanceSummary()}
          {renderAttendanceHistory()}
        </>
      )}
    </div>
  );
};

export default StudentAttendance;