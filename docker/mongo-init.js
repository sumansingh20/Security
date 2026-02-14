// MongoDB initialization script
// This runs when the MongoDB container is first created

db = db.getSiblingDB('proctorexam');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'password', 'firstName', 'lastName', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          description: 'Email is required and must be a string'
        },
        role: {
          enum: ['student', 'admin'],
          description: 'Role must be either student or admin'
        }
      }
    }
  }
});

db.createCollection('exams');
db.createCollection('questions');
db.createCollection('submissions');
db.createCollection('violations');
db.createCollection('auditlogs');

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.exams.createIndex({ status: 1, startTime: 1, endTime: 1 });
db.exams.createIndex({ createdBy: 1 });
db.questions.createIndex({ exam: 1, order: 1 });
db.submissions.createIndex({ exam: 1, student: 1 }, { unique: true });
db.submissions.createIndex({ student: 1, status: 1 });
db.violations.createIndex({ submission: 1, timestamp: 1 });
db.auditlogs.createIndex({ user: 1, timestamp: -1 });
db.auditlogs.createIndex({ action: 1, timestamp: -1 });

print('Database initialization completed successfully!');
