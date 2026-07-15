const logger = require('../utils/logger');
let ioInstance;

module.exports = {
  setIO: (io) => {
    ioInstance = io;
  },
  getIO: () => {
    if (!ioInstance) {
      logger.warn("Socket.io instance not initialized yet.");
    }
    return ioInstance;
  }
};
