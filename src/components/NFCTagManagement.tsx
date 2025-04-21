import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, NFCTag } from '../types';
import { Tag, UserPlus, Trash, Upload, Download } from 'lucide-react';

interface NFCTagManagementProps {
  currentUser: User;
}

const NFCTagManagement: React.FC<NFCTagManagementProps> = ({ currentUser }) => {
  // State for students and tags
  const [students, setStudents] = useState<User[]>([]);
  const [nfcTags, setNfcTags] = useState<NFCTag[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  
  // Form states
  const [newTagId, setNewTagId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'assign' | 'manage' | 'import'>('assign');

  // Fetch students
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;
      
      setIsLoading(true);
      try {
        const studentsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'student'),
          orderBy('name')
        );
        
        const studentsSnapshot = await getDocs(studentsQuery);
        const studentsList = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        setStudents(studentsList);
        setFilteredStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
        setMessage('Failed to load students');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudents();
  }, [currentUser]);

  // Fetch NFC tags
  useEffect(() => {
    const fetchNfcTags = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;
      
      try {
        const tagsQuery = query(
          collection(db, 'nfcTags'),
          orderBy('assignedDate', 'desc')
        );
        
        const tagsSnapshot = await getDocs(tagsQuery);
        const tagsList = tagsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NFCTag[];
        
        setNfcTags(tagsList);
      } catch (error) {
        console.error('Error fetching NFC tags:', error);
      }
    };
    
    fetchNfcTags();
  }, [currentUser]);

  // Filter students when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const filtered = students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  // Assign NFC tag to student
  const assignNfcTag = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTagId.trim() || !selectedStudent) {
      setMessage('Please enter tag ID and select a student');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if tag already exists
      const existingTagQuery = query(
        collection(db, 'nfcTags'),
        where('tagId', '==', newTagId)
      );
      
      const existingTagSnapshot = await getDocs(existingTagQuery);
      
      if (!existingTagSnapshot.empty) {
        setMessage('This NFC tag ID is already registered');
        setIsLoading(false);
        return;
      }
      
      // Create new NFC tag
      const newTag: Omit<NFCTag, 'id'> = {
        tagId: newTagId,
        studentId: selectedStudent,
        isActive: true,
        assignedDate: serverTimestamp()
      };
      
      await addDoc(collection(db, 'nfcTags'), newTag);
      
      // Reset form
      setNewTagId('');
      setSelectedStudent('');
      setMessage('NFC tag assigned successfully');
      
      // Refresh tags list
      const tagsQuery = query(
        collection(db, 'nfcTags'),
        orderBy('assignedDate', 'desc')
      );
      
      const tagsSnapshot = await getDocs(tagsQuery);
      const tagsList = tagsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NFCTag[];
      
      setNfcTags(tagsList);
    } catch (error) {
      console.error('Error assigning NFC tag:', error);
      setMessage('Failed to assign NFC tag');
    } finally {
      setIsLoading(false);
    }
  };

  // Deactivate NFC tag
  const deactivateTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to deactivate this NFC tag?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'nfcTags', tagId), {
        isActive: false
      });
      
      // Update local state
      setNfcTags(prevTags => 
        prevTags.map(tag => 
          tag.id === tagId ? { ...tag, isActive: false } : tag
        )
      );
      
      setMessage('NFC tag deactivated successfully');
    } catch (error) {
      console.error('Error deactivating NFC tag:', error);
      setMessage('Failed to deactivate NFC tag');
    } finally {
      setIsLoading(false);
    }
  };

  // Activate NFC tag
  const activateTag = async (tagId: string) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'nfcTags', tagId), {
        isActive: true
      });
      
      // Update local state
      setNfcTags(prevTags => 
        prevTags.map(tag => 
          tag.id === tagId ? { ...tag, isActive: true } : tag
        )
      );
      
      setMessage('NFC tag activated successfully');
    } catch (error) {
      console.error('Error activating NFC tag:', error);
      setMessage('Failed to activate NFC tag');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete NFC tag
  const deleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this NFC tag?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'nfcTags', tagId));
      
      // Update local state
      setNfcTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
      
      setMessage('NFC tag deleted successfully');
    } catch (error) {
      console.error('Error deleting NFC tag:', error);
      setMessage('Failed to delete NFC tag');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle CSV file import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // Import students and tags from CSV
  const importFromCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvFile) {
      setMessage('Please select a CSV file');
      return;
    }
    
    setIsLoading(true);
    try {
      // In a real implementation, this would parse the CSV file
      // and import the data into Firestore
      
      // For this example, we'll just show a message
      setMessage('CSV import functionality would be implemented here');
      
      // The actual implementation would:
      // 1. Parse the CSV file
      // 2. Validate the data
      // 3. Create user accounts for new students
      // 4. Assign NFC tags to students
    } catch (error) {
      console.error('Error importing from CSV:', error);
      setMessage('Failed to import from CSV');
    } finally {
      setIsLoading(false);
      setCsvFile(null);
    }
  };

  // Export tags to CSV
  const exportToCsv = () => {
    // In a real implementation, this would generate a CSV file
    // with all NFC tag assignments
    
    // For this example, we'll just show a message
    setMessage('CSV export functionality would be implemented here');
  };

  // Get student name by ID
  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };

  // Render the assign tag tab
  const renderAssignTagTab = () => (
    <div className="assign-tag-tab">
      <h3>Assign NFC Tag to Student</h3>
      
      <form onSubmit={assignNfcTag}>
        <div className="form-group">
          <label htmlFor="nfc-tag-id">NFC Tag ID</label>
          <input
            type="text"
            id="nfc-tag-id"
            className="input-field"
            value={newTagId}
            onChange={(e) => setNewTagId(e.target.value)}
            required
            placeholder="Enter NFC tag ID"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="student-select">Select Student</label>
          <input
            type="text"
            className="input-field"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="student-select-list">
            {filteredStudents.map(student => (
              <div 
                key={student.id} 
                className={`student-select-item ${selectedStudent === student.id ? 'selected' : ''}`}
                onClick={() => setSelectedStudent(student.id)}
              >
                <span className="student-name">{student.name}</span>
                <span className="student-email">{student.email}</span>
              </div>
            ))}
          </div>
        </div>
        
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !newTagId.trim() || !selectedStudent}
        >
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
            <>Assign NFC Tag</>
          )}
        </button>
      </form>
    </div>
  );

  // Render the manage tags tab
  const renderManageTagsTab = () => (
    <div className="manage-tags-tab">
      <h3>Manage NFC Tags</h3>
      
      <div className="tags-actions">
        <button className="btn-secondary" onClick={exportToCsv}>
          <Download size={18} /> Export to CSV
        </button>
      </div>
      
      {nfcTags.length === 0 ? (
        <p>No NFC tags assigned yet</p>
      ) : (
        <div className="tags-table">
          <table>
            <thead>
              <tr>
                <th>Tag ID</th>
                <th>Student</th>
                <th>Status</th>
                <th>Assigned Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {nfcTags.map(tag => (
                <tr key={tag.id}>
                  <td>{tag.tagId}</td>
                  <td>{getStudentName(tag.studentId)}</td>
                  <td>
                    <span className={`status-badge ${tag.isActive ? 'status-active' : 'status-inactive'}`}>
                      {tag.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {tag.assignedDate?.toDate?.().toLocaleDateString() || 'Unknown'}
                  </td>
                  <td>
                    <div className="tag-actions">
                      {tag.isActive ? (
                        <button
                          className="btn-small btn-warning"
                          onClick={() => deactivateTag(tag.id)}
                          title="Deactivate Tag"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="btn-small btn-success"
                          onClick={() => activateTag(tag.id)}
                          title="Activate Tag"
                        >
                          Activate
                        </button>
                      )}
                      
                      <button
                        className="btn-small btn-danger"
                        onClick={() => deleteTag(tag.id)}
                        title="Delete Tag"
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render the import/export tab
  const renderImportTab = () => (
    <div className="import-tab">
      <h3>Import Students & NFC Tags</h3>
      
      <form onSubmit={importFromCsv}>
        <div className="form-group">
          <label htmlFor="csv-file">Upload CSV File</label>
          <div className="file-upload">
            <input
              type="file"
              id="csv-file"
              accept=".csv"
              onChange={handleFileChange}
              required
            />
            <div className="file-upload-info">
              {csvFile ? (
                <span>{csvFile.name}</span>
              ) : (
                <span>No file selected</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="csv-template">
          <h4>CSV Format</h4>
          <p>Your CSV file should have the following columns:</p>
          <ul>
            <li>Student Name</li>
            <li>Student Email</li>
            <li>NFC Tag ID</li>
          </ul>
          <p>The first row should be the header row.</p>
        </div>
        
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !csvFile}
        >
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
            <><Upload size={18} /> Import Students & Tags</>
          )}
        </button>
      </form>
    </div>
  );

  // If user is not an admin, show error
  if (currentUser.role !== 'admin') {
    return (
      <div className="error-message">
        <p>Only administrators can access NFC tag management</p>
      </div>
    );
  }

  return (
    <div className="nfc-management-container">
      {message && (
        <div className="message-banner">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'assign' ? 'active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          <Tag size={18} /> Assign Tag
        </button>
        <button
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Tags
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <UserPlus size={18} /> Import/Export
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'assign' && renderAssignTagTab()}
        {activeTab === 'manage' && renderManageTagsTab()}
        {activeTab === 'import' && renderImportTab()}
      </div>
    </div>
  );
};

export default NFCTagManagement;