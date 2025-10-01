# HR Analytics Dashboard

A comprehensive HR analytics application for tracking employee data, attrition rates, and workforce metrics with interactive visualizations and Excel import capabilities.

## Features

- 📊 **Real-time Analytics** - Track attrition rates, headcount trends, and workforce distribution
- 👥 **Employee Management** - View, search, and manage employee records with status tracking
- 💰 **Salary Visualization** - Interactive scatter charts showing salary distribution across levels
- 📊 **Salary Range Management** - Define and manage salary ranges with variable pay percentages
- 📈 **Interactive Charts** - Visualize data by pod, level, location, and gender
- 📅 **Period-based Analysis** - Analyze metrics across custom date ranges (defaults to financial year)
- 📤 **Excel Import** - Bulk upload employee data via Excel files
- 🔐 **Authentication** - Secure login system with role-based access
- ⚡ **Automated Status Updates** - Automatic employee status transitions based on exit dates
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: shadcn/ui, Tailwind CSS
- **Charts**: Recharts
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **File Processing**: XLSX (Excel parsing)

## Deployment Options

### Option 1: Lovable Cloud (Recommended)

This is the easiest way to get started - everything is pre-configured!

#### Prerequisites
- A Lovable account

#### Setup Steps

1. **Fork/Remix this project in Lovable**
   - Visit [Lovable](https://lovable.dev) and import this repository
   - The backend (database, auth, storage) is automatically provisioned

2. **The app is ready!**
   - Database schema is auto-deployed
   - Authentication is pre-configured
   - No environment variables needed

3. **Deploy**
   - Click "Publish" in Lovable
   - Your app is live at `your-project.lovable.app`

#### Managing Your Backend
- Access your database, users, and settings through Lovable's backend interface
- No Supabase account needed

---

### Option 2: Self-Hosted with Custom Backend

If you want to host this on your own infrastructure:

#### Prerequisites
- Node.js 18+ and npm/bun
- A Supabase account (or any PostgreSQL database)

#### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up Supabase Project**
   - Create a new project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key

4. **Run Database Migrations**
   
   Execute the SQL migrations in `supabase/migrations/` in order, or use the Supabase CLI:
   
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

5. **Configure Environment Variables**
   
   Create a `.env` file in the root directory:
   
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_PROJECT_ID=your-project-id
   ```

6. **Configure Authentication**
   
   In your Supabase dashboard:
   - Go to Authentication → URL Configuration
   - Add your site URL (e.g., `http://localhost:5173` for local dev)
   - Add redirect URLs for your deployment domains
   - Enable email auto-confirmation for testing (optional)

7. **Run locally**
   ```bash
   npm run dev
   # or
   bun run dev
   ```
   
   App will be available at `http://localhost:5173`

8. **Deploy**
   
   Deploy to your preferred hosting platform:
   - **Vercel**: `vercel deploy`
   - **Netlify**: Connect your repo and deploy
   - **Custom server**: `npm run build` and serve the `dist` folder

   Make sure to set the environment variables in your hosting platform!

## Database Schema

### Tables

#### `employees`
Stores all employee information:
- `id` (uuid, primary key)
- `empl_no` (text, unique employee number)
- `name` (text)
- `official_email` (text)
- `mobile_number` (text, nullable)
- `personal_email` (text, nullable)
- `doj` (date, date of joining)
- `date_of_exit` (date, nullable, required when status is "Serving Notice Period")
- `birthday` (date, nullable)
- `status` (text, default: 'Active')
- `type` (text, default: 'EMP')
- `pod` (text)
- `pod_lead` (text, nullable)
- `reporting_manager` (text, nullable)
- `level` (text)
- `location` (text)
- `gender` (text, nullable)
- `salary` (numeric, nullable, fixed salary amount)
- `created_at`, `updated_at` (timestamps)

#### `profiles`
User profile information:
- `id` (uuid, references auth.users)
- `email` (text)
- `full_name` (text, nullable)
- `created_at`, `updated_at` (timestamps)

#### `user_roles`
Role-based access control:
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `role` (enum: 'super_admin', 'admin', 'user')

#### `salary_ranges`
Define salary ranges for each level:
- `id` (uuid, primary key)
- `level` (text, employee level)
- `min_salary` (numeric, minimum fixed salary)
- `max_salary` (numeric, maximum fixed salary)
- `variable_pay_percentage` (numeric, percentage of fixed salary for variable pay)
- `created_at`, `updated_at` (timestamps)

### Row Level Security (RLS)

All tables have RLS policies enabled:
- **Employees**: Authenticated users can view/insert/update; only super admins can delete
- **Profiles**: Users can view all profiles and update their own
- **User Roles**: Only super admins can manage roles
- **Salary Ranges**: Authenticated users can view; only super admins can insert/update/delete

## Excel Import Format

The app supports importing employees via Excel files with these columns:

| Column | Type | Required | Example |
|--------|------|----------|---------|
| Employee Number | Text | Yes | EMP001 |
| Name | Text | Yes | John Doe |
| Official Email | Email | Yes | john@company.com |
| Mobile Number | Text | No | +91-9876543210 |
| Personal Email | Email | No | john.doe@gmail.com |
| Date of Joining | Date | Yes | 01-04-2024 |
| Date of Exit | Date | No | 31-03-2025 |
| Birthday | Date | No | 15-06-1990 |
| Status | Text | No | Active |
| Type | Text | No | EMP |
| Pod | Text | Yes | Engineering |
| Pod Lead | Text | No | Jane Smith |
| Reporting Manager | Text | No | Jane Smith |
| Level | Text | Yes | L3 |
| Location | Text | Yes | Bangalore |
| Gender | Text | No | Male |
| Salary | Number | No | 1200000 |

## Development

### Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── DashboardLayout.tsx
│   │   ├── EmployeeImport.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── SalaryScatterChart.tsx
│   │   └── SalaryRangesTable.tsx
│   ├── pages/              # Page components
│   │   ├── Analytics.tsx
│   │   ├── Auth.tsx
│   │   ├── Employees.tsx
│   │   ├── Salary.tsx
│   │   └── Users.tsx
│   ├── hooks/              # Custom React hooks
│   │   └── useAuth.ts
│   ├── integrations/       # API integrations
│   │   └── supabase/
│   ├── lib/                # Utility functions
│   └── main.tsx            # App entry point
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── invite-user/    # User invitation edge function
│   │   └── update-employee-status/  # Daily cron job for status updates
│   └── migrations/         # Database migrations
└── public/                 # Static assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **Database changes**: Use Supabase migrations
   ```bash
   supabase migration new your_migration_name
   ```

2. **New pages**: Add to `src/pages/` and update routing in `src/App.tsx`

3. **UI components**: Use shadcn/ui or create custom components in `src/components/`

## Authentication Flow

1. Users sign up/login via `/auth` page
2. Sessions are persisted in localStorage
3. Protected routes check authentication status
4. User roles determine access to features (e.g., user management)

## Key Features Detail

### Salary Visualization

The salary visualization page provides comprehensive salary analysis:

- **Scatter Chart**: Visualize salary distribution across all employees, grouped by level
- **Salary Modes**: 
  - **Fixed Salary**: Base salary amount
  - **Fixed + EPF**: Base salary + 6% EPF contribution
  - **CTC**: Complete Cost to Company (Fixed + EPF + Variable Pay)
- **Interactive Level Selection**: Click on any level to display min, max, and median salary lines
- **Detailed Tooltips**: Hover over employee data points to see breakdown of salary components
- **Salary Range Management**: Super admins can define and update salary ranges for each level

### Employee Status Management

The system includes intelligent status tracking:

- **Status Validation**: When changing status to "Serving Notice Period", Date of Exit is mandatory
- **Automatic Status Updates**: A daily cron job automatically updates employees from "Serving Notice Period" to "Inactive" when their exit date is reached
- **Status Options**: Active, Inactive, Serving Notice Period

### Analytics Calculations

#### Attrition Rate
```
Attrition Rate = (Employees Who Left / Average Headcount) × 100

Where:
- Employees Who Left = Count of employees with date_of_exit in period
- Average Headcount = (Headcount at Start + Headcount at End) / 2
- Default period = Current Financial Year (April 1 - March 31)
```

## Support

- **Documentation**: [Lovable Docs](https://docs.lovable.dev)
- **Issues**: Create an issue in this repository
- **Community**: [Lovable Discord](https://discord.gg/lovable)

## License

MIT License - feel free to use this project for your organization!

---

Built with ❤️ using [Lovable](https://lovable.dev)
