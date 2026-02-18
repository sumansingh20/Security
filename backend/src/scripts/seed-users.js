import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const seedUsers = async () => {
  // MongoDB Connection
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/proctorexam';
  
  console.log('\n🌱 Seeding demo users...\n');
  console.log('Connecting to MongoDB...');

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }

  // Demo users to create
  const demoUsers = [
    {
      email: 'admin@proctorexam.com',
      password: 'Admin@123',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      employeeId: 'EMP001',
      department: 'Administration',
    },
    {
      email: 'teacher@proctorexam.com',
      password: 'Teacher@123',
      firstName: 'Demo',
      lastName: 'Teacher',
      role: 'teacher',
      employeeId: 'EMP002',
      department: 'Computer Science',
    },
    {
      email: 'student@proctorexam.com',
      password: 'Student@123',
      firstName: 'Demo',
      lastName: 'Student',
      role: 'student',
      studentId: 'STU001',
      department: 'Computer Science',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const userData of demoUsers) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      
      if (existingUser) {
        console.log(`⏭️  User already exists: ${userData.email} (${userData.role})`);
        skipped++;
        continue;
      }

      // Create new user
      const user = new User({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        studentId: userData.studentId || undefined,
        employeeId: userData.employeeId || undefined,
        department: userData.department,
        isActive: true,
        isVerified: true,
        emailVerified: true,
      });

      await user.save();
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${userData.email}:`, error.message);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${demoUsers.length}`);

  console.log('\n📋 Demo Accounts:');
  console.log('┌─────────────────────────────────┬───────────────┬──────────────┐');
  console.log('│ Email                           │ Password      │ Role         │');
  console.log('├─────────────────────────────────┼───────────────┼──────────────┤');
  console.log('│ admin@proctorexam.com           │ Admin@123     │ admin        │');
  console.log('│ teacher@proctorexam.com         │ Teacher@123   │ teacher      │');
  console.log('│ student@proctorexam.com         │ Student@123   │ student      │');
  console.log('└─────────────────────────────────┴───────────────┴──────────────┘');

  await mongoose.disconnect();
  console.log('\n✅ Database seeding completed!\n');
  process.exit(0);
};

seedUsers().catch((error) => {
  console.error('❌ Seed error:', error);
  process.exit(1);
});
