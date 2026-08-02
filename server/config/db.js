const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        // Skip if not explicitly provided, helpful for scaffolding Phase 1
        if (!mongoUri || mongoUri === 'replace_with_mongo_uri') {
            console.log('MongoDB connection skipped: No valid MONGO_URI provided.');
            return;
        }

        const conn = await mongoose.connect(mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // Let the server run even if DB fails for scaffolding purposes
    }
};

module.exports = connectDB;
