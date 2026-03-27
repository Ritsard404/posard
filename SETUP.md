# POSard - Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (already configured)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup

Your `.env.local` is already configured with:
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Authentication
- **API Keys**: Connected and ready

No additional .env setup needed! ✅

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Accounts

### 🔐 Login at `/auth/login`

All test accounts use password: **`200303`**

#### Admin Account 👑
- **Email**: `posard@pos.com`
- **Password**: `200303`
- **Access**: All features
  - Dashboard
  - POS System
  - Inventory Management
  - Orders
  - Transactions
  - User Management
  - Reports
  - Settings

#### Manager Account 📊
- **Email**: `manager@posard.com`
- **Password**: `200303`
- **Access**: Limited to:
  - Dashboard
  - Orders
  - Inventory Management
  - Profile

#### Cashier Account 💳
- **Email**: `cashier@posard.com`
- **Password**: `200303`
- **Access**: Limited to:
  - Dashboard
  - POS System
  - Transactions
  - Profile

---

## Feature Overview by Role

| Feature | Admin | Manager | Cashier |
|---------|:-----:|:-------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ |
| POS/Checkout | ✅ | ❌ | ✅ |
| Inventory | ✅ | ✅ | ❌ |
| Orders | ✅ | ✅ | ❌ |
| Transactions | ✅ | ❌ | ✅ |
| Users | ✅ | ❌ | ❌ |
| Reports | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

---

## Testing User Permissions

### Test Unauthorized Access
1. Log in as **Cashier** (`cashier@posard.com`)
2. Try to navigate to `/admin` or `/inventory`
3. You should see an **"Unauthorized"** page ✅

### Test Role-Based Navigation
1. Log in as **Admin** - see full sidebar menu
2. Log out and log in as **Manager** - see limited menu
3. Log out and log in as **Cashier** - see minimal menu

### Test Auto-Redirect
1. Log in as any role
2. Visit `http://localhost:3000/`
3. You'll auto-redirect to `/dashboard` ✅

---

## Build & Deploy

### Build for Production
```bash
npm run build
# Then run: npm start
```

### Run Linter
```bash
npm run lint
```

---

## Troubleshooting

### Build Fails with Missing Modules
Missing files:
- `@/components/accounts/AccountTable`
- `@/features/member/member.hooks`

**Solution**: These are placeholder imports. Remove them from `app/(protected)/accounts/page.tsx` or create stub files if you need the accounts page.

### Can't Log In
- Verify `.env.local` has correct Supabase URL and keys
- Check test account email in Supabase dashboard

### Role Not Showing in Sidebar
- Wait 2-3 seconds for sidebar to load user profile
- Check browser console for errors
- Log out and log back in

---

## Architecture

### Key Files
```
lib/
├── permissions.ts          # Role-to-permission mapping
├── navigation.ts           # Routes & navigation config
└── supabase/
    ├── proxy.ts           # Middleware (auth, permissions)
    ├── server.ts          # Server-side client
    └── client.ts          # Browser-side client

app/
├── page.tsx               # Landing page (redirects logged-in users)
├── auth/                  # Login, signup, forgot password
└── (protected)/           # Dashboard & role-based routes
    ├── layout.tsx         # Sidebar + header layout
    ├── dashboard/
    ├── pos/
    ├── inventory/
    └── ...
```

### Permission-Based Access Control
- **Admin**: All permissions
- **Manager**: `view.dashboard`, `view.orders`, `view.inventory`, `view.profile`
- **Cashier**: `view.dashboard`, `view.pos`, `view.transactions`, `view.profile`

---

## Database

### Supabase Project
- **URL**: https://icgxiznphwdpsubugejl.supabase.co
- **Region**: ap-south-1 (Singapore)
- **Connection**: Pooled (port 6543)

### Required Tables
- `profiles` - User roles and status
- `auth.users` - Supabase auth users

---

## Next Steps

1. ✅ Test all 3 user accounts
2. ✅ Verify role-based sidebar filtering
3. ✅ Test permission middleware (try unauthorized routes)
4. 🔄 Create missing feature components (Accounts, Reports, etc.)
5. 🔄 Add your business logic for POS, Inventory, etc.

---

## Support

For errors or issues, check:
1. Browser console (Ctrl+Shift+I)
2. Terminal output from `npm run dev`
3. Supabase dashboard > Auth > Users (verify accounts exist)
4. Test with incognito window to clear cache
