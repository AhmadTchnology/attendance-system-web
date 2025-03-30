import React, { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, Upload, FileText, Users, User, Info, Menu, X, Search, Filter, Lock, Plus, Trash } from 'lucide-react';
import './App.css';

// Firebase imports
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  query,
  orderBy,
  where,
  onSnapshot
} from 'firebase/firestore';
import { 
  ref, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { db, storage, auth } from './firebase';

// Define user roles
type Role = 'admin' | 'teacher' | 'student';

// User interface
interface User {
  id: string;
  email: string;
  password?: string;
  role: Role;
  name: string;
  createdAt?: any;
}

// Lecture interface
interface Lecture {
  id: string;
  title: string;
  subject: string;
  stage: string;
  pdfUrl: string;
  uploadedBy: string;
  uploadDate: string;
}

// Category interface
interface Category {
  id: string;
  name: string;
  type: 'subject' | 'stage';
  createdAt: any;
}

function App() {
  // State for authentication
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  // State for users and lectures
  const [users, setUsers] = useState<User[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [filteredLectures, setFilteredLectures] = useState<Lecture[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // UI states
  const [activeView, setActiveView] = useState<string>('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Form states
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('');
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserRole, setNewUserRole] = useState<Role>('student');
  const [newLectureTitle, setNewLectureTitle] = useState<string>('');
  const [newLectureSubject, setNewLectureSubject] = useState<string>('');
  const [newLectureStage, setNewLectureStage] = useState<string>('');
  const [newLectureUrl, setNewLectureUrl] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('');
  const [newCategoryType, setNewCategoryType] = useState<'subject' | 'stage'>('subject');
  const [loginError, setLoginError] = useState<string>('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStage, setFilterStage] = useState<string>('all');
  
  // Refs
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userDoc = await getDocs(
            query(collection(db, 'users'), where('email', '==', user.email))
          );
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data() as User;
            userData.id = userDoc.docs[0].id;
            
            setCurrentUser(userData);
            setIsAuthenticated(true);
            
            // Set appropriate view based on user role
            if (userData.role === 'admin') {
              setActiveView('users');
            } else {
              setActiveView('lectures');
            }
          } else {
            // If user exists in Auth but not in Firestore, create a record
            const newUser: User = {
              id: user.uid,
              email: user.email || '',
              role: 'student', // Default role
              name: user.displayName || user.email?.split('@')[0] || 'User',
              createdAt: serverTimestamp()
            };
            
            await addDoc(collection(db, 'users'), newUser);
            setCurrentUser(newUser);
            setIsAuthenticated(true);
            setActiveView('lectures');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          await signOut(auth);
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setActiveView('login');
      }
      
      setAuthLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Subscribe to categories collection
  useEffect(() => {
    if (isAuthenticated) {
      const categoriesQuery = query(collection(db, 'categories'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(categoriesQuery, (snapshot) => {
        const categoriesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        
        setCategories(categoriesList);
      });
      
      return () => unsubscribe();
    }
  }, [isAuthenticated]);
  
  // Subscribe to users collection
  useEffect(() => {
    if (isAuthenticated && currentUser?.role === 'admin') {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        
        setUsers(usersList);
      });
      
      return () => unsubscribe();
    }
  }, [isAuthenticated, currentUser]);
  
  // Subscribe to lectures collection
  useEffect(() => {
    if (isAuthenticated) {
      const lecturesQuery = query(collection(db, 'lectures'), orderBy('uploadDate', 'desc'));
      
      const unsubscribe = onSnapshot(lecturesQuery, (snapshot) => {
        const lecturesList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Lecture[];
        
        setLectures(lecturesList);
        setFilteredLectures(lecturesList);
      });
      
      return () => unsubscribe();
    }
  }, [isAuthenticated]);
  
  // Filter lectures when search term or filter category changes
  useEffect(() => {
    filterLectures();
  }, [searchTerm, filterSubject, filterStage, lectures]);
  
  // Close sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter lectures based on search term and categories
  const filterLectures = () => {
    let filtered = [...lectures];
    
    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(lecture => 
        lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lecture.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter(lecture => 
        lecture.subject.toLowerCase() === filterSubject.toLowerCase()
      );
    }
    
    // Apply stage filter
    if (filterStage !== 'all') {
      filtered = filtered.filter(lecture => 
        lecture.stage.toLowerCase() === filterStage.toLowerCase()
      );
    }
    
    setFilteredLectures(filtered);
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    
    try {
      // Sign in with Firebase Auth
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      // Auth state listener will handle the rest
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/invalid-credential') {
        setLoginError('Invalid email or password');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('Too many failed login attempts. Please try again later.');
      } else {
        setLoginError('An error occurred during login');
      }
      
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Auth state listener will handle the rest
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Add new user (admin only)
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newUserEmail, 
        newUserPassword
      );
      
      // Add user to Firestore without password
      const newUser: Omit<User, 'id' | 'password'> & { uid: string } = {
        email: newUserEmail,
        role: newUserRole,
        name: newUserName,
        createdAt: serverTimestamp(),
        uid: userCredential.user.uid
      };
      
      await addDoc(collection(db, 'users'), newUser);
      
      // Reset form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('student');
    } catch (error: any) {
      console.error('Error adding user:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        alert('Email is already in use');
      } else {
        alert('Error creating user: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user (admin only)
  const handleDeleteUser = async (userId: string) => {
    // Prevent admin from deleting their own account
    if (currentUser && currentUser.id === userId) {
      alert('You cannot delete your own account!');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Delete user from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      // Note: Deleting from Firebase Auth requires admin SDK
      // which can't be used in client-side code
      // In a real app, you would use a Cloud Function for this
      
      alert('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new category (admin only)
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    setIsLoading(true);
    
    try {
      await addDoc(collection(db, 'categories'), {
        name: newCategory.trim(),
        type: newCategoryType,
        createdAt: serverTimestamp()
      });
      
      setNewCategory('');
      alert('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete category (admin only)
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      alert('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload new lecture (teacher only)
  const handleUploadLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLectureUrl || !currentUser) return;
    
    setIsLoading(true);
    
    try {
      // Create lecture document in Firestore
      const newLecture = {
        title: newLectureTitle,
        subject: newLectureSubject,
        stage: newLectureStage,
        pdfUrl: newLectureUrl,
        uploadedBy: currentUser.id,
        uploadDate: new Date().toISOString().split('T')[0]
      };
      
      // Add lecture to Firestore
      await addDoc(collection(db, 'lectures'), newLecture);
      
      // Reset form
      setNewLectureTitle('');
      setNewLectureSubject('');
      setNewLectureStage('');
      setNewLectureUrl('');
      
      alert('Lecture uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading lecture:', error);
      alert('Error uploading lecture: ' + (error.message || 'An error occurred'));
    } finally {
      setIsLoading(false);
    }
  };

  // Delete lecture (teacher and admin only)
  const handleDeleteLecture = async (lecture: Lecture) => {
    // Check if user has permission to delete
    if (currentUser?.role !== 'admin' && currentUser?.id !== lecture.uploadedBy) {
      alert('You do not have permission to delete this lecture');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this lecture?')) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'lectures', lecture.id));
      
      alert('Lecture deleted successfully');
    } catch (error) {
      console.error('Error deleting lecture:', error);
      alert('Error deleting lecture');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Get subjects and stages from categories
  const subjects = categories.filter(cat => cat.type === 'subject');
  const stages = categories.filter(cat => cat.type === 'stage');

  // Render login form
  const renderLoginForm = () => (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-logo">
          <div className="auth-logo-circle">
            <FileText size={32} color="white" />
          </div>
        </div>
        <h2>Login to Lecture Management System</h2>
        <p>Enter your credentials to access your account</p>
        <form onSubmit={handleLogin}>
          {loginError && (
            <div className="error-message">
              {loginError}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <User size={18} className="form-icon" />
            <input
              type="email"
              id="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
              className="input-field"
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <Lock size={18} className="form-icon" />
            <input
              type="password"
              id="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
              className="input-field"
              placeholder="Enter your password"
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Render user management (admin only)
  const renderUserManagement = () => (
    <div className="content-container">
      <h2 className="section-title">User Management</h2>
      
      <div className="card">
        <h3 className="card-title">Add New User</h3>
        <form onSubmit={handleAddUser}>
          <div className="form-group">
            <label htmlFor="newUserName">Name</label>
            <input
              type="text"
              id="newUserName"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newUserEmail">Email</label>
            <input
              type="email"
              id="newUserEmail"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newUserPassword">Password</label>
            <input
              type="password"
              id="newUserPassword"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              required
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newUserRole">Role</label>
            <select
              id="newUserRole"
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as Role)}
              required
              className="input-field"
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              'Add User'
            )}
          </button>
        </form>
      </div>
      
      <div className="card mt-6">
        <h3 className="card-title">Categories Management</h3>
        <form onSubmit={handleAddCategory} className="mb-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category"
                className="input-field"
                required
              />
            </div>
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value as 'subject' | 'stage')}
              className="input-field"
              style={{ width: '150px' }}
            >
              <option value="subject">Subject</option>
              <option value="stage">Stage</option>
            </select>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isLoading}
            >
              <Plus size={18} />
              Add
            </button>
          </div>
        </form>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-lg font-semibold mb-3">Subjects</h4>
            {subjects.map((category) => (
              <div 
                key={category.id}
                className="bg-gray-50 p-4 rounded-lg flex justify-between items-center mb-2"
              >
                <span>{category.name}</span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="btn-danger"
                  disabled={isLoading}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
          
          <div>
            <h4 className="text-lg font-semibold mb-3">Stages</h4>
            {stages.map((category) => (
              <div 
                key={category.id}
                className="bg-gray-50 p-4 rounded-lg flex justify-between items-center mb-2"
              >
                <span>{category.name}</span>
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="btn-danger"
                  disabled={isLoading}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="card mt-6">
        <h3 className="card-title">User List</h3>
        <div className="user-grid">
          {users.map((user) => (
            <div 
              key={user.id} 
              className="user-card"
            >
              <div className="user-card-header">
                <div className="user-avatar-lg">
                  <User size={32} />
                </div>
                <span className={`role-badge role-${user.role}`}>{user.role}</span>
              </div>
              <div className="user-card-body">
                <h4 className="user-card-name">{user.name}</h4>
                <p className="user-card-email">{user.email}</p>
              </div>
              <div className="user-card-footer">
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="btn-danger w-full"
                  disabled={currentUser?.id === user.id || isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Render lecture upload form (teacher only)
  const renderLectureUpload = () => (
    <div className="card">
      <h3 className="card-title">Add New Lecture</h3>
      <form onSubmit={handleUploadLecture}>
        <div className="form-group">
          <label htmlFor="lectureTitle">Title</label>
          <input
            type="text"
            id="lectureTitle"
            value={newLectureTitle}
            onChange={(e) => setNewLectureTitle(e.target.value)}
            required
            className="input-field"
            placeholder="Enter lecture title"
          />
        </div>
        <div className="form-group">
          <label htmlFor="lectureSubject">Subject</label>
          <select
            id="lectureSubject"
            value={newLectureSubject}
            onChange={(e) => setNewLectureSubject(e.target.value)}
            required
            className="input-field"
          >
            <option value="">Select a subject</option>
            {subjects.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="lectureStage">Stage</label>
          <select
            id="lectureStage"
            value={newLectureStage}
            onChange={(e) => setNewLectureStage(e.target.value)}
            required
            className="input-field"
          >
            <option value="">Select a stage</option>
            {stages.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="lectureUrl">PDF URL</label>
          <input
            type="url"
            id="lectureUrl"
            value={newLectureUrl}
            onChange={(e) => setNewLectureUrl(e.target.value)}
            required
            className="input-field"
            placeholder="Enter PDF URL"
          />
        </div>
        <button 
          type="submit" 
          className="btn-primary"
          disabled={!newLectureUrl || isLoading}
        >
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
            <>
              <Upload size={18} /> Add Lecture
            </>
          )}
        </button>
      </form>
    </div>
  );

  // Render lectures list
  const renderLecturesList = () => (
    <div className="content-container">
      <h2 className="section-title">Lectures</h2>
      
      {currentUser?.role === 'teacher' && renderLectureUpload()}
      
      <div className="search-filter-container">
        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search lectures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-container">
          <Filter size={20} className="filter-icon" />
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Subjects</option>
            {subjects.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="filter-container">
          <Filter size={20} className="filter-icon" />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Stages</option>
            {stages.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="card mt-6">
        <h3 className="card-title">Available Lectures</h3>
        <div className="lecture-grid">
          {filteredLectures.length > 0 ? (
            filteredLectures.map((lecture) => (
              <div 
                key={lecture.id} 
                className="lecture-card"
              >
                <div className="lecture-card-header">
                  <FileText size={24} className="lecture-icon" />
                  <div className="flex gap-2">
                    <span className="lecture-subject">{lecture.subject}</span>
                    <span className="lecture-subject">{lecture.stage}</span>
                  </div>
                </div>
                <div className="lecture-card-body">
                  <h4 className="lecture-title">{lecture.title}</h4>
                  <span className="lecture-date">Uploaded: {lecture.uploadDate}</span>
                </div>
                <div className="lecture-card-footer">
                  <div className="flex gap-2">
                    <a
                      href={lecture.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex-1"
                    >
                      View PDF
                    </a>
                    {(currentUser?.role === 'admin' || currentUser?.id === lecture.uploadedBy) && (
                      <button
                        onClick={() => handleDeleteLecture(lecture)}
                        className="btn-danger"
                        disabled={isLoading}
                      >
                        
                        <Trash size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No lectures found matching your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render About Us page
  const renderAboutUs = () => (
    <div className="content-container">
      <h2 className="section-title">About Us</h2>
      
      <div className="card about-card">
        <div className="about-header">
          <img 
            src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80" 
            alt="University Campus" 
            className="about-banner"
          />
        </div>
        
        <div className="about-body">
          <h3 className="about-title">
            University Lecture Management System
          </h3>
          
          <p className="about-description">
            Welcome to our University Lecture Management System, a sophisticated digital platform designed to revolutionize how educational content is organized and accessed within our university. This system serves as a central hub for managing academic lectures across different subjects and stages, ensuring seamless access to educational materials for both educators and students.
          </p>
          
          <h4 className="about-subtitle">
            Core Features:
          </h4>
          
          <ul className="about-features">
            <li>Multi-stage lecture organization with customizable subject categories</li>
            <li>Role-based access control for administrators, teachers, and students</li>
            <li>Advanced search and filtering capabilities by subject and stage</li>
            <li>Secure PDF lecture storage and viewing</li>
            <li>User-friendly interface for lecture uploads and management</li>
            <li>Real-time updates</li>
            <li>Comprehensive user management system</li>
          </ul>
          
          <div className="about-creator">
            <div className="creator-avatar">
              <User size={32} />
            </div>
            <div className="creator-info">
              <p className="creator-name">Ahmed Shukor</p>
              <p className="creator-title">Department of Computer Engineering</p>
            </div>
          </div>
          
          <p className="about-copyright">
            © 2025 University of Technology - Lecture Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );

  // Render navigation
  const renderNavigation = () => (
    <>
      <div className="mobile-header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <h1>LMS</h1>
      </div>
      
      {(isSidebarOpen || window.innerWidth > 768) && (
        <nav 
          className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}
          ref={sidebarRef}
        >
          <div className="sidebar-header">
            <div className="sidebar-title">
              <h1>LMS</h1>
              <p>Lecture Management</p>
            </div>
            <button className="close-sidebar" onClick={toggleSidebar}>
              <X size={24} />
            </button>
          </div>
          
          <div className="user-profile">
            <div className="user-avatar">
              <User size={24} />
            </div>
            <div className="user-details">
              <p>{currentUser?.name}</p>
              <span className={`role-badge role-${currentUser?.role}`}>{currentUser?.role}</span>
            </div>
          </div>
          
          <ul className="nav-links">
            <li>
              <button
                className={activeView === 'lectures' ? 'active' : ''}
                onClick={() => {
                  setActiveView('lectures');
                  setIsSidebarOpen(false);
                }}
              >
                <FileText size={20} /> Lectures
              </button>
            </li>
            
            {currentUser?.role === 'admin' && (
              <li>
                <button
                  className={activeView === 'users' ? 'active' : ''}
                  onClick={() => {
                    setActiveView('users');
                    setIsSidebarOpen(false);
                  }}
                >
                  <Users size={20} /> Users
                </button>
              </li>
            )}
            
            <li>
              <button
                className={activeView === 'about' ? 'active' : ''}
                onClick={() => {
                  setActiveView('about');
                  setIsSidebarOpen(false);
                }}
              >
                <Info size={20} /> About Us
              </button>
            </li>
            
            <li className="nav-footer">
              <button 
                onClick={handleLogout} 
                className="btn-logout"
              >
                <LogOut size={20} /> Logout
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="loading-spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.3)', borderTopColor: '#4f46e5', width: '3rem', height: '3rem' }}></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="app">
      {!isAuthenticated ? (
        renderLoginForm()
      ) : (
        <div className="dashboard">
          {renderNavigation()}
          <main className="main-content">
            {activeView === 'users' && renderUserManagement()}
            {activeView === 'lectures' && renderLecturesList()}
            {activeView === 'about' && renderAboutUs()}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;