import { Router } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

// Mock user data (replace with database in production)
const users = [
  {
    id: '1',
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Test User',
  },
];

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = users.find((u) => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Create token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
  });
});

router.post('/register', (req, res) => {
  const { email, password, fullName } = req.body;

  // Check if user exists
  if (users.some((u) => u.email === email)) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Create new user
  const newUser = {
    id: String(users.length + 1),
    email,
    password,
    fullName,
  };

  users.push(newUser);

  // Create token
  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
    },
  });
});

export const authRouter = router;
