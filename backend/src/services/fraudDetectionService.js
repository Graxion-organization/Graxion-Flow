const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const redisClient = require('../config/redisClient');
const FraudEvent = require('../models/FraudEvent');

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'tempmail.com', 'yopmail.com'
]);

class FraudDetectionService {
  constructor() {
    this.SCORE_THRESHOLDS = {
      LOW: 30,
      MEDIUM: 60,
      HIGH: 85,
      CRITICAL: 100
    };
    
    // Configurable window sizes
    this.VELOCITY_WINDOW = 60; // seconds
    this.FAILED_LOGIN_WINDOW = 15 * 60; // 15 mins
    this.DEVICE_HISTORY_WINDOW = 30 * 24 * 60 * 60; // 30 days
  }

  /**
   * Generates a secure OTP, stores in Redis, returns signed JWT.
   */
  async generateOTP(email, ip) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    try {
      const key = `otp:${email}:${ip}`;
      // Store in Redis for 5 minutes (300s)
      await redisClient.setEx(key, 300, otpHash);
    } catch (err) {
      logger.warn(`Redis error in generateOTP: ${err.message}`);
    }

    // Sign a token to return to the user to provide with the OTP
    const signedToken = jwt.sign({ email, ip, purpose: 'otp_verification' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '5m' });

