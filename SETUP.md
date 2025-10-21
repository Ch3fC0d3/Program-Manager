# Setup Guide

Follow these steps to get the project management application running on your machine.

## Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **npm** or **yarn**

## Step-by-Step Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```sql
CREATE DATABASE projectmanagement;
```

Or use a cloud provider:
- **Supabase** (free tier available)
- **Railway** (PostgreSQL included)
- **Neon** (serverless PostgreSQL)

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the following:

```env
# Database - Update with your PostgreSQL connection string
DATABASE_URL="postgresql://username:password@localhost:5432/projectmanagement?schema=public"

# NextAuth - Generate a secret with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret-here"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev --name init
```

This will:
- Create all database tables
- Generate Prisma Client

### 5. Seed the Database (Optional)

Populate with demo data:

```bash
npx prisma db seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Demo users: `john@example.com` / `admin123`, `jane@example.com` / `admin123`
- Sample board with tasks
- Pre-configured labels (Helium, Water/Desal, Community, Vendors, Finance/Legal)

### 6. Create Upload Directory

```bash
mkdir -p public/uploads
```

### 7. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 8. Login

Use the admin credentials:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## Troubleshooting

### Database Connection Issues

If you see connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # On Windows
   pg_ctl status
   
   # On Mac/Linux
   sudo systemctl status postgresql
   ```

2. Check your `DATABASE_URL` format:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
   ```

3. Test connection with Prisma:
   ```bash
   npx prisma db pull
   ```

### Port Already in Use

If port 3000 is taken:

```bash
# Use a different port
PORT=3001 npm run dev
```

### Module Not Found Errors

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Prisma Client Issues

Regenerate Prisma Client:

```bash
npx prisma generate
```

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables

Ensure these are set in production:
- `DATABASE_URL` - Production database
- `NEXTAUTH_SECRET` - Strong random secret
- `NEXTAUTH_URL` - Your production URL

### Recommended Platforms

1. **Vercel** (Frontend)
   - Connect GitHub repository
   - Add environment variables
   - Auto-deploys on push

2. **Railway** (Database + Full Stack)
   - PostgreSQL included
   - Easy environment setup
   - One-click deploy

3. **Render** (Full Stack)
   - Free tier available
   - PostgreSQL included
   - Docker support

## Database Management

### View Data with Prisma Studio

```bash
npx prisma studio
```

Opens a GUI at `http://localhost:5555`

### Create a New Migration

After schema changes:

```bash
npx prisma migrate dev --name description_of_change
```

### Reset Database

⚠️ **Warning**: This deletes all data

```bash
npx prisma migrate reset
```

## Development Tips

### Hot Reload

The dev server supports hot reload. Changes to files will automatically refresh.

### API Testing

Use tools like:
- **Postman**
- **Insomnia**
- **Thunder Client** (VS Code extension)

### Database Inspection

```bash
# View current schema
npx prisma db pull

# Format schema file
npx prisma format
```

## Next Steps

1. Customize labels for your workstreams
2. Invite team members
3. Create your first board
4. Set up automations
5. Configure notifications

## Support

For issues:
1. Check the [README.md](README.md)
2. Review error logs in terminal
3. Check browser console for frontend errors
4. Open an issue on GitHub

## Security Notes

- Change default passwords immediately
- Use strong `NEXTAUTH_SECRET` in production
- Enable HTTPS in production
- Regularly update dependencies
- Back up your database

---

**Ready to go!** 🚀 Start by logging in and creating your first board.
