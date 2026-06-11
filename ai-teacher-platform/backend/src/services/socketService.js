let ioInstance;

module.exports = {
  setIO: (io) => {
    ioInstance = io;
  },
  getIO: () => {
    if (!ioInstance) {
      console.warn("Socket.io instance not initialized yet.");
    }
    return ioInstance;
  }
};
