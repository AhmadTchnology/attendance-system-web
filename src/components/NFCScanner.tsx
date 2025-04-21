import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NFCTag, AttendanceRecord, AttendanceSession } from '../types';
import { Smartphone, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface NFCScannerProps {
  sessionId: string;
  onScanComplete?: (studentName: string) => void;
  onError?: (error: string) => void;
}

const NFCScanner: React.FC<NFCScannerProps> = ({ sessionId, onScanComplete, onError }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [hasNfcSupport, setHasNfcSupport] = useState<boolean | null>(null);
  const [manualStudentId, setManualStudentId] = useState<string>('');
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);
  const ndefRef = useRef<any>(null);

  // Check if browser supports Web NFC API
  useEffect(() => {
    const checkNfcSupport = () => {
      if ('NDEFReader' in window) {
        setHasNfcSupport(true);
      } else {
        setHasNfcSupport(false);
        setScanStatus('error');
        setScanMessage('Your device does not support NFC scanning');
        if (onError) onError('Your device does not support NFC scanning');
      }
    };

    checkNfcSupport();

    // Cleanup function to abort any ongoing NFC operations when component unmounts
    return () => {
      if (ndefRef.current && ndefRef.current.abort) {
        try {
          ndefRef.current.abort();
        } catch (e) {
          console.error('Error aborting NFC scan:', e);
        }
      }
    };
  }, [onError]);

  // Fetch session details
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const sessionDoc = await getDocs(
          query(collection(db, 'attendanceSessions'), where('id', '==', sessionId))
        );
        
        if (!sessionDoc.empty) {
          const sessionData = sessionDoc.docs[0].data() as AttendanceSession;
          setSession(sessionData);
        } else {
          setScanStatus('error');
          setScanMessage('Attendance session not found');
          if (onError) onError('Attendance session not found');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setScanStatus('error');
        setScanMessage('Error fetching session details');
        if (onError) onError('Error fetching session details');
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, onError]);

  const startScanning = async () => {
    if (!hasNfcSupport) {
      setScanStatus('error');
      setScanMessage('NFC is not supported on this device');
      if (onError) onError('NFC is not supported on this device');
      return;
    }

    if (!session?.isActive) {
      setScanStatus('error');
      setScanMessage('This attendance session is not active');
      if (onError) onError('This attendance session is not active');
      return;
    }

    setIsScanning(true);
    setScanStatus('scanning');
    setScanMessage('Scanning for NFC tag... Please hold your phone near the student\'s NFC tag');

    try {
      // @ts-ignore - NDEFReader is not in the TypeScript types yet
      const ndef = new window.NDEFReader();
      ndefRef.current = ndef;
      
      await ndef.scan();
      
      ndef.addEventListener("reading", async ({ serialNumber }: { serialNumber: string }) => {
        try {
          // Visual feedback for successful scan
          setScanStatus('success');
          setScanMessage('Tag detected! Processing...');
          
          // Find the tag in the database
          const tagQuery = query(collection(db, 'nfcTags'), where('tagId', '==', serialNumber));
          const tagSnapshot = await getDocs(tagQuery);
          
          if (tagSnapshot.empty) {
            setScanStatus('error');
            setScanMessage('Unknown NFC tag');
            if (onError) onError('Unknown NFC tag');
            return;
          }
          
          const tagData = tagSnapshot.docs[0].data() as NFCTag;
          
          if (!tagData.isActive) {
            setScanStatus('error');
            setScanMessage('This NFC tag is inactive');
            if (onError) onError('This NFC tag is inactive');
            return;
          }
          
          // Get student details
          const studentQuery = query(collection(db, 'users'), where('id', '==', tagData.studentId));
          const studentSnapshot = await getDocs(studentQuery);
          
          if (studentSnapshot.empty) {
            setScanStatus('error');
            setScanMessage('Student not found');
            if (onError) onError('Student not found');
            return;
          }
          
          const studentData = studentSnapshot.docs[0].data();
          
          // Check if attendance already recorded
          const attendanceQuery = query(
            collection(db, 'attendanceRecords'), 
            where('sessionId', '==', sessionId),
            where('studentId', '==', tagData.studentId)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);
          
          if (!attendanceSnapshot.empty) {
            setScanStatus('success');
            setScanMessage(`${studentData.name} already marked present`);
            if (onScanComplete) onScanComplete(studentData.name);
            return;
          }
          
          // Record attendance
          const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
            lectureId: session.lectureId,
            studentId: tagData.studentId,
            timestamp: serverTimestamp(),
            status: 'present',
            recordedBy: session.teacherId
          };
          
          await addDoc(collection(db, 'attendanceRecords'), attendanceRecord);
          
          setScanStatus('success');
          setScanMessage(`${studentData.name} marked present`);
          if (onScanComplete) onScanComplete(studentData.name);
          
          // Automatically reset status after 3 seconds
          setTimeout(() => {
            if (isScanning) {
              setScanStatus('scanning');
              setScanMessage('Scanning for next NFC tag...');
            }
          }, 3000);
        } catch (error) {
          console.error('Error processing NFC scan:', error);
          setScanStatus('error');
          setScanMessage('Error processing scan');
          if (onError) onError('Error processing scan');
        }
      });
      
      ndef.addEventListener("error", (error: any) => {
        console.error(`NFC Error: ${error.message}`);
        setScanStatus('error');
        setScanMessage(`NFC scan error: ${error.message}`);
        if (onError) onError(`NFC scan error: ${error.message}`);
        setIsScanning(false);
      });
      
    } catch (error: any) {
      console.error('Error starting NFC scan:', error);
      setScanStatus('error');
      setScanMessage(`Failed to start NFC scanning: ${error.message}`);
      if (onError) onError(`Failed to start NFC scanning: ${error.message}`);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    // Attempt to abort the NFC scan if possible
    if (ndefRef.current && ndefRef.current.abort) {
      try {
        ndefRef.current.abort();
      } catch (e) {
        console.error('Error aborting NFC scan:', e);
      }
    }
    
    setIsScanning(false);
    setScanStatus('idle');
    setScanMessage('');
  };

  // Manual entry for devices without NFC
  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualStudentId.trim()) {
      setScanStatus('error');
      setScanMessage('Please enter a student ID');
      return;
    }
    
    if (!session?.isActive) {
      setScanStatus('error');
      setScanMessage('This attendance session is not active');
      if (onError) onError('This attendance session is not active');
      return;
    }

    setScanStatus('scanning');
    setScanMessage('Processing manual entry...');

    try {
      // Get student details
      const studentQuery = query(collection(db, 'users'), where('id', '==', manualStudentId));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        setScanStatus('error');
        setScanMessage('Student not found');
        if (onError) onError('Student not found');
        return;
      }
      
      const studentData = studentSnapshot.docs[0].data() as User;
      
      // Check if attendance already recorded
      const attendanceQuery = query(
        collection(db, 'attendanceRecords'), 
        where('lectureId', '==', session.lectureId),
        where('studentId', '==', manualStudentId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (!attendanceSnapshot.empty) {
        if (onError) onError(`${studentData.name} already marked present`);
        return;
      }
      
      // Record attendance
      const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
        lectureId: session.lectureId,
        studentId: manualStudentId,
        timestamp: serverTimestamp(),
        status: 'present',
        recordedBy: session.teacherId
      };
      
      await addDoc(collection(db, 'attendanceRecords'), attendanceRecord);
      
      setScanStatus('success');
      setScanMessage(`${studentData.name} marked present`);
      if (onScanComplete) onScanComplete(studentData.name);
      setManualStudentId('');
    } catch (error) {
      console.error('Error with manual entry:', error);
      setScanStatus('error');
      setScanMessage('Error processing manual entry');
      if (onError) onError('Error processing manual entry');
    }
  };

  // Get appropriate icon based on scan status
  const getScanStatusIcon = () => {
    switch (scanStatus) {
      case 'scanning':
        return <Loader2 size={48} className="animate-spin text-primary" />;
      case 'success':
        return <CheckCircle size={48} className="text-success" />;
      case 'error':
        return <XCircle size={48} className="text-danger" />;
      default:
        return <Smartphone size={48} className="text-primary" />;
    }
  };

  return (
    <div className="nfc-scanner">
      <div className={`scanner-container ${scanStatus}`}>
        <div className="scanner-icon">
          {getScanStatusIcon()}
        </div>
        
        {scanMessage && (
          <div className={`scanner-message ${scanStatus}`}>
            {scanMessage}
          </div>
        )}
        
        <div className="scanner-actions">
          {!isScanning ? (
            <button 
              onClick={startScanning} 
              className="btn-primary"
              disabled={!hasNfcSupport || !session?.isActive}
            >
              Start NFC Scanning
            </button>
          ) : (
            <button 
              onClick={stopScanning} 
              className="btn-danger"
            >
              Stop Scanning
            </button>
          )}
        </div>
        
        {!hasNfcSupport && (
          <div className="manual-entry-toggle">
            <button 
              onClick={() => setShowManualEntry(!showManualEntry)}
              className="btn-secondary"
            >
              {showManualEntry ? 'Hide Manual Entry' : 'Show Manual Entry'}
            </button>
          </div>
        )}
        
        {showManualEntry && (
          <div className="manual-entry-form">
            <h3>Manual Attendance Entry</h3>
            <form onSubmit={handleManualEntry}>
              <div className="form-group">
                <label htmlFor="studentId">Student ID</label>
                <input
                  type="text"
                  id="studentId"
                  value={manualStudentId}
                  onChange={(e) => setManualStudentId(e.target.value)}
                  className="input-field"
                  placeholder="Enter student ID"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={!session?.isActive}
              >
                Mark Present
              </button>
            </form>
          </div>
        )}
        
        {!hasNfcSupport && (
          <div className="nfc-support-warning">
            <AlertCircle size={18} />
            <span>Your device does not support NFC. Please use manual entry or switch to an NFC-compatible device.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFCScanner;