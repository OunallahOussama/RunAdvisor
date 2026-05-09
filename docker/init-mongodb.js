// Initialize MongoDB with collections and indexes for vector search
db = db.getSiblingDB('runadvisor');

// Create users collection with indexes
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });

// Create activities collection with vector search index
db.createCollection('activities');
db.activities.createIndex({ userId: 1, date: -1 });
db.activities.createIndex({ performanceVector: 1 });

// Create recommendations collection
db.createCollection('recommendations');
db.recommendations.createIndex({ userId: 1, createdAt: -1 });
db.recommendations.createIndex({ status: 1 });

print('✅ RunAdvisor database initialized successfully!');
