require('dotenv').config();

const config = {
  mongodb: {
    // using MongoDB connection string from env
    url: process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp-saas",
    databaseName: process.env.MONGODB_DB_NAME || "whatsapp-saas",
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  migrationsDir: "src/migrations",
  changelogCollectionName: "changelog",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: 'commonjs',
};

module.exports = config;
