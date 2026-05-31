import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a demo school
  const school = await prisma.school.create({
    data: {
      name: 'Springfield High School',
      address: '123 Education Ave, Springfield, IL',
      latitude: 28.6139, // New Delhi coordinates as example
      longitude: 77.2090,
      radiusMeters: 200 // 200 meter radius
    }
  });

  console.log(`📍 School created: ${school.name} (radius: ${school.radiusMeters}m)`);

  // Create demo admin
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.teacher.create({
    data: {
      name: 'Admin User',
      email: 'admin@school.com',
      passwordHash: adminHash,
      schoolId: school.id,
      role: 'admin',
      status: 'active'
    }
  });

  // Create demo teachers
  const teacherData = [
    { name: 'Sarah Johnson', email: 'sarah@school.com' },
    { name: 'Michael Chen', email: 'michael@school.com' },
    { name: 'Emily Davis', email: 'emily@school.com' },
    { name: 'Rajesh Kumar', email: 'rajesh@school.com' },
    { name: 'Priya Sharma', email: 'priya@school.com' },
  ];

  for (const data of teacherData) {
    const hash = await bcrypt.hash('teacher123', 12);
    await prisma.teacher.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: hash,
        schoolId: school.id,
        role: 'teacher',
        status: 'active'
      }
    });
  }

  console.log(`👥 Created ${teacherData.length} demo teachers`);
  console.log('');
  console.log('📋 Demo Credentials:');
  console.log('   Admin: admin@school.com / admin123');
  console.log('   Teacher: sarah@school.com / teacher123');
  console.log('');
  console.log('✅ Database seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
