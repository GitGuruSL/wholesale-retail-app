// filepath: backend/db/knex.js
const environment = process.env.NODE_ENV || 'development';
const config = require('../knexfile')[environment]; // Loads the configuration from knexfile.js
const knex = require('knex')(config); // Initializes Knex with the loaded config

module.exports = knex; // Exports the initialized Knex instance