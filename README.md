# Project Management Application

A comprehensive, full-featured project management application built with Next.js, TypeScript, and PostgreSQL. Designed for field operations, engineering projects, and multi-stakeholder collaboration.

## 🚀 Features

### Must-Have Features ✅

- **Task Management**
  - Create, edit, and delete tasks
  - Assign owners and set due dates
  - Automated reminders for upcoming deadlines
  - Rich task descriptions with markdown support

- **Kanban Board with 5 Statuses**
  - Backlog
  - Next 7 Days
  - In Progress
  - Blocked
  - Done
  - Drag-and-drop functionality

- **Labels & Tags**
  - Pre-configured workstreams: Helium, Water/Desal, Community, Vendors, Finance/Legal
  - Custom color-coded labels
  - Filter tasks by label

- **Attachments & File Management**
  - Upload PDFs, images, drawings, quotes
  - Quick file previews
  - Organized file storage

- **Mobile & Offline Support**
  - Progressive Web App (PWA)
  - Offline data caching with IndexedDB
  - Service worker for background sync
  - Responsive design for all devices

- **Checklists & Subtasks**
  - Create nested checklists within tasks
  - Track completion progress
  - Subtask dependencies

- **Calendar & Timeline Views**
  - Month view calendar
  - List view with sorting
  - Visual deadline tracking

- **Comments & @Mentions**
  - Real-time commenting
  - Mention team members with @
  - Notification system

- **Bulk Import/Export**
  - CSV import for bulk task creation
  - CSV export for data portability
  - Easy migration between tools

- **Permissions System**
  - Board-level access control
  - Role-based permissions (Owner, Admin, Member, Viewer)
  - Secure sharing with chapters/vendors

- **Advanced Search**
  - Full-text search across tasks, comments, and attachments
  - Filter by status, assignee, labels
  - Quick keyboard shortcuts

### Nice-to-Have Features 🎯

- **Dependencies**
  - Task dependency tracking
  - Finish-to-Start, Start-to-Start relationships
  - Automatic blocking status

- **Gantt View**
  - Visual timeline for critical path
  - Milestone tracking
  - Resource allocation view

- **Automations**
  - Auto-assign based on rules
  - Status transitions
  - Reminder notifications
  - Webhook integrations

- **Templates**
  - Reusable task templates
  - Pre-built checklists
  - Project templates (e.g., "Drill water well", "Helium vendor outreach")

- **Forms**
  - Custom data collection forms
  - Field site notes
  - Vendor information capture

- **Dashboards**
  - Real-time metrics
  - Task distribution by area
  - Upcoming milestones
  - Risk heatmap

- **Custom Fields**
  - Well ID, casing size, flow rate
  - Formation type, permit numbers
  - Flexible field types (text, number, date, dropdown)

- **Document Hub**
  - Version control for documents
  - MOU drafts, specifications
  - Integration with Google Drive

- **Audit Trail**
  - Complete activity history
  - Who changed what and when
  - Compliance tracking

- **Map/GIS Integration**
  - Lat/long fields
  - Google Maps links
  - Site location tracking

- **Risk Register**
  - Impact/likelihood matrix
  - Mitigation strategies
  - Risk tracking over time

- **Procurement CRM**
  - Vendor contacts
  - Quote management
  - Lead time tracking

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, Radix UI components
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: TanStack Query (React Query), Zustand
- **File Upload**: Formidable
- **Offline Support**: IndexedDB (idb), Service Workers
- **Charts**: Recharts
- **Drag & Drop**: react-dnd
- **Calendar**: Custom calendar component

## 📦 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Random secret for authentication
   - `NEXTAUTH_URL`: Your application URL

4. **Set up the database**

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🗄️ Database Schema

The application uses PostgreSQL with the following main entities:

