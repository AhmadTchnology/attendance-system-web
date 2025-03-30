# Lecture Management System

A web application for managing and accessing educational lectures built with React, TypeScript, and Firebase.

## 📋 Overview

This is a lecture management system where administrators, teachers, and students can access educational materials. The system allows for:

- User authentication and role-based access control (admin, teacher, student)
- Upload and management of lecture PDFs
- Organization of lectures by subject and educational stage
- Search and filtering functionality for finding lectures

## 🚀 Features

- **Authentication**: Secure login system with role-based permissions
- **User Management**: Admins can create, update, and delete user accounts
- **Lecture Repository**: Upload, categorize, and manage lecture PDFs
- **Category Management**: Create and organize subjects and stages
- **Search & Filter**: Easily find lectures by title, subject, or stage
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Technologies Used

- **Frontend**:
  - React 18
  - TypeScript
  - Tailwind CSS
  - Lucide React (for icons)
  - Vite (build tool)

- **Backend**:
  - Firebase Authentication
  - Firebase Firestore (database)
  - Firebase Storage (file storage)

## 🏗️ Project Structure

```
lecture-management-system/
├── src/
│   ├── App.tsx            # Main application component
│   ├── App.css            # Application styles
│   ├── firebase.ts        # Firebase configuration
│   ├── index.css          # Global styles
│   ├── main.tsx           # Application entry point
│   └── vite-env.d.ts      # TypeScript declarations
├── public/
│   └── ...                # Static assets
├── index.html             # HTML entry point
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
└── vite.config.ts         # Vite configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/AhmadTchnology/lecture-management-system.git
   cd lecture-management-system
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up Firebase:
   - Create a new Firebase project in the [Firebase Console](https://console.firebase.google.com/)
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase configuration to `src/firebase.ts`
   - Set up Firebase Security Rules as provided in `firebase-rules.txt`

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🔐 Firebase Security

This application uses Firebase for authentication, database, and storage. Security rules are defined in `firebase-rules.txt`. Make sure to apply these rules in your Firebase console to ensure proper access control.

## 🧑‍💻 User Roles

- **Admin**: Can manage users, lectures, and categories
- **Teacher**: Can upload and manage lectures
- **Student**: Can view and download lectures

## 📄 License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 👤 Author

Made with ❤️ by [@AhmadTchnology](https://github.com/AhmadTchnology)