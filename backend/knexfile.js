// knexfile.js
require('dotenv').config(); // Load .env variables

module.exports = {
  development: {
    client: process.env.DB_CLIENT,
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: './db/migrations', // Folder where migration files will be stored
    },
    seeds: {
      directory: './db/seeds', // Folder for seed files (optional)
    },
  },

  // Add configurations for staging, Itemion environments later
  // Itemion: { ... }
};