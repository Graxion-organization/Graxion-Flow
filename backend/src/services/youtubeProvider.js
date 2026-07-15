const axios = require('axios');
const logger = require('../utils/logger');
const User = require('../models/User');
const YoutubeAccount = require('../models/YoutubeAccount');
const AppError = require('../utils/AppError');

class YoutubeProvider {
  constructor(accessToken, refreshToken = null, expiry = null, channelId = null) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiry = expiry;
    this.channelId = channelId;
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI;
  }

  /**
   * Refreshes the YouTube access token using the refresh token (Legacy - for User model)
   */
  async refreshYouTubeToken(userId) {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: 'refresh_token',
      });

      const { access_token, expires_in } = response.data;
      const newExpiry = new Date(Date.now() + expires_in * 1000);

      this.accessToken = access_token;
      this.expiry = newExpiry;

      // Update database (Legacy)
      await User.findByIdAndUpdate(userId, {
        'youtube.accessToken': access_token,
        'youtube.tokenExpiry': newExpiry,
      });

      return { accessToken: access_token, expiry: newExpiry };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error refreshing YouTube token:', typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      throw error;
    }
  }

  /**
   * Refreshes the YouTube access token using the refresh token for a YoutubeAccount
   */
  async refreshYouTubeTokenForAccount(youtubeAccount) {
    try {
      if (!youtubeAccount.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: youtubeAccount.refreshToken,
        grant_type: 'refresh_token',
      });

      const { access_token, expires_in } = response.data;
      const newExpiry = new Date(Date.now() + expires_in * 1000);

      this.accessToken = access_token;
      this.expiry = newExpiry;

      // Update database
      youtubeAccount.accessToken = access_token;
      youtubeAccount.tokenExpiry = newExpiry;
      await youtubeAccount.save();

      return { accessToken: access_token, expiry: newExpiry };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error refreshing YouTube token for account:', typeof errorData === 'object' ? JSON.stringify(errorData) : errorData);
      throw error;
    }
  }

  /**
   * Fetches channel details for the authenticated user
   */
  async fetchChannelDetails() {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,contentDetails,statistics',
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No YouTube channel found for this account.');
      }

      const channel = response.data.items[0];
      return {
        channelId: channel.id,
        channelName: channel.snippet.title,
        thumbnails: channel.snippet.thumbnails,
        uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
      };
    } catch (error) {
      logger.error('Error fetching YouTube channel details:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Validates if a video is eligible for YouTube Shorts
   */
  async validateShortEligibility(mediaUrl) {
    try {
      const isVid = /\.(mp4|mov|avi|wmv|m4v|webm)(?:\?|$|#)/i.test(mediaUrl) || mediaUrl.toLowerCase().includes('/video');
      if (!isVid) {
        return { valid: false, error: 'File must be a video format.' };
      }

      const headRes = await axios.head(mediaUrl);
      const contentLength = headRes.headers['content-length'];
      if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
        return { valid: false, error: 'Video file size exceeds 100MB limit.' };
      }

      return { valid: true };
    } catch (error) {
      logger.warn('Short eligibility validation failed:', error.message);
      return { valid: true };
    }
  }

  /**
   * Adds a comment to a video
   */
  async addComment(videoId, commentText) {
    try {
      logger.info(`Adding comment to video ${videoId}`);
      const response = await axios.post(
        'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet',
        {
          snippet: {
            videoId: videoId,
            topLevelComment: {
              snippet: {
                textOriginal: commentText,
              },
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      logger.error('Error adding YouTube comment:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Fetches latest uploaded videos/shorts for the authenticated channel
   */
  async fetchVideos(limit = 20) {
    try {
      // 1. Get channel uploads playlist ID if not already known
      let playlistId = this.uploadsPlaylistId;
      if (!playlistId) {
        const details = await this.fetchChannelDetails();
        playlistId = details.uploadsPlaylistId;
      }

      if (!playlistId) {
        throw new Error('Could not find uploads playlist for this channel.');
      }

      // 2. Fetch items from the uploads playlist
      const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: {
          part: 'snippet,contentDetails',
          playlistId: playlistId,
          maxResults: limit,
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data.items || [];
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error fetching YouTube videos:', errorData);
      
      if (error.response?.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Fetches details for specific videos (titles, etc)
   */
  async fetchVideosDetails(videoIds) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet',
          id: videoIds.join(','),
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.data.items || [];
    } catch (error) {
      logger.error('Error fetching YouTube video details:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Fetches latest comment threads for the authenticated channel
   */
  async fetchLatestComments(limit = 20) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
        params: {
          part: 'snippet',
          allThreadsRelatedToChannelId: this.channelId, // We might need to store channelId in the instance
          maxResults: limit,
          order: 'time',
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      const items = response.data.items || [];
      logger.info(`[YouTube Provider] Successfully fetched ${items.length} comment threads for channel ${this.channelId}`);
      return items;
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error fetching YouTube comments:', errorData);
      
      if (error.response?.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Fetches comment threads for a specific video
   */
  async fetchVideoComments(videoId, limit = 50) {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
        params: {
          part: 'snippet,replies',
          videoId: videoId,
          maxResults: limit,
          order: 'time',
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return response.data.items || [];
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error(`Error fetching YouTube comments for video ${videoId}:`, errorData);
      
      if (error.response?.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  /**
   * Replies to an existing comment thread
   */
  async replyToCommentThread(threadId, replyText) {
    try {
      const response = await axios.post(
        'https://www.googleapis.com/youtube/v3/comments?part=snippet',
        {
          snippet: {
            parentId: threadId,
            textOriginal: replyText,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error replying to YouTube comment:', errorData);
      
      if (error.response?.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      return null;
    }
  }

  /**
   * Uploads a video as a YouTube Short
   */
  async uploadShort(videoUrl, title, description = '', firstComment = '') {
    try {
      logger.info(`Starting YouTube Short upload: ${title}`);

      const videoRes = await axios.get(videoUrl, { responseType: 'stream' });

      const metaDescription = `${description}\n\n#Shorts`.trim();

      const initiateRes = await axios.post(
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
        {
          snippet: {
            title: title.substring(0, 100),
            description: metaDescription,
            categoryId: '22',
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/*',
          },
        }
      );

      const uploadUrl = initiateRes.headers.location;

      const uploadRes = await axios.put(uploadUrl, videoRes.data, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'video/*',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      const videoId = uploadRes.data.id;
      logger.info('YouTube Short uploaded successfully:', videoId);

      // Add first comment if provided
      if (firstComment) {
        await this.addComment(videoId, firstComment);
      }

      return {
        id: videoId,
        url: `https://youtube.com/shorts/${videoId}`,
        status: 'processing',
      };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('YouTube Short upload failed:', errorData);

      if (error.response?.status === 401) {
        throw new Error('OAUTH_EXPIRED');
      }
      
      if (JSON.stringify(errorData).includes('quotaExceeded')) {
        throw new Error('QUOTA_EXCEEDED');
      }

      throw new Error(`YouTube Upload Error: ${JSON.stringify(errorData)}`);
    }
  }

  /**
   * Helper to connect YouTube (exchanges code for tokens)
   */
  static async connectYouTube(code) {
    if (!code) {
      throw new AppError('No authorization code provided', 400);
    }
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
        code,
      });

      const { access_token, refresh_token, expires_in } = response.data;
      const expiry = new Date(Date.now() + expires_in * 1000);

      const provider = new YoutubeProvider(access_token);
      const channel = await provider.fetchChannelDetails();

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiry: expiry,
        channelId: channel.channelId,
        channelName: channel.channelName,
      };
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error connecting YouTube:', errorData);
      
      // Map Google errors to more readable AppErrors
      if (error.response?.data?.error === 'invalid_grant') {
        throw new AppError('The authorization code is invalid or has expired. Please try connecting again.', 400);
      }
      
      throw new AppError(`Failed to connect YouTube: ${typeof errorData === 'string' ? errorData : JSON.stringify(errorData)}`, 500);
    }
  }
  /**
   * Deletes a video from YouTube
   */
  async deleteVideo(videoId) {
    try {
      await axios.delete('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          id: videoId,
        },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
      return true;
    } catch (error) {
      const errorData = error.response?.data || error.message;
      logger.error('Error deleting YouTube video:', errorData);
      
      if (error.response?.status === 401) {
        throw new Error('TOKEN_EXPIRED');
      }
      throw error;
    }
  }
}

module.exports = YoutubeProvider;
