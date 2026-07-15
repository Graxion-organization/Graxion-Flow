const axios = require('axios');
const logger = require('../utils/logger');


const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

const getZoomToken = async () => {
  try {
    const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
    const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
    const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;

    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      throw new Error("Zoom credentials are not fully set in .env");
    }

    const token = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`, 
      null, 
      {
        headers: {
          'Authorization': `Basic ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    logger.error('Error getting Zoom Token:', error.response?.data || error.message);
    if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      logger.error('⚠️ Zoom credentials are missing in the .env file!');
    }
    throw error;
  }
};

/**
 * Creates a new Zoom meeting.
 */
const createMeeting = async (topic, startTime, durationMinutes) => {
  try {
    const token = await getZoomToken();
    const response = await axios.post('https://api.zoom.us/v2/users/me/meetings', {
      topic,
      type: 2, // Scheduled meeting (link remains valid)
      start_time: startTime, // ISO format: yyyy-MM-ddTHH:mm:ssZ
      duration: durationMinutes,
      settings: {
        host_video: false,
        participant_video: false,
        join_before_host: true, // Allow AI to join first
        mute_upon_entry: true,
        waiting_room: false // Disable waiting room so AI bot doesn't get stuck
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    logger.error('Error creating Zoom meeting:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { createMeeting };
