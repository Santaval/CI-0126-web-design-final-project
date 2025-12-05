#!/usr/bin/env node

require('dotenv').config();

const { execSync } = require('child_process');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-design-project';

console.log('🔍 Checking MongoDB status...\n');

async function checkMongoDB() {
    try {
        // Try to connect
        console.log('🔌 Attempting to connect to MongoDB...');
        console.log(`📍 URI: ${MONGODB_URI}\n`);

        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log('✅ MongoDB is running and accessible!');
        console.log(`📊 Connected to database: ${mongoose.connection.name}`);
        
        // Check if users collection exists
        const collections = await mongoose.connection.db.listCollections().toArray();
        const hasUsers = collections.some(col => col.name === 'users');
        
        if (hasUsers) {
            const usersCollection = mongoose.connection.db.collection('users');
            const userCount = await usersCollection.countDocuments();
            console.log(`👥 Users in database: ${userCount}`);
        } else {
            console.log('ℹ️  No users collection found (run migration or register a user)');
        }

        await mongoose.connection.close();
        console.log('\n✨ MongoDB check complete!\n');
        process.exit(0);

    } catch (error) {
        console.error('❌ MongoDB is not running or not accessible\n');
        console.error('Error:', error.message);
        console.log('\n📋 To fix this:\n');
        console.log('1. Install MongoDB:');
        console.log('   brew tap mongodb/brew');
        console.log('   brew install mongodb-community\n');
        console.log('2. Start MongoDB:');
        console.log('   brew services start mongodb-community\n');
        console.log('3. Verify it\'s running:');
        console.log('   brew services list\n');
        process.exit(1);
    }
}

checkMongoDB();
