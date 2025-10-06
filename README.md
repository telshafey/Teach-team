# Tech Team - أداة إدارة الفريق

This is a comprehensive web application designed to help tech teams manage their projects, track time, and streamline workflows. Built with React, TypeScript, and Supabase, it provides a powerful yet intuitive interface for managers and team members alike.

## ✨ Features

- **Dashboards per Role**: Customized dashboards for General Managers, Project Managers, and individual team members, providing relevant information at a glance.
- **Project Management**: Create and manage projects, define budgets (in hours and currency), and track progress.
- **Task Management**: A Kanban-style board for each project to manage tasks through different stages (To Do, In Progress, Done).
- **Daily Logging**: Team members can log their daily hours and activities, linking them to specific projects and tasks.
- **Team Hierarchy**: A clear tree view of the team structure, showing reporting lines.
- **Performance Insights**: AI-powered performance summaries for team members based on their tasks and logs.
- **Financial Tracking**: Manage salaries, employee expense claims, and freelancer contracts.
- **Real-time Meetings**: Integrated video conferencing using Jitsi for seamless team collaboration.
- **Customizable Roles & Permissions**: Fine-grained control over what each user can see and do.
- **Reporting & Analytics**: Visualize data with charts to understand project costs, team productivity, and more.
- **Dark Mode**: A sleek dark theme for comfortable viewing in low-light environments.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend & Database**: Supabase (PostgreSQL, Auth, Realtime)
- **AI Integration**: Google Gemini API for generating performance notes and task plans.
- **Video Conferencing**: Jitsi Meet

## 🚀 Getting Started

1.  **Environment Variables**: Ensure you have a `.env` file with your `API_KEY` for the Google Gemini API.
2.  **Database Setup**: The application is configured to connect to a Supabase backend. The connection details can be configured in the app's settings.
3.  **Authentication**: The app uses Supabase Auth. Users can log in to access their personalized dashboard.

## 📁 Project Structure

- `components/`: Contains all React components, organized by feature (dashboard, project, team, etc.) and UI elements.
- `contexts/`: React Context providers for managing global state (Auth, Data, Projects, etc.).
- `services/`: Modules for interacting with external APIs (Supabase, Gemini).
- `types.ts`: Centralized TypeScript type definitions for the entire application.
- `utils/`: Helper functions for various tasks like date formatting, cost calculation, etc.
