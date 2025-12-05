require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-design-project';
const USER_JSON_PATH = path.join(__dirname, '../../../JSONDatabase/user.json');

async function migrateUsers() {
    try {
        // Connect to MongoDB
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Read users from JSON file
        console.log('📖 Reading users from JSON file...');
        const jsonData = await fs.readFile(USER_JSON_PATH, 'utf8');
        const users = JSON.parse(jsonData);
        console.log(`Found ${users.length} users in JSON file\n`);

        // Check if users already exist in MongoDB
        const existingCount = await User.countDocuments();
        if (existingCount > 0) {
            console.log(`⚠️  Warning: ${existingCount} users already exist in MongoDB`);
            const readline = require('readline').createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                readline.question('Do you want to continue? This will skip duplicate users. (yes/no): ', resolve);
            });
            readline.close();

            if (answer.toLowerCase() !== 'yes') {
                console.log('Migration cancelled.');
                process.exit(0);
            }
        }

        // Migrate each user
        let migrated = 0;
        let skipped = 0;
        let failed = 0;

        for (const userData of users) {
            try {
                // Check if user already exists
                const exists = await User.findOne({
                    $or: [
                        { username: userData.username.toLowerCase() },
                        { email: userData.email.toLowerCase() }
                    ]
                });

                if (exists) {
                    console.log(`⏭️  Skipping ${userData.username} (already exists)`);
                    skipped++;
                    continue;
                }

                // Validate email - if invalid, create a default one
                let email = userData.email;
                const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
                if (!emailRegex.test(email)) {
                    email = `${userData.username}@example.com`;
                    console.log(`⚠️  Invalid email for ${userData.username}, using: ${email}`);
                }

                // Create new user with the already-hashed password
                const newUser = new User({
                    username: userData.username.toLowerCase(),
                    email: email.toLowerCase(),
                    imageUrl: userData.imageUrl || '/img/default-profile.png',
                    createdAt: userData.createdAt || new Date()
                });

                // Manually set the hashed password (bypass the pre-save hook)
                // We'll save it directly without validation
                newUser.password = userData.password;
                
                // Save and skip the password hashing hook
                await User.collection.insertOne({
                    username: newUser.username,
                    email: newUser.email,
                    password: newUser.password,
                    imageUrl: newUser.imageUrl,
                    createdAt: newUser.createdAt,
                    updatedAt: new Date()
                });

                console.log(`✅ Migrated user: ${userData.username}`);
                migrated++;

            } catch (error) {
                console.error(`❌ Failed to migrate ${userData.username}:`, error.message);
                failed++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Migrated: ${migrated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📝 Total: ${users.length}`);

        // Close connection
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
console.log('🚀 Starting user migration from JSON to MongoDB...\n');
migrateUsers();
