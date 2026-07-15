const request = require('supertest');
const express = require('express');

// Mock external integrations
jest.mock('../src/config/database', () => jest.fn());
jest.mock('../src/config/redisClient', () => {
  return {
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn()
  };
});
jest.mock('../src/utils/socket', () => ({
  initSocket: jest.fn().mockReturnValue({}),
  getIO: jest.fn()
}));
jest.mock('../src/services/socialPostScheduler', () => ({
  startSocialPostScheduler: jest.fn()
}));
jest.mock('../src/services/dataDeletionService', () => ({
  startDeletionScheduler: jest.fn()
}));

// Spy on express app listen to prevent port binding during tests
const listenSpy = jest.spyOn(express.application, 'listen').mockImplementation(function (port, cb) {
  if (cb) cb();
  return {
    close: (callback) => { if (callback) callback(); },
    on: jest.fn()
  };
});

const app = require('../src/server');

describe('GET /health', () => {
  afterAll(() => {
    listenSpy.mockRestore();
  });

  test('should return 200 OK with environment and timestamp', async () => {
    const res = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.environment).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});
