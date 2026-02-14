import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const createUser = async () => {
  const args = process.argv.slice(2);
  let email = null;
  let password = null;
  let firstName = 'User';
  let lastName = 'Account';
  let role = 'student';
  let studentId = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    } else if (args[i] === '--firstName' && args[i + 1]) {
      firstName = args[i + 1];
      i++;
    } else if (args[i] === '--lastName' && args[i + 1]) {
      lastName = args[i + 1];
      i++;
    } else if (args[i] === '--role' && args[i + 1]) {
      role = args[i + 1];
      i++;
    } else if (args[i] === '--studentId' && args[i + 1]) {
      studentId = args[i + 1];
      i++;
    }
  }

  if (!email || !password) {
    console.error('\n❌ Error: Email and password are required!\n');
    console.log('Usage:');
    console.log('  node src/scripts/create-user.js --email student@proctorexam.com --password Studdent@123 --role admin\n');
    console.log('Options:');
    console.log('  --email       Email address (required)');
    console.log('  --password    Password (required)');
    console.log('  --firstName   First name (default: User)');
    console.log('  --lastName    Last name (default: Account)');
    console.log('  --role        Role: admin or student (default: student)');
    console.log('  --studentId   Student ID (optional)\n');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/proctorexam');
    console.log('✅ Connected to MongoDB\n');

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log(`⚠️  User "${email}" already exists, skipping...`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const userData = {
      email,
      password,
      firstName,
      lastName,
      role,
      isVerified: true,
      isActive: true,
    };

    if (studentId) {
      userData.studentId = studentId;
    }

    const user = await User.create(userData);

    console.log('✅ Account created successfully!\n');
    console.log('📧 Email:', user.email);
    console.log('👤 Name:', `${user.firstName} ${user.lastName}`);
    console.log('🔑 Role:', user.role);
    console.log('\n💡 You can now log in at /login\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createUser();
