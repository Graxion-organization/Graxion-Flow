const AppError = require('../utils/AppError');
const axios = require('axios');
const logger = require('../utils/logger');

class InstagramService {

  _handleError(error, context) {
    const errDetail = error.response?.data ? error.response.data : error.message;
    const errString = typeof errDetail === 'object' ? JSON.stringify(errDetail) : errDetail;
    logger.error(`Instagram ${context} error: ${errString}`);

    if (error.response?.data?.error?.code === 190 || error.response?.data?.error?.code === 104) {
      throw new AppError('Instagram token expired or invalid. Please delete this account and reconnect via Facebook.', 401);
    }
    
    throw new AppError(`Instagram API error: ${errString}`, 500);
  }

  constructor(pageAccessToken, pageId, igAccountId) {
    this.accessToken = pageAccessToken;
    this.pageId = pageId;
    this.igAccountId = igAccountId;
    this.apiVersion = process.env.META_API_VERSION || 'v19.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Publish content to Instagram (Post, Reel, or Story)
   * @param {Object} params
   * @param {string} params.caption - The caption for the post
   * @param {string[]} params.mediaUrls - Array of media URLs
   * @param {string} params.type - 'post', 'reel', 'story'
   */
  /**
   * Publish content to Instagram (Post, Reel, or Story)
   * @param {Object} params
   * @param {string} params.caption - The caption for the post
   * @param {string[]} params.mediaUrls - Array of media URLs
   * @param {string} params.type - 'post', 'reel', 'story', 'carousel'
   */
  /**
   * Publish content to Instagram (Post, Reel, Story, or Carousel)
   * Mandatory: Container creation -> Status polling -> Publish after FINISHED
   */
  async publishPost(params) {
    const { caption, mediaUrls, type = 'post' } = params;
    try {
      if (!this.igAccountId) {
        throw new Error('Instagram Account ID is missing. Story and Business publishing requires a linked IG account.');
      }

      // Filter and validate media URLs
      const validMediaUrls = (mediaUrls || []).filter(url => url && typeof url === 'string' && url.trim() !== '' && url !== 'placeholder_media_url_for_now');
      
      if (validMediaUrls.length === 0) {
        throw new Error('Instagram requires at least one valid image or video URL.');
      }

      // Handle Carousel (Multiple media items)
      if (type === 'carousel' || validMediaUrls.length > 1) {
        return await this._publishCarousel(caption, validMediaUrls);
      }

      const mediaUrl = validMediaUrls[0];
      const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$)/i) || mediaUrl.includes('/video/') || type === 'reel';
      
      // 1. Create Media Container
      const containerData = { caption };

      if (type === 'reel') {
        containerData.media_type = 'REELS';
        containerData.video_url = mediaUrl;
        containerData.share_to_feed = true; // Essential for Reel visibility
      } else if (type === 'story') {
        containerData.media_type = 'STORIES';
        if (isVideo) containerData.video_url = mediaUrl;
        else containerData.image_url = mediaUrl;
      } else {
        // Regular Post
        if (isVideo) {
          containerData.media_type = 'VIDEO';
          containerData.video_url = mediaUrl;
        } else {
          containerData.image_url = mediaUrl;
        }
      }

      logger.info(`[Instagram] Creating ${type} container...`);
      const containerResponse = await axios.post(
        `${this.baseUrl}/${this.igAccountId}/media`,
        containerData,
        { params: { access_token: this.accessToken } }
      );

      const creationId = containerResponse.data.id;
      if (!creationId) throw new Error('Instagram failed to return a Container ID.');

      // 2. Poll for FINISHED status
      await this._waitForMediaProcessing(creationId);

      // 3. Publish Media Container
      logger.info(`[Instagram] Publishing ${type} container ${creationId}...`);
      const publishResponse = await axios.post(
        `${this.baseUrl}/${this.igAccountId}/media_publish`,
        { creation_id: creationId },
        { params: { access_token: this.accessToken } }
      );

      if (!publishResponse.data.id) throw new Error('Instagram failed to return a Media ID after publishing.');

      return {
        success: true,
        id: publishResponse.data.id,
        platform: 'instagram',
        type
      };
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`[Instagram] publishPost fatal error: ${errDetail}`);
      throw new Error(`Instagram API error: ${errDetail}`);
    }
  }

  /**
   * Publish a carousel (multi-media post)
   * Flow: Create children -> Poll children -> Create carousel container -> Poll carousel container -> Publish
   */
  async _publishCarousel(caption, mediaUrls) {
    try {
      const itemIds = [];

      // 1. Create children containers
      for (const url of mediaUrls) {
        const isVideo = url.match(/\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$)/i) || url.includes('/video/');
        const childData = { is_carousel_item: true };

        if (isVideo) {
          childData.media_type = 'VIDEO';
          childData.video_url = url;
        } else {
          childData.image_url = url;
        }

        const childRes = await axios.post(
          `${this.baseUrl}/${this.igAccountId}/media`,
          childData,
          { params: { access_token: this.accessToken } }
        );
        if (childRes.data.id) itemIds.push(childRes.data.id);
      }

      // 2. Wait for all children to be FINISHED
      for (const id of itemIds) {
        await this._waitForMediaProcessing(id);
      }

      // 3. Create Carousel (Master) Container
      logger.info(`[Instagram] Creating carousel master container for ${itemIds.length} items...`);
      const carouselRes = await axios.post(
        `${this.baseUrl}/${this.igAccountId}/media`,
        {
          media_type: 'CAROUSEL',
          caption: caption,
          children: itemIds.join(','),
        },
        { params: { access_token: this.accessToken } }
      );

      const creationId = carouselRes.data.id;
      if (!creationId) throw new Error('Instagram failed to return a Carousel Container ID.');

      // 4. MUST poll the carousel container itself before publishing
      await this._waitForMediaProcessing(creationId);

      // 5. Publish Carousel
      logger.info(`[Instagram] Publishing carousel master ${creationId}...`);
      const publishRes = await axios.post(
        `${this.baseUrl}/${this.igAccountId}/media_publish`,
        { creation_id: creationId },
        { params: { access_token: this.accessToken } }
      );

      if (!publishRes.data.id) throw new Error('Instagram failed to return a Media ID after carousel publishing.');

      return {
        success: true,
        id: publishRes.data.id,
        platform: 'instagram',
        type: 'carousel'
      };
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`[Instagram] _publishCarousel fatal error: ${errDetail}`);
      throw new Error(`Instagram Carousel error: ${errDetail}`);
    }
  }

  /**
   * Strict Polling Manager for Instagram Media Container Processing
   * States: queued, processing, finished, failed, expired
   */
  async _waitForMediaProcessing(creationId) {
    const intervals = [3000, 5000, 8000, 13000, 21000]; // Fibonacci-based backoff
    let currentState = 'queued';

    for (let i = 0; i < intervals.length; i++) {
      const waitTime = intervals[i];
      logger.info(`[Instagram] Polling container ${creationId}. State: ${currentState}. Next poll in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      try {
        const response = await axios.get(`${this.baseUrl}/${creationId}`, {
          params: {
            fields: 'status_code,status',
            access_token: this.accessToken
          }
        });

        const statusCode = response.data.status_code;
        
        // Map Instagram states to requested logic
        if (statusCode === 'FINISHED') {
          logger.info(`[Instagram] Media processing FINISHED for container ${creationId}`);
          return { state: 'finished', id: creationId };
        }

        if (statusCode === 'ERROR') {
          logger.error(`[Instagram] Media processing FAILED for container ${creationId}: ${response.data.status}`);
          throw new Error(`Media processing failed: ${response.data.status || 'Unknown error'}`);
        }

        if (statusCode === 'EXPIRED') {
          logger.warn(`[Instagram] Media processing EXPIRED for container ${creationId}`);
          throw new Error('Media processing expired. Container is no longer valid.');
        }

        // Default to processing state
        currentState = 'processing';
        
      } catch (error) {
        if (error.message.includes('failed') || error.message.includes('expired')) throw error;
        logger.warn(`[Instagram] Polling transient error for ${creationId}: ${error.message}`);
      }
    }

    // Mark as failed on timeout
    logger.error(`[Instagram] Media processing TIMEOUT for container ${creationId} after multiple attempts.`);
    throw new Error('Media processing failed: Timeout reached during processing.');
  }

  static splitMessage(text, maxLength = 950) {
    if (!text) return [];
    if (text.length <= maxLength) return [text];
    
    const chunks = [];
    let currentChunk = '';
    
    const lines = text.split('\n');
    for (const line of lines) {
      if ((currentChunk + '\n' + line).length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        if (line.length > maxLength) {
          let remaining = line;
          while (remaining.length > maxLength) {
            chunks.push(remaining.substring(0, maxLength));
            remaining = remaining.substring(maxLength);
          }
          currentChunk = remaining;
        } else {
          currentChunk = line;
        }
      } else {
        currentChunk = currentChunk ? currentChunk + '\n' + line : line;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  async sendTextMessage(igAccountId, recipientId, text) {
    try {
      const endpointId = 'me';
      const chunks = InstagramService.splitMessage(text, 950);
      let lastResponse = null;

      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        
        lastResponse = await axios.post(
          `${this.baseUrl}/${endpointId}/messages`,
          {
            messaging_type: 'RESPONSE',
            recipient: { id: recipientId },
            message: { text: chunk },
          },
          {
            params: { access_token: this.accessToken },
          }
        );
        // Small delay to ensure sequential delivery on Meta's servers
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return lastResponse ? lastResponse.data : null;
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`Instagram sendTextMessage error: ${errDetail}`);
      throw error;
    }
  }

  async sendAudioMessage(igAccountId, recipientId, audioUrl) {
    try {
      const endpointId = 'me';
      const response = await axios.post(
        `${this.baseUrl}/${endpointId}/messages`,
        {
          messaging_type: 'RESPONSE',
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'audio',
              payload: { url: audioUrl, is_reusable: true }
            }
          },
        },
        { params: { access_token: this.accessToken } }
      );
      return response.data;
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`Instagram sendAudioMessage error: ${errDetail}`);
      throw error;
    }
  }

  async sendVideoMessage(igAccountId, recipientId, videoUrl) {
    try {
      const endpointId = 'me';
      const response = await axios.post(
        `${this.baseUrl}/${endpointId}/messages`,
        {
          messaging_type: 'RESPONSE',
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: 'video',
              payload: { url: videoUrl, is_reusable: true }
            }
          },
        },
        { params: { access_token: this.accessToken } }
      );
      return response.data;
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  async downloadMedia(mediaUrl, filePath) {
    const fs = require('fs');
    try {
      const response = await axios({
        method: 'GET',
        url: mediaUrl,
        responseType: 'stream',
      });

      return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        let error = null;
        writer.on('error', err => {
          error = err;
          writer.close();
          reject(err);
        });
        writer.on('close', () => {
          if (!error) {
            resolve(filePath);
          }
        });
      });
    } catch (error) {
      logger.error(`Instagram downloadMedia error: ${error.message}`);
      throw error;
    }
  }

  async replyToComment(igAccountId, commentId, text) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${commentId}/replies`,
        { message: text },
        { params: { access_token: this.accessToken } }
      );
      return response.data;
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  async postComment(mediaId, text) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${mediaId}/comments`,
        { message: text },
        { params: { access_token: this.accessToken } }
      );
      return response.data;
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  async getMediaComments(mediaId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${mediaId}/comments`,
        { 
          params: { 
            access_token: this.accessToken,
            fields: 'id,text,username,timestamp,replies{id,text,username,timestamp}'
          } 
        }
      );
      return response.data.data;
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  async getConversations() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.pageId}/conversations`,
        {
          params: {
            platform: 'instagram',
            access_token: this.accessToken,
          }
        }
      );
      return response.data.data || [];
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  async getConversationMessages(conversationId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${conversationId}`,
        {
          params: {
            fields: 'messages{id,created_time,from,to,message}',
            access_token: this.accessToken,
          }
        }
      );
      return response.data?.messages?.data || [];
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  async resolveMessageSender(messageId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${messageId}`,
        {
          params: {
            fields: 'from,to,message,attachments,shares',
            access_token: this.accessToken,
          },
        }
      );
      logger.info(`resolveMessageSender response data: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.warn(`Instagram resolveMessageSender error: ${errDetail}`);
      return null;
    }
  }

  async getCustomerProfile(igScopedId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${igScopedId}`,
        {
          params: {
            fields: 'name,username,profile_pic',
            access_token: this.accessToken,
          },
        }
      );
      return response.data;
    } catch (error) {
      logger.error(`Instagram getCustomerProfile error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get post insights
   */
  async getInsights(mediaId) {
    try {
      // First try to get basic engagement which usually works without special permissions
      const basicResponse = await axios.get(`${this.baseUrl}/${mediaId}`, {
        params: {
          fields: 'like_count,comments_count,media_type,media_product_type',
          access_token: this.accessToken
        }
      });
      
      const likes = basicResponse.data.like_count || 0;
      const comments = basicResponse.data.comments_count || 0;
      const isReel = basicResponse.data.media_product_type === 'REELS';

      let views = null;
      let saves = null;
      let shares = null;
      
      // Now try to fetch advanced insights if possible
      try {
        // REELS support different metrics: plays, reach, saved, shares
        // Standard posts support: impressions, reach, saved
        const metrics = isReel ? 'plays,saved,shares' : 'impressions,saved';
        
        const insightsRes = await axios.get(`${this.baseUrl}/${mediaId}/insights`, {
          params: {
            metric: metrics,
            access_token: this.accessToken
          }
        });
        
        if (insightsRes.data && insightsRes.data.data) {
          const data = insightsRes.data.data;
          const impressions = data.find(m => m.name === 'impressions' || m.name === 'plays');
          if (impressions && impressions.values?.length) views = impressions.values[0].value;
          
          const saved = data.find(m => m.name === 'saved');
          if (saved && saved.values?.length) saves = saved.values[0].value;
          
          const sharesMetric = data.find(m => m.name === 'shares');
          if (sharesMetric && sharesMetric.values?.length) shares = sharesMetric.values[0].value;
        }
      } catch (insightErr) {
        logger.warn(`Instagram insights advanced fetch failed for ${mediaId}: ${insightErr.response?.data?.error?.message || insightErr.message}`);
        // Soft fail, we still have basic metrics
      }
      
      return { likes, comments, shares, views, saves };
    } catch (error) {
      logger.error(`Instagram getInsights fallback error for ${mediaId}: ${error.response?.data?.error?.message || error.message}`);
      return { likes: null, comments: null, shares: null, views: null, saves: null, error: true };
    }
  }

  /**
   * Get recent media for the Instagram Business Account
   */
  async getMedia() {
    try {
      const response = await axios.get(`${this.baseUrl}/${this.igAccountId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp',
          access_token: this.accessToken
        }
      });
      return response.data.data;
    } catch (error) {
      this._handleError(error, "API");
    }
  }

  /**
   * Delete a media item
   */
  async deleteMedia(mediaId) {
    try {
      // Instagram Graph API doesn't support deleting media directly via API for business accounts easily
      // However, for some cases it might work if the app has the right permissions.
      // But usually, it's not supported for business accounts via Graph API.
      // Wait, let's check. Actually, it is NOT supported.
      // "Instagram media cannot be deleted via the API."
      // BUT, we can try. Some newer versions might have it or for certain types.
      // Actually, standard Instagram Graph API DOES NOT allow deletion.
      // I will implement it as a "not supported" message or try and catch.
      
      // Let's assume for this SaaS we want to TRY if possible or at least provide the placeholder.
      // NOTE: Facebook posts CAN be deleted.
      
      throw new Error('Instagram does not allow deleting posts via API. Please delete it directly from the Instagram app.');
    } catch (error) {
      throw error;
    }
  }
}

module.exports = InstagramService;

