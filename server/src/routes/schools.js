import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/schools
 * List all schools
 */
router.get('/', async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: { _count: { select: { teachers: true } } }
    });
    res.json({ schools });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
});

/**
 * GET /api/schools/:id
 * Get school details with geofence config
 */
router.get('/:id', async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.params.id },
      include: {
        teachers: { select: { id: true, name: true, email: true, status: true } },
        _count: { select: { teachers: true, attendance: true } }
      }
    });

    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json({ school });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch school' });
  }
});

/**
 * POST /api/schools
 * Create a new school with geofence configuration
 */
router.post('/', async (req, res) => {
  try {
    const { name, address, latitude, longitude, radiusMeters } = req.body;

    const school = await prisma.school.create({
      data: {
        name,
        address,
        latitude,
        longitude,
        radiusMeters: radiusMeters || 200
      }
    });

    res.status(201).json({ school });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ error: 'Failed to create school' });
  }
});

/**
 * PUT /api/schools/:id
 * Update school geofence settings
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, address, latitude, longitude, radiusMeters } = req.body;

    const school = await prisma.school.update({
      where: { id: req.params.id },
      data: { name, address, latitude, longitude, radiusMeters }
    });

    res.json({ school });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update school' });
  }
});

export default router;
