import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new teacher with optional face descriptor
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, schoolId, faceDescriptor, role } = req.body;

    // Check if email already exists
    const existing = await prisma.teacher.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create teacher
    const teacher = await prisma.teacher.create({
      data: {
        name,
        email,
        passwordHash,
        schoolId,
        faceDescriptor: faceDescriptor ? JSON.stringify(faceDescriptor) : null,
        role: role || 'teacher'
      },
      include: { school: true }
    });

    // Generate JWT
    const token = jwt.sign(
      { id: teacher.id, email: teacher.email, role: teacher.role, schoolId: teacher.schoolId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        school: teacher.school,
        hasFaceData: !!teacher.faceDescriptor
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await prisma.teacher.findUnique({
      where: { email },
      include: { school: true }
    });

    if (!teacher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordValid = await bcrypt.compare(password, teacher.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: teacher.id, email: teacher.email, role: teacher.role, schoolId: teacher.schoolId },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        role: teacher.role,
        school: teacher.school,
        hasFaceData: !!teacher.faceDescriptor
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/face-register
 * Register/update face descriptor for authenticated teacher
 */
router.post('/face-register', authenticateToken, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ error: 'Valid face descriptor array required' });
    }

    const teacher = await prisma.teacher.update({
      where: { id: req.user.id },
      data: { faceDescriptor: JSON.stringify(faceDescriptor) }
    });

    res.json({ 
      success: true, 
      message: 'Face data registered successfully',
      hasFaceData: true 
    });
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({ error: 'Face registration failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.user.id },
      include: { school: true }
    });

    res.json({
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      role: teacher.role,
      school: teacher.school,
      hasFaceData: !!teacher.faceDescriptor
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
