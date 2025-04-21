import React, { useState, useEffect } from 'react';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { NFCTag, AttendanceRecord, AttendanceSession } from '../types';

interface NFCScannerProps {
  sessionId: string;
  onScanComplete?: (studentName: string) => void;
  onError?: (error: string) => void;
}

const NFCScanner: React.FC<NFCScannerProps> = ({ sessionId, onScanComplete, onError }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [hasNfcSupport, setHasNfcSupport] = useState<boolean | null>(null);

  // Check if browser supports Web NFC API
  useEffect(() => {
    const checkNfcSupport = () => {
      if ('NDEFReader' in window) {
        setHasNfcSupport(true);
      } else {
        setHasNfcSupport(false);
        if (onError) onError('Your device does not support NFC scanning');
      }
    };

    checkNfcSupport();
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
          if (onError) onError('Attendance session not found');
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        if (onError) onError('Error fetching session details');
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId, onError]);

  const startScanning = async () => {
    if (!hasNfcSupport) {
      if (onError) onError('NFC is not supported on this device');
      return;
    }

    if (!session?.isActive) {
      if (onError) onError('This attendance session is not active');
      return;
    }

    setIsScanning(true);
    setScanMessage('Scanning for NFC tag...');

    try {
      // @ts-ignore - NDEFReader is not in the TypeScript types yet
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener("reading", async ({ serialNumber }: { serialNumber: string }) => {
        try {
          // Find the tag in the database
          const tagQuery = query(collection(db, 'nfcTags'), where('tagId', '==', serialNumber));
          const tagSnapshot = await getDocs(tagQuery);
          
          if (tagSnapshot.empty) {
            setScanMessage('Unknown NFC tag');
            if (onError) onError('Unknown NFC tag');
            return;
          }
          
          const tagData = tagSnapshot.docs[0].data() as NFCTag;
          
          if (!tagData.isActive) {
            setScanMessage('This NFC tag is inactive');
            if (onError) onError('This NFC tag is inactive');
            return;
          }
          
          // Get student details
          const studentQuery = query(collection(db, 'users'), where('id', '==', tagData.studentId));
          const studentSnapshot = await getDocs(studentQuery);
          
          if (studentSnapshot.empty) {
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
          
          // Update tag's last used timestamp
          // This would be done with a transaction in a production app
          
          // Update session's present count
          // This would be done with a transaction in a production app
          
          setScanMessage(`${studentData.name} marked present`);
          if (onScanComplete) onScanComplete(studentData.name);
        } catch (error) {
          console.error('Error processing NFC scan:', error);
          setScanMessage('Error processing scan');
          if (onError) onError('Error processing scan');
        }
      });
      
      ndef.addEventListener("error", (error: any) => {
        console.error(`NFC Error: ${error.message}`);
        setScanMessage('NFC scan error');
        if (onError) onError(`NFC scan error: ${error.message}`);
        setIsScanning(false);
      });
      
    } catch (error: any) {
      console.error('Error starting NFC scan:', error);
      setScanMessage('Failed to start NFC scanning');
      if (onError) onError(`Failed to start NFC scanning: ${error.message}`);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    // Note: Web NFC API doesn't have a direct way to stop scanning
    // The scan will continue until the page is unloaded
    // This just updates the UI state
    setIsScanning(false);
    setScanMessage('');
  };

  // Manual entry for devices without NFC
  const handleManualEntry = async (studentId: string) => {
    if (!session?.isActive) {
      if (onError) onError('This attendance session is not active');
      return;
    }

    try {
      // Get student details
      const studentQuery = query(collection(db, 'users'), where('id', '==', studentId));
      const studentSnapshot = await getDocs(studentQuery);
      
      if (studentSnapshot.empty) {
        if (onError) onError('Student not found');
        return;
      }
      
      const studentData = studentSnapshot.docs[0].data();
      
      // Check if attendance already recorded
      const attendanceQuery = query(
        collection(db, 'attendanceRecords'), 
        where('sessionId', '==', sessionId),
        where('studentId', '==', studentId)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (!attendanceSnapshot.empty) {
        if (onError) onError(`${studentData.name} already marked present`);
        return;
      }
      
      // Record attendance
      const attendanceRecord: Omit<AttendanceRecord, 'id'> = {
        lectureId: session.lectureId,
        studentId: studentId,
        timestamp: serverTimestamp(),
        status: 'present',
        recordedBy: session.teacherId
      };
      
      await addDoc(collection(db, 'attendanceRecords'), attendanceRecord);
      
      if (onScanComplete) onScanComplete(studentData.name);
    } catch (error) {
      console.error('Error with manual entry:', error);
      if (onError) onError('Error processing manual entry');
    }
  };

  return (
    <div className="nfc-scanner">
      <div className="scanner-status">
        {hasNfcSupport === false && (
          <div className="nfc-not-supported">
            <p>NFC is not supported on this device.</p>
            <p>Use manual entry instead.</p>
          </div>
        )}
        
        {hasNfcSupport && (
          <div className="scanner-controls">
            {!isScanning ? (
              <button 
                className="btn-primary" 
                onClick={startScanning}
                disabled={!session?.isActive}
              >
                Start NFC Scanner
              </button>
            ) : (
              <>
                <div className="scanning-indicator">
                  <div className="pulse-animation"></div>
                  <p>Scanning for NFC tags...</p>
                </div>
                <button className="btn-secondary" onClick={stopScanning}>
                  Stop Scanning
                </button>
              </>
            )}
          </div>
        )}
        
        {scanMessage && (
          <div className="scan-message">
            {scanMessage}
          </div>
        )}
      </div>
      
      <div className="manual-entry">
        <h3>Manual Entry</h3>
        <p>For devices without NFC capability</p>
        <input 
          type="text" 
          placeholder="Enter Student ID"
          className="input-field"
          id="manual-student-id"
        />
        <button 
          className="btn-primary"
          onClick={() => {
            const input = document.getElementById('manual-student-id') as HTMLInputElement;
            if (input && input.value) {
              handleManualEntry(input.value);
              input.value = '';
            }
          }}
        >
          Mark Present
        </button>
      </div>
    </div>
  );
};

export default NFCScanner;