- **Users**: Authentication and user profiles
- **Boards**: Project workspaces
- **Tasks**: Core task management
- **Labels**: Categorization and tagging
- **Comments**: Discussion threads
- **Attachments**: File storage
- **Checklists**: Task breakdowns
- **Dependencies**: Task relationships
- **Activities**: Audit trail
- **Notifications**: User alerts
- **Templates**: Reusable patterns
- **Automations**: Workflow rules

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables for Production

Ensure these are set in your production environment:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### Recommended Hosting

- **Vercel**: <https://vercel.com/> (Optimized for Next.js)
- **Railway**: <https://railway.app/> (Easy PostgreSQL setup)
- **Render**: <https://render.com/> (Full-stack hosting)
- **AWS/GCP/Azure**: <https://aws.amazon.com/>, <https://cloud.google.com/>, <https://azure.microsoft.com/> (Enterprise deployments)

## 📱 Mobile & Offline Usage

The app is a Progressive Web App (PWA) that works offline:

1. **Install on mobile**: Open in browser and select "Add to Home Screen"
2. **Offline mode**: Data is cached locally and syncs when online
3. **Background sync**: Changes made offline sync automatically

## 🔐 Security

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control (RBAC)
- SQL injection protection via Prisma
- XSS protection
- CSRF tokens

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run linter
npm run lint
```

## 📚 API Documentation

### Authentication

- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

### Boards

- `GET /api/boards` - List all boards
- `POST /api/boards` - Create board
- `GET /api/boards/[id]` - Get board details
- `PUT /api/boards/[id]` - Update board
- `DELETE /api/boards/[id]` - Delete board

### Tasks

- `GET /api/tasks` - List tasks (with filters)
- `POST /api/tasks` - Create task
- `GET /api/tasks/[id]` - Get task details
- `PUT /api/tasks/[id]` - Update task
- `DELETE /api/tasks/[id]` - Delete task
- `POST /api/tasks/[id]/comments` - Add comment
- `POST /api/tasks/[id]/attachments` - Upload attachment
- `POST /api/tasks/[id]/checklists` - Add checklist

### Search

- `GET /api/search?q=query` - Search across all content

### Import/Export

- `GET /api/tasks/export?boardId=xxx` - Export tasks to CSV
- `POST /api/tasks/import` - Import tasks from CSV

## 📥 CSV Imports & Drag-and-Drop

- **Task Imports** (`/boards/[id]` → Import CSV)
  - Drag & drop or browse for `.csv` files in the board import modal.
  - Required column: `Title`
  - Optional columns: `Description`, `Status`, `Priority`, `Assignee`, `Start Date`, `Due Date`
  - Uses `POST /api/tasks/import` with automatic status/assignee matching.

- **Contacts Imports** (`/contacts` → Import CSV)
  - Supports headers like `First Name`, `Last Name`, `Email`, `Phone`, `Company`, `Job Title`, `Job Function`, `Stage`, `Owner`, `Tags`, `Notes`.
  - Sends data to `POST /api/contacts/import`, linking owners by email.

- **Vendor Imports** (`/vendors` board or provided `boardId`)
  - Recognizes `Company`, `Category`, `Subcategory`, `Region`, `Point of Contact`, `Phone`, `Email`, `Website`, `Status`, `Priority`, `Notes`.
  - Imports via `POST /api/vendors/import`, storing vendor details inside `Task.customFields`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

- Open an issue on GitHub
- Email: <support@example.com>
- Documentation: <https://link-to-docs>

## 🗺️ Roadmap

- [ ] Mobile native apps (React Native)
- [ ] Real-time collaboration (WebSockets)
- [ ] Advanced reporting and analytics
- [ ] Integration marketplace
- [ ] AI-powered task suggestions
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Email notifications
- [ ] Slack/Teams integration
- [ ] Time tracking
- [ ] Budget management
- [ ] Resource planning

## 👥 Team

Built for field operations, engineering teams, and multi-stakeholder projects.

---

**Version**: 1.0.0  
**Last Updated**: 2024
