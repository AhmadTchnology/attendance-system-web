import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { Upload, Download, Trash, Edit, Save, X, UserPlus } from 'lucide-react';

// Define Student interface with the required fields
interface Student extends User {
  studentId: string;
  major?: string;
  study?: string;
  group?: string;
}

// Define Excel row structure for import/export
interface StudentExcelRow {
  id: string;
  name: string;
  email: string;
  major: string;
  study: string;
  group: string;
}

interface StudentDataManagementProps {
  currentUser: User;
}

const StudentDataManagement: React.FC<StudentDataManagementProps> = ({ currentUser }) => {
  // State for students
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  
  // Form states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: '',
    email: '',
    studentId: '',
    major: '',
    study: '',
    group: '',
    role: 'student'
  });
  
  // UI states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'list' | 'import' | 'add'>('list');
  const [isEditing, setIsEditing] = useState<boolean>(false);

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
        })) as Student[];
        
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

  // Filter students when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const filtered = students.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.major?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.study?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.group?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredStudents(filtered);
  }, [searchTerm, students]);

  // Handle file import (Excel or DB)
  const [fileType, setFileType] = useState<'excel' | 'db'>('excel');
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setExcelFile(e.target.files[0]);
    }
  };

  // Import students from Excel or DB file
  const importFromFile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!excelFile) {
      setMessage(`Please select a ${fileType === 'excel' ? 'Excel' : 'DB'} file`);
      return;
    }
    
    setIsLoading(true);
    try {
      // Read the file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (fileType === 'excel') {
            // Excel file processing
            // We need to import xlsx library dynamically since it's not installed yet
            // In a real implementation, you would use the xlsx library directly
            // const XLSX = await import('xlsx');
            // const workbook = XLSX.read(e.target?.result, { type: 'binary' });
            // const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            // const data = XLSX.utils.sheet_to_json<StudentExcelRow>(worksheet);
            
            setMessage('Excel import functionality would be implemented here');
          } else {
            // DB file processing
            // Parse the DB file content
            const dbContent = e.target?.result;
            if (!dbContent) {
              throw new Error('Failed to read DB file content');
            }
            
            // In a real implementation, you would:
            // 1. Parse the DB file (SQLite or other format)
            // 2. Extract student records
            // 3. Create user accounts for new students
            // 4. Link student IDs with NFC tag IDs
            
            // For demonstration purposes:
            setMessage('DB file import successful. Student records would be processed here.');
            
            // The actual implementation would:
            // - Parse the DB file structure
            // - Extract student information
            // - Create user accounts in Firebase
            // - Link student IDs with NFC tag IDs if available
          }
        } catch (error) {
          console.error(`Error processing ${fileType} file:`, error);
          setMessage(`Failed to process ${fileType} file`);
        } finally {
          setIsLoading(false);
          setExcelFile(null);
        }
      };
      
      reader.onerror = () => {
        setMessage(`Failed to read ${fileType} file`);
        setIsLoading(false);
        setExcelFile(null);
      };
      
      if (fileType === 'excel') {
        reader.readAsBinaryString(excelFile);
      } else {
        reader.readAsArrayBuffer(excelFile);
      }
    } catch (error) {
      console.error(`Error importing from ${fileType}:`, error);
      setMessage(`Failed to import from ${fileType}`);
      setIsLoading(false);
      setExcelFile(null);
    }
  };

  // Export students to Excel
  const exportToExcel = () => {
    try {
      // In a real implementation, this would generate an Excel file
      // with all student data
      
      // The actual implementation would use a library like xlsx
      // to generate and download an Excel file with student data
      
      // For this example, we'll just show a message
      setMessage('Excel export functionality would be implemented here');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setMessage('Failed to export to Excel');
    }
  };

  // Add new student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newStudent.name || !newStudent.email || !newStudent.studentId) {
      setMessage('Please fill in all required fields');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if student ID already exists
      const existingStudentQuery = query(
        collection(db, 'users'),
        where('studentId', '==', newStudent.studentId)
      );
      
      const existingStudentSnapshot = await getDocs(existingStudentQuery);
      
      if (!existingStudentSnapshot.empty) {
        setMessage('This student ID is already registered');
        setIsLoading(false);
        return;
      }
      
      // Create new student
      const studentData: Omit<Student, 'id'> = {
        name: newStudent.name || '',
        email: newStudent.email || '',
        studentId: newStudent.studentId || '',
        major: newStudent.major || '',
        study: newStudent.study || '',
        group: newStudent.group || '',
        role: 'student',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'users'), studentData);
      
      // Reset form
      setNewStudent({
        name: '',
        email: '',
        studentId: '',
        major: '',
        study: '',
        group: '',
        role: 'student'
      });
      setMessage('Student added successfully');
      setActiveTab('list');
      
      // Refresh students list
      const studentsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        orderBy('name')
      );
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsList = studentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      setStudents(studentsList);
      setFilteredStudents(studentsList);
    } catch (error) {
      console.error('Error adding student:', error);
      setMessage('Failed to add student');
    } finally {
      setIsLoading(false);
    }
  };

  // Update student
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStudent || !editingStudent.id) {
      return;
    }
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingStudent.id), {
        name: editingStudent.name,
        email: editingStudent.email,
        studentId: editingStudent.studentId,
        major: editingStudent.major || '',
        study: editingStudent.study || '',
        group: editingStudent.group || ''
      });
      
      // Update local state
      setStudents(prevStudents => 
        prevStudents.map(student => 
          student.id === editingStudent.id ? editingStudent : student
        )
      );
      
      setMessage('Student updated successfully');
      setEditingStudent(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating student:', error);
      setMessage('Failed to update student');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete student
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'users', studentId));
      
      // Update local state
      setStudents(prevStudents => prevStudents.filter(student => student.id !== studentId));
      setFilteredStudents(prevStudents => prevStudents.filter(student => student.id !== studentId));
      
      setMessage('Student deleted successfully');
    } catch (error) {
      console.error('Error deleting student:', error);
      setMessage('Failed to delete student');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing a student
  const startEditing = (student: Student) => {
    setEditingStudent({...student});
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingStudent(null);
    setIsEditing(false);
  };

  // Handle input change for new student form
  const handleNewStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle input change for editing student form
  const handleEditStudentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStudent) return;
    
    const { name, value } = e.target;
    setEditingStudent(prev => ({
      ...prev!,
      [name]: value
    }));
  };

  // Render the student list tab
  const renderStudentListTab = () => (
    <div className="student-list-tab">
      <h3>Student Management</h3>
      
      <div className="search-and-actions">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="action-buttons">
          <button className="btn-primary" onClick={() => setActiveTab('add')}>
            <UserPlus size={18} /> Add Student
          </button>
          <button className="btn-secondary" onClick={exportToExcel}>
            <Download size={18} /> Export to Excel
          </button>
          <button className="btn-secondary" onClick={() => setActiveTab('import')}>
            <Upload size={18} /> Import from Excel
          </button>
        </div>
      </div>
      
      {filteredStudents.length === 0 ? (
        <p>No students found</p>
      ) : (
        <div className="students-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Major</th>
                <th>Study</th>
                <th>Group</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id}>
                  <td>{student.studentId}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.major || '-'}</td>
                  <td>{student.study || '-'}</td>
                  <td>{student.group || '-'}</td>
                  <td>
                    <div className="student-actions">
                      <button
                        className="btn-small btn-primary"
                        onClick={() => startEditing(student)}
                        title="Edit Student"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-small btn-danger"
                        onClick={() => handleDeleteStudent(student.id)}
                        title="Delete Student"
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

  // Render the import students tab
  const renderImportTab = () => (
    <div className="import-tab">
      <h3>Import Students from File</h3>
      
      <form onSubmit={importFromFile}>
        <div className="form-group">
          <label>File Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="fileType"
                value="excel"
                checked={fileType === 'excel'}
                onChange={() => setFileType('excel')}
              />
              Excel File (.xlsx, .xls)
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="fileType"
                value="db"
                checked={fileType === 'db'}
                onChange={() => setFileType('db')}
              />
              Database File (.db)
            </label>
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="import-file">Upload {fileType === 'excel' ? 'Excel' : 'DB'} File</label>
          <div className="file-upload">
            <input
              type="file"
              id="import-file"
              accept={fileType === 'excel' ? '.xlsx,.xls' : '.db,.sqlite,.sqlite3'}
              onChange={handleFileChange}
              required
            />
            <div className="file-upload-info">
              {excelFile ? (
                <span>{excelFile.name}</span>
              ) : (
                <span>No file selected</span>
              )}
            </div>
          </div>
        </div>
        
        {fileType === 'excel' ? (
          <div className="excel-template">
            <h4>Excel Format</h4>
            <p>Your Excel file should have the following columns:</p>
            <ul>
              <li>ID (Student ID)</li>
              <li>Name (Student Name)</li>
              <li>Email (Student Email)</li>
              <li>Major (Student Major)</li>
              <li>Study (Student Study Program)</li>
              <li>Group (Student Group)</li>
            </ul>
            <p>The first row should be the header row.</p>
          </div>
        ) : (
          <div className="db-template">
            <h4>Database Format</h4>
            <p>Your database file should contain student information with the following:</p>
            <ul>
              <li>Student ID field that matches their NFC tag ID</li>
              <li>Student name, email, and other information</li>
            </ul>
            <p>The system will automatically link students with their NFC tags based on matching IDs.</p>
          </div>
        )}
        
        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !excelFile}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <><Upload size={18} /> Import Students</>  
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab('list')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // Render the add student tab
  const renderAddStudentTab = () => (
    <div className="add-student-tab">
      <h3>Add New Student</h3>
      
      <form onSubmit={handleAddStudent}>
        <div className="form-group">
          <label htmlFor="student-id">Student ID*</label>
          <input
            type="text"
            id="student-id"
            name="studentId"
            value={newStudent.studentId}
            onChange={handleNewStudentChange}
            required
            className="input-field"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="student-name">Name*</label>
          <input
            type="text"
            id="student-name"
            name="name"
            value={newStudent.name}
            onChange={handleNewStudentChange}
            required
            className="input-field"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="student-email">Email*</label>
          <input
            type="email"
            id="student-email"
            name="email"
            value={newStudent.email}
            onChange={handleNewStudentChange}
            required
            className="input-field"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="student-major">Major</label>
          <input
            type="text"
            id="student-major"
            name="major"
            value={newStudent.major}
            onChange={handleNewStudentChange}
            className="input-field"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="student-study">Study Program</label>
          <input
            type="text"
            id="student-study"
            name="study"
            value={newStudent.study}
            onChange={handleNewStudentChange}
            className="input-field"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="student-group">Group</label>
          <input
            type="text"
            id="student-group"
            name="group"
            value={newStudent.group}
            onChange={handleNewStudentChange}
            className="input-field"
          />
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading || !newStudent.name || !newStudent.email || !newStudent.studentId}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>Add Student</>  
            )}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setActiveTab('list')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // Render the edit student form
  const renderEditStudentForm = () => {
    if (!editingStudent) return null;
    
    return (
      <div className="edit-student-overlay">
        <div className="edit-student-modal">
          <div className="modal-header">
            <h3>Edit Student</h3>
            <button className="close-button" onClick={cancelEditing}>
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleUpdateStudent}>
            <div className="form-group">
              <label htmlFor="edit-student-id">Student ID*</label>
              <input
                type="text"
                id="edit-student-id"
                name="studentId"
                value={editingStudent.studentId}
                onChange={handleEditStudentChange}
                required
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-student-name">Name*</label>
              <input
                type="text"
                id="edit-student-name"
                name="name"
                value={editingStudent.name}
                onChange={handleEditStudentChange}
                required
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-student-email">Email*</label>
              <input
                type="email"
                id="edit-student-email"
                name="email"
                value={editingStudent.email}
                onChange={handleEditStudentChange}
                required
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-student-major">Major</label>
              <input
                type="text"
                id="edit-student-major"
                name="major"
                value={editingStudent.major || ''}
                onChange={handleEditStudentChange}
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-student-study">Study Program</label>
              <input
                type="text"
                id="edit-student-study"
                name="study"
                value={editingStudent.study || ''}
                onChange={handleEditStudentChange}
                className="input-field"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-student-group">Group</label>
              <input
                type="text"
                id="edit-student-group"
                name="group"
                value={editingStudent.group || ''}
                onChange={handleEditStudentChange}
                className="input-field"
              />
            </div>
            
            <div className="form-actions">
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <><Save size={18} /> Save Changes</>  
                )}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={cancelEditing}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // If user is not an admin, show error
  if (currentUser.role !== 'admin') {
    return (
      <div className="error-message">
        <p>Only administrators can access student data management</p>
      </div>
    );
  }

  return (
    <div className="student-management-container">
      {message && (
        <div className="message-banner">
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}
      
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Student List
        </button>
        <button
          className={`tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          <UserPlus size={18} /> Add Student
        </button>
        <button
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload size={18} /> Import from Excel
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'list' && renderStudentListTab()}
        {activeTab === 'import' && renderImportTab()}
        {activeTab === 'add' && renderAddStudentTab()}
      </div>
      
      {isEditing && renderEditStudentForm()}
    </div>
  );
};

export default StudentDataManagement;