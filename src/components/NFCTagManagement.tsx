import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User, NFCTag } from '../types';
import { Tag, UserPlus, Trash, Upload, Download, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

// Utility function to format dates from Firestore timestamps
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  if (timestamp.toDate) {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return 'Invalid date';
};

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
    <div className="nfc-tag-management">
      <h2 className="section-title">NFC Tag Management</h2>
      
      <div className="attendance-tabs">
        <div 
          className={`attendance-tab ${activeTab === 'assign' ? 'active' : ''}`}
          onClick={() => setActiveTab('assign')}
        >
          <Tag size={18} />
          Assign Tags
        </div>
        <div 
          className={`attendance-tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          <RefreshCw size={18} />
          Manage Tags
        </div>
        <div 
          className={`attendance-tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload size={18} />
          Import/Export
        </div>
      </div>
      
      {activeTab === 'assign' && (
        <div className="card">
          <h3 className="card-title">Assign NFC Tag to Student</h3>
          <form onSubmit={assignNfcTag}>
            <div className="form-group">
              <label htmlFor="tagId">NFC Tag ID</label>
              <div className="input-with-icon">
                <Tag size={18} className="input-icon" />
                <input
                  type="text"
                  id="tagId"
                  value={newTagId}
                  onChange={(e) => setNewTagId(e.target.value)}
                  required
                  className="input-field"
                  placeholder="Enter NFC tag ID"
                />
              </div>
              <p className="form-hint">Scan the NFC tag or enter its ID manually</p>
            </div>
            
            <div className="form-group">
              <label htmlFor="studentSelect">Select Student</label>
              <div className="search-box">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field"
                />
              </div>
              
              <div className="student-list">
                {filteredStudents.length === 0 ? (
                  <div className="no-results">
                    <p>No students found</p>
                  </div>
                ) : (
                  filteredStudents.map(student => (
                    <div 
                      key={student.id}
                      className={`student-item ${selectedStudent === student.id ? 'selected' : ''}`}
                      onClick={() => setSelectedStudent(student.id)}
                    >
                      <div className="student-avatar">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="student-info">
                        <p className="student-name">{student.name}</p>
                        <p className="student-email">{student.email}</p>
                      </div>
                      {selectedStudent === student.id && (
                        <CheckCircle size={18} className="check-icon" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn-primary w-full"
              disabled={isLoading || !selectedStudent || !newTagId.trim()}
            >
              {isLoading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  <UserPlus size={18} />
                  Assign Tag
                </>
              )}
            </button>
          </form>
          
          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'manage' && (
        <div className="card">
          <h3 className="card-title">Manage NFC Tags</h3>
          
          {nfcTags.length === 0 ? (
            <div className="empty-state">
              <Tag size={48} />
              <p>No NFC tags assigned yet</p>
              <button 
                className="btn-primary"
                onClick={() => setActiveTab('assign')}
              >
                Assign Your First Tag
              </button>
            </div>
          ) : (
            <div className="tags-list">
              {nfcTags.map(tag => {
                const student = students.find(s => s.id === tag.studentId);
                return (
                  <div key={tag.id} className={`tag-card ${tag.isActive ? 'active' : 'inactive'}`}>
                    <div className="tag-header">
                      <div className="tag-icon">
                        <Tag size={20} />
                      </div>
                      <div className="tag-id">{tag.tagId}</div>
                      <div className={`tag-status ${tag.isActive ? 'status-active' : 'status-inactive'}`}>
                        {tag.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    
                    <div className="tag-body">
                      <div className="tag-student">
                        <div className="student-avatar">
                          {student ? student.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="student-info">
                          <p className="student-name">{student ? student.name : 'Unknown Student'}</p>
                          <p className="student-email">{student ? student.email : ''}</p>
                        </div>
                      </div>
                      
                      <div className="tag-meta">
                        <p className="tag-date">
                          <span>Assigned:</span> {formatDate(tag.assignedDate)}
                        </p>
                        {tag.lastUsed && (
                          <p className="tag-last-used">
                            <span>Last used:</span> {formatDate(tag.lastUsed)}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="tag-actions">
                      {tag.isActive ? (
                        <button 
                          className="btn-danger"
                          onClick={() => deactivateTag(tag.id)}
                          disabled={isLoading}
                        >
                          <XCircle size={18} />
                          Deactivate
                        </button>
                      ) : (
                        <button 
                          className="btn-success"
                          onClick={() => activateTag(tag.id)}
                          disabled={isLoading}
                        >
                          <CheckCircle size={18} />
                          Activate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'import' && (
        <div className="card">
          <h3 className="card-title">Import/Export NFC Tags</h3>
          
          <div className="import-export-container">
            <div className="import-section">
              <div className="section-header">
                <h4>Import Tags from CSV</h4>
                <p>Upload a CSV file with tag IDs and student IDs</p>
              </div>
              
              <div className="file-upload-container">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                  id="csv-upload"
                  className="file-input"
                />
                <label htmlFor="csv-upload" className="file-upload-label">
                  <div className="upload-icon">
                    <Upload size={24} />
                  </div>
                  <div className="upload-text">
                    <span className="upload-title">Choose CSV File</span>
                    <span className="upload-subtitle">or drag and drop</span>
                  </div>
                </label>
                
                {csvFile && (
                  <div className="selected-file">
                    <p className="file-name">{csvFile.name}</p>
                    <button 
                      className="btn-text"
                      onClick={() => setCsvFile(null)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
              
              <button 
                className="btn-primary w-full"
                onClick={importFromCsv}
                disabled={isLoading || !csvFile}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    <Upload size={18} />
                    Import Tags
                  </>
                )}
              </button>
            </div>
            
            <div className="divider"></div>
            
            <div className="export-section">
              <div className="section-header">
                <h4>Export Tags to CSV</h4>
                <p>Download all NFC tag assignments as CSV</p>
              </div>
              
              <div className="export-info">
                <p>This will export a CSV file containing:</p>
                <ul>
                  <li>Tag IDs</li>
                  <li>Student information</li>
                  <li>Assignment dates</li>
                  <li>Status information</li>
                </ul>
              </div>
              
              <button 
                className="btn-secondary w-full"
                onClick={exportToCsv}
                disabled={isLoading || nfcTags.length === 0}
              >
                <Download size={18} />
                Export {nfcTags.length} Tags
              </button>
            </div>
          </div>
          
          {message && (
            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NFCTagManagement;