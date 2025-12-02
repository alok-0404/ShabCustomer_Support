# Customer Support API

A Node.js/Express backend API for Customer Support System.

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Copy the example environment file and update it with your values:
```bash
cp .env.example .env
```

Edit `.env` and update these required variables:
- `PORT` - Server port (default: 4000)
- `MONGO_URI` - MongoDB connection string
- `JWT_ACCESS_SECRET` - Secret key for JWT tokens (min 32 characters)

### 3. Generate JWT Secret (Optional)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start at `http://localhost:4000` (or the port you specified in `.env`)

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /search?userId=AB123` - Search user by ID
- `GET /branches?page=1&limit=10` - Get branches
- `GET /users?page=1&limit=10` - Get users
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/logout` - User logout
- `POST /admins` - Create admin (Root only)
- `GET /clients` - Get clients (SubAdmin only)
- `POST /otp/send` - Send OTP
- `POST /otp/verify` - Verify OTP

## Scripts

- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run seed:root` - Seed root admin user
- `npm run root:password` - Update root password
- `npm run root:email` - Update root email

## Environment Variables

See `.env.example` for all available environment variables and their descriptions.

## Requirements

- Node.js (v14 or higher)
- MongoDB (local or cloud like MongoDB Atlas)
- npm or yarn