    return { otp, signedToken };
  }

  /**
   * Verifies an OTP based on the signed token.
   */
  async verifyOTP(signedToken, providedOtp) {
    try {
      const decoded = jwt.verify(signedToken, process.env.JWT_SECRET || 'fallback_secret');
      if (decoded.purpose !== 'otp_verification') return false;

      const { email, ip } = decoded;
      const key = `otp:${email}:${ip}`;
      
      let storedHash;
      try {
        storedHash = await redisClient.get(key);
      } catch (redisErr) {
        logger.warn(`Redis error in verifyOTP: ${redisErr.message}`);
        return false;
      }

      if (!storedHash) return false; // Expired or doesn't exist

      const providedHash = crypto.createHash('sha256').update(providedOtp).digest('hex');
      if (storedHash === providedHash) {
        // One-time use: delete from Redis
        try {
          await redisClient.del(key);
        } catch (delErr) {
          logger.warn(`Redis delete error in verifyOTP: ${delErr.message}`);
        }
        return true;
      }
      return false;
    } catch (err) {
      logger.error('OTP Verification Error:', err.message);
      return false;
    }
  }

  /**
   * Checks real IP Geolocation via IPinfo (or falls back gracefully)
   */
  async getGeolocation(ip) {
    // Basic local/private IP bypass
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
      return { country: 'Local', vpn: false, loc: '0,0' };
    }
    
    try {
      const cacheKey = `geo:${ip}`;
      let cached;
      try {
        cached = await redisClient.get(cacheKey);
      } catch (redisErr) {
        logger.warn(`Redis error in getGeolocation (get): ${redisErr.message}`);
      }

      if (cached) return JSON.parse(cached);

      // Call IPinfo (Using unauthenticated endpoint for demonstration, needs IPINFO_TOKEN in prod)
      const token = process.env.IPINFO_TOKEN ? `?token=${process.env.IPINFO_TOKEN}` : '';
      const response = await axios.get(`https://ipinfo.io/${ip}/json${token}`, { timeout: 2000 });
      
      const data = {
        country: response.data.country,
        region: response.data.region,
        loc: response.data.loc, // "lat,lng"
        vpn: response.data.privacy?.vpn || response.data.privacy?.proxy || false
      };

      // Cache for 24 hours
      try {
        await redisClient.setEx(cacheKey, 86400, JSON.stringify(data));
      } catch (setErr) {
        logger.warn(`Redis error in getGeolocation (set): ${setErr.message}`);
      }
      return data;
    } catch (error) {
      logger.warn(`Failed to fetch IP geolocation for ${ip}: ${error.message}`);
      return { country: 'Unknown', vpn: false, loc: '0,0' };
    }
  }

  /**
   * Checks if device is new for the user
   */
  async checkDeviceHistory(email, deviceId) {
    if (!email || !deviceId) return true; // Assume new if missing

    try {
      const key = `device:${email}`;
      const knownDevices = await redisClient.sMembers(key);
      
      if (knownDevices.includes(deviceId)) {
        return false; // Not a new device
      }

      // Add new device to history
      await redisClient.sAdd(key, deviceId);
      await redisClient.expire(key, this.DEVICE_HISTORY_WINDOW);
      return true; // Is a new device
    } catch (err) {
      logger.warn(`Redis error in checkDeviceHistory: ${err.message}`);
      return true; // Fail-open
    }
  }

  /**
   * Tracks incoming requests to calculate velocity using Redis.
   */
  async trackVelocity(ip) {
    try {
      const key = `rate:${ip}`;
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, this.VELOCITY_WINDOW);
      }
      return count; // Requests per minute
    } catch (err) {
      logger.warn(`Redis error in trackVelocity: ${err.message}`);
      return 0;
    }
  }

  async recordFailedLogin(ip, email) {
    try {
      const key = `failed_login:${ip}:${email}`;
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, this.FAILED_LOGIN_WINDOW);
      }
      return count;
    } catch (err) {
      logger.warn(`Redis error in recordFailedLogin: ${err.message}`);
      return 0;
    }
  }

  async recordSuccessfulLogin(ip, email) {
    try {
      await redisClient.del(`failed_login:${ip}:${email}`);
    } catch (err) {
      logger.warn(`Redis error in recordSuccessfulLogin: ${err.message}`);
    }
  }

  async getFailedLogins(ip, email) {
    try {
      const val = await redisClient.get(`failed_login:${ip}:${email}`);
      return val ? parseInt(val, 10) : 0;
    } catch (err) {
      logger.warn(`Redis error in getFailedLogins: ${err.message}`);
      return 0;
    }
  }

  isDisposableEmail(email) {
    if (!email) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    return DISPOSABLE_DOMAINS.has(domain);
  }

  /**
   * Detects bot-like behavior.
   */
  detectBotBehavior(userAgent) {
    if (!userAgent) return 30; // Missing User-Agent
    const uaLower = userAgent.toLowerCase();
    if (/curl|postman|bot|scraper|spider|headless|puppeteer|playwright/i.test(uaLower)) {
      return 30;
    }
    return 0;
  }

  /**
   * Main function to calculate risk score.
   */
  async calculateRiskScore({ userId, ip, email, deviceId, userAgent }) {
    let score = 0;
    const reasons = [];

    // 1. Check Request Velocity
    const velocity = await this.trackVelocity(ip);
    if (velocity > 100) {
      score += 20;
      reasons.push(`High request velocity (${velocity}/min)`);
    }

    // 2. Check Failed Logins
    if (email) {
      const failedCount = await this.getFailedLogins(ip, email);
      if (failedCount >= 4) {
        score += 85; // Trigger OTP threshold on 4th recorded failure (5th attempt)
        reasons.push('Multiple failed login attempts');
      } else if (failedCount >= 2) {
        score += 60; // Trigger Captcha threshold on 2nd recorded failure (3rd attempt)
        reasons.push('Repeated login failures');
      }
    }

    // 3. Bot Detection
    const botScore = this.detectBotBehavior(userAgent);
    if (botScore > 0) {
      score += botScore;
      reasons.push('Suspicious or missing user-agent');
    }

    // 4. Geolocation & VPN/Proxy
    const geoData = await this.getGeolocation(ip);
    if (geoData.vpn) {
      score += 20;
      reasons.push('VPN or Proxy detected');
    }

    // Impossible Travel check
    if (email && geoData.loc !== '0,0') {
      const lastLocKey = `last_loc:${email}`;
      let lastLoc;
      try {
        lastLoc = await redisClient.get(lastLocKey);
      } catch (redisErr) {
        logger.warn(`Redis error in calculateRiskScore (get loc): ${redisErr.message}`);
      }

      if (lastLoc && lastLoc !== geoData.loc) {
        score += 25;
        reasons.push('Impossible travel / sudden location change');
      }

      try {
        await redisClient.setEx(lastLocKey, 86400 * 7, geoData.loc);
      } catch (redisErr) {
        logger.warn(`Redis error in calculateRiskScore (set loc): ${redisErr.message}`);
      }
    }

    // 5. Disposable Email
    if (this.isDisposableEmail(email)) {
      score += 25;
      reasons.push('Disposable email detected');
    }

    // 6. Device History
    const isNewDevice = await this.checkDeviceHistory(email, deviceId);
    if (isNewDevice && email) {
      score += 15;
      reasons.push('Login from new device');
    }

    // Temporary Block Check
    try {
      const isBlocked = await redisClient.get(`block:${ip}`);
      if (isBlocked) {
        score = 100;
        reasons.push('IP is temporarily blocked');
      }
    } catch (redisErr) {
      logger.warn(`Redis error in calculateRiskScore (block check): ${redisErr.message}`);
    }

    score = Math.min(score, 100);
    const action = this.determineAction(score);

    // Save Fraud Event to MongoDB asynchronously ONLY if there's actual suspicious behavior
    if (score > 0) {
      FraudEvent.create({
        userId,
        email,
        ip,
        deviceId,
        location: `${geoData.country} - ${geoData.region || 'Unknown'}`,
        riskScore: score,
        reasons,
        action
      }).catch(err => logger.error('Failed to save FraudEvent:', err.message));
    }

    // Auto-block IP if critical
    if (action === 'block') {
      try {
        const isBlocked = await redisClient.get(`block:${ip}`);
        if (!isBlocked) {
          await redisClient.setEx(`block:${ip}`, 3600, 'blocked'); // block for 1 hour
        }
      } catch (redisErr) {
        logger.warn(`Redis error in calculateRiskScore (auto-block): ${redisErr.message}`);
      }
    }

    return { score, reasons, action };
  }

  determineAction(score) {
    if (score >= this.SCORE_THRESHOLDS.CRITICAL) return 'block';
    if (score >= this.SCORE_THRESHOLDS.HIGH) return 'require_otp';
    if (score >= this.SCORE_THRESHOLDS.MEDIUM) return 'require_captcha';
    return 'allow';
  }
}

module.exports = new FraudDetectionService();
