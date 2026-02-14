const mongoose = require('mongoose');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      await mongoose.connect(dbConfig.mongoUri, dbConfig.options);
      this.connection = mongoose.connection;
      
      this.connection.on('error', (err) => {
        logger.error('Error koneksi MongoDB', { error: err.message });
      });

      this.connection.on('disconnected', () => {
        logger.warn('MongoDB terputus');
      });

      this.connection.on('reconnected', () => {
        logger.info('MongoDB terhubung kembali');
      });

      logger.info('MongoDB berhasil terhubung', { 
        host: this.connection.host,
        name: this.connection.name 
      });
    } catch (error) {
      logger.error('Gagal terhubung ke MongoDB', { error: error.message });
      throw error;
    }
  }

  async close() {
    if (this.connection) {
      await mongoose.connection.close();
      logger.info('Koneksi MongoDB ditutup');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
