/**
 * Seed Demo Students Script
 * Creates test students with Date of Birth for exam engine testing
 * 
 * Run: npm run seed-students
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/proctorexam';

// User Schema (simplified for seeding)
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, lowercase: true },
  password: String,
  firstName: String,
  lastName: String,
  role: { type: String, default: 'student' },
  studentId: { type: String, sparse: true },
  department: String,
  batch: String,
  dateOfBirth: Date,
  rollNumber: String,
  section: String,
  semester: Number,
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Generate students
const departments = ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];
const sections = ['A', 'B', 'C'];
const batches = ['2021', '2022', '2023', '2024'];

// Hash password (simple for demo)
import bcrypt from 'bcryptjs';

async function createStudents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const students = [];
    const baseYear = 2000;
    
    // Create 100 demo students
    for (let i = 1; i <= 100; i++) {
      const dept = departments[i % departments.length];
      const section = sections[i % sections.length];
      const batch = batches[i % batches.length];
      const semester = (i % 8) + 1;
      
      // Random DOB between 1998-2005
      const year = baseYear + (i % 7);
      const month = (i % 12);
      const day = (i % 28) + 1;
      const dob = new Date(year, month, day);
      
      // Format DOB as password (DDMMYYYY)
      const dobPassword = `${String(day).padStart(2, '0')}${String(month + 1).padStart(2, '0')}${year}`;
      const hashedPassword = await bcrypt.hash(dobPassword, 10);
      
      students.push({
        email: `student${String(i).padStart(3, '0')}@university.edu`,
        password: hashedPassword,
        firstName: `Student`,
        lastName: `${String(i).padStart(3, '0')}`,
        role: 'student',
        studentId: `STU${batch}${String(i).padStart(4, '0')}`,
        rollNumber: `${batch}${dept.substring(0, 2).toUpperCase()}${String(i).padStart(3, '0')}`,
        department: dept,
        batch: batch,
        section: section,
        semester: semester,
        dateOfBirth: dob,
        isActive: true,
        isVerified: true,
      });
    }

    // Create specific test students
    const testStudents = [
      {
        email: 'john.doe@university.edu',
        firstName: 'John',
        lastName: 'Doe',
        studentId: 'STU20230001',
        rollNumber: '2023CS001',
        department: 'Computer Science',
        dateOfBirth: new Date(2002, 2, 15), // 15-03-2002
        dobPassword: '15032002',
      },
      {
        email: 'jane.smith@university.edu',
        firstName: 'Jane',
        lastName: 'Smith',
        studentId: 'STU20230002',
        rollNumber: '2023CS002',
        department: 'Computer Science',
        dateOfBirth: new Date(2001, 7, 20), // 20-08-2001
        dobPassword: '20082001',
      },
      {
        email: 'bob.wilson@university.edu',
        firstName: 'Bob',
        lastName: 'Wilson',
        studentId: 'STU20230003',
        rollNumber: '2023EE001',
        department: 'Electronics',
        dateOfBirth: new Date(2002, 11, 5), // 05-12-2002
        dobPassword: '05122002',
      },
    ];

    for (const ts of testStudents) {
      const hashedPassword = await bcrypt.hash(ts.dobPassword, 10);
      students.push({
        email: ts.email,
        password: hashedPassword,
        firstName: ts.firstName,
        lastName: ts.lastName,
        role: 'student',
        studentId: ts.studentId,
        rollNumber: ts.rollNumber,
        department: ts.department,
        batch: '2023',
        section: 'A',
        semester: 3,
        dateOfBirth: ts.dateOfBirth,
        isActive: true,
        isVerified: true,
      });
    }

    // Insert students (skip duplicates)
    let created = 0;
    let skipped = 0;
    
    for (const student of students) {
      try {
        await User.findOneAndUpdate(
          { email: student.email },
          student,
          { upsert: true, new: true }
        );
        created++;
      } catch (error) {
        if (error.code === 11000) {
          skipped++;
        } else {
          throw error;
        }
      }
    }

    console.log('\n========================================');
    console.log('  DEMO STUDENTS CREATED');
    console.log('========================================\n');
    console.log(`Total Created/Updated: ${created}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log('\n----------------------------------------');
    console.log('TEST STUDENT CREDENTIALS (login with DOB):');
    console.log('----------------------------------------');
    console.log('Email: john.doe@university.edu');
    console.log('Student ID: STU20230001');
    console.log('Password (DOB): 15032002 or 15-03-2002');
    console.log('');
    console.log('Email: jane.smith@university.edu');
    console.log('Student ID: STU20230002');
    console.log('Password (DOB): 20082001 or 20-08-2001');
    console.log('');
    console.log('Email: bob.wilson@university.edu');
    console.log('Student ID: STU20230003');
    console.log('Password (DOB): 05122002 or 05-12-2002');
    console.log('----------------------------------------\n');

    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('Error creating students:', error);
    process.exit(1);
  }
}

createStudents();
