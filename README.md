# IWIZ HRMS - Human Resource Management System

A modern Human Resource Management System built with Node.js, Express, MongoDB, and React.

## 🚀 Features

- **Employee Management**: Add, edit, and manage employee profiles
- **Attendance Tracking**: Monitor employee attendance and working hours
- **Leave Management**: Approve/reject leave requests and manage leave balances
- **Payroll Management**: Generate and manage employee payroll
- **Reports & Analytics**: Comprehensive reporting and data visualization
- **User Authentication**: Secure JWT-based authentication system

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose, JWT
- **Frontend**: React, React Router, Axios, Tailwind CSS
- **Security**: bcryptjs, helmet, express-validator, CORS

## 🚀 Quick Start

### 1. Setup
```bash
git clone <repository-url>
cd HRMS_IWIZ
node setup.js
npm run install-all
```

### 2. Create Admin User
```bash
npm run create-admin
```

### 3. Start Application
```bash
npm run dev
```

## 🔑 Default Login

- **Email**: `irtazamira@gmail.com`
- **Password**: `123456`
- **Role**: Admin

## 📁 Project Structure

```
HRMS_IWIZ/
├── backend/          # Node.js API server
├── frontend/         # React application
├── package.json      # Root package configuration
└── setup.js         # Setup wizard
```

## 🔧 Available Scripts

- `npm run dev` - Start both backend and frontend
- `npm run start` - Start backend only
- `npm run build` - Build frontend for production
- `npm run create-admin` - Create admin user
- `npm run setup` - Run setup wizard
