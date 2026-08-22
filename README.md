# MERN Task Distribution System

A full-stack web application built with the MERN stack (MongoDB, Express.js, React.js, Node.js) for managing agents and distributing tasks from CSV uploads.

## Features

- **Admin Authentication**: Secure login system with JWT tokens
- **Agent Management**: Create, read, update, and delete agents
- **CSV Upload**: Upload CSV files with task data (FirstName, Phone, Notes)
- **Task Distribution**: Automatically distribute tasks equally among 5 agents
- **Real-time Dashboard**: View statistics and manage the system
- **Responsive UI**: Modern Material-UI interface

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mern-task-distribution-system
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Configuration**

   **Backend (.env file in backend directory):**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/task_distribution_system
   JWT_SECRET=your_jwt_secret_key_here_please_change_in_production
   NODE_ENV=development
   ```

   **Frontend (.env file in frontend directory):**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   # On Windows
   net start MongoDB
   
   # On macOS/Linux
   sudo systemctl start mongod
   ```

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on http://localhost:5000

2. **Start the frontend application**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on http://localhost:3000

3. **Using the root package.json scripts**
   ```bash
   # Install all dependencies
   npm run install-all
   
   # Start both frontend and backend concurrently
   npm run dev
   ```

### Production Mode

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend in production**
   ```bash
   cd backend
   npm start
   ```

## Usage

### Initial Setup

1. **Create Admin Account**
    - Open the application in your browser (http://localhost:3000)
    - Click "Don't have an account? Create one"
    - Enter your admin credentials
    - Click "Create Account"

2. **Login**
    - Use your admin credentials to login
    - You'll be redirected to the dashboard

### Managing Agents

1. **Navigate to Agents**
    - Click "Manage Agents" on the dashboard
    - Or use the navigation menu

2. **Add Agents**
    - Click "Add Agent" button
    - Fill in the required information:
        - Name
        - Email
        - Mobile Number with country code
        - Password
    - Click "Create"

3. **Edit/Delete Agents**
    - Use the action buttons in the agents table
    - Edit: Modify agent information
    - Delete: Soft delete the agent

### Uploading and Distributing Tasks

1. **Navigate to Tasks**
    - Click "Upload & Distribute Tasks" on the dashboard
    - Or use the navigation menu

2. **Prepare CSV File**
   Create a CSV file with the following columns:
   ```
   FirstName,Phone,Notes
   John Doe,1234567890,Important client
   Jane Smith,0987654321,Follow up needed
   ```

   **Supported file formats:** CSV, XLSX, XLS
   **Column names accepted:**
    - FirstName: firstname, FirstName, first_name
    - Phone: phone, Phone, phone_number
    - Notes: notes, Notes, notes_text (optional)

3. **Upload and Distribute**
    - Click "Upload CSV" button
    - Select your CSV file
    - Click "Upload & Distribute"
    - The system will automatically distribute tasks equally among all active agents

4. **View Distribution**
    - Click "View Distribution" on any batch
    - See how tasks were distributed among agents
    - View individual task details

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Admin registration
- `GET /api/auth/me` - Get current admin profile

### Agents
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent

### Tasks
- `POST /api/tasks/upload` - Upload CSV file
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/batches` - Get all batches
- `GET /api/tasks/distribution/:batchId` - Get task distribution for a ba
