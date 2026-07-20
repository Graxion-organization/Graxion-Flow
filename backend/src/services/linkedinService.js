const axios = require('axios');
const logger = require('../utils/logger');

class LinkedInService {
  constructor(accessToken, linkedinId) {
    this.accessToken = accessToken;
    this.linkedinId = linkedinId;
    this.baseUrl = 'https://api.linkedin.com/v2';
  }

  /**
   * Publish a post to LinkedIn
   * @param {Object} params
   * @param {string} params.caption - The text content
   * @param {string[]} params.mediaUrls - Array of media URLs
   * @param {string} params.type - 'post', 'article', 'image', 'video'
   */
  async publishPost(params) {
    const { caption, mediaUrls, type = 'post' } = params;
    try {
      const author = `urn:li:person:${this.linkedinId}`;
      
      let postData = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: caption
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      if (mediaUrls && mediaUrls.length > 0) {
        // For simplicity in this initial version, we'll handle single image/video
        // Multiple media (Carousel) in LinkedIn requires 'IMAGE' shareMediaCategory with multiple entities
        const mediaUrl = mediaUrls[0];
        const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|m4v|webm)(?:\?|$)/i);

        if (isVideo) {
          // Video upload is complex (multi-step). For now, we share as a link or handle basic upload
          // LinkedIn doesn't support direct video URL sharing in ugcPosts easily without uploading first.
          // We'll treat it as an ARTICLE (link share) if we can't upload, or try to implement upload logic.
          postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'VIDEO';
          // NOTE: Real video upload requires: registerUpload -> Upload binary -> Create post with asset URN
          // For this implementation, if it's a URL, we might need to share it as a link (ARTICLE).
          return await this._shareLink(caption, mediaUrl, 'Video Post');
        } else {
          // Image share logic
          // Similar to video, images MUST be uploaded to LinkedIn first to get an asset URN
          // If we only have a URL, we share it as a link (ARTICLE) which LinkedIn will scrape
          return await this._shareLink(caption, mediaUrl, 'Image Post');
        }
      }

      logger.info(`[LinkedIn] Publishing text post for ${this.linkedinId}...`);
      const response = await axios.post(
        `${this.baseUrl}/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        id: response.data.id,
        platform: 'linkedin',
        type: 'text'
      };
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`[LinkedIn] publishPost error: ${errDetail}`);
      throw new Error(`LinkedIn API error: ${errDetail}`);
    }
  }

  async _shareLink(caption, url, title = 'Shared Content') {
    try {
      const author = `urn:li:person:${this.linkedinId}`;
      const postData = {
        author: author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: caption
            },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                description: {
                  text: caption.substring(0, 200)
                },
                originalUrl: url,
                title: {
                  text: title
                }
              }
            ]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        id: response.data.id,
        platform: 'linkedin',
        type: 'link'
      };
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`[LinkedIn] _shareLink error: ${errDetail}`);
      throw new Error(`LinkedIn Link Share error: ${errDetail}`);
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(accessToken) {
    try {
      // Try modern OIDC endpoint first (Required for new apps)
      try {
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        return {
          id: response.data.sub,
          name: response.data.name,
          profilePicture: response.data.picture,
          email: response.data.email
        };
      } catch (oidcError) {
        logger.warn('LinkedIn OIDC profile fetch failed, falling back to legacy API...');
        
        const response = await axios.get('https://api.linkedin.com/v2/me', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        let profilePicture = null;
        try {
          const picRes = await axios.get('https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~:playableStreams))', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          profilePicture = picRes.data.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier;
        } catch (e) {}

        return {
          id: response.data.id,
          name: `${response.data.localizedFirstName} ${response.data.localizedLastName}`,
          profilePicture
        };
      }
    } catch (error) {
      logger.error(`LinkedIn getProfile error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent posts for the connected member
   */
  async getMemberPosts(limit = 20) {
    try {
      const response = await axios.get(
        `https://api.linkedin.com/rest/posts`,
        {
          params: {
            q: 'author',
            author: `urn:li:person:${this.linkedinId}`,
            count: limit,
          },
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401'
          }
        }
      );
      // Map the new posts format to the old expected format if necessary, or just return elements
      return response.data.elements || [];
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`LinkedIn getMemberPosts error: ${errDetail}`);
      throw new Error(`LinkedIn API error: ${errDetail}`);
    }
  }

  /**
   * Get comments on a specific post (URN)
   */
  async getPostComments(postUrn) {
    try {
      const response = await axios.get(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}/comments`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401'
          }
        }
      );
      return response.data.elements || [];
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`LinkedIn getPostComments error: ${errDetail}`);
      throw new Error(`LinkedIn API error: ${errDetail}`);
    }
  }

  /**
   * Reply to a comment or post
   */
  async replyToComment(targetUrn, message) {
    try {
      const response = await axios.post(
        `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(targetUrn)}/comments`,
        {
          actor: `urn:li:person:${this.linkedinId}`,
          message: {
            text: message
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': '202401',
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      const errDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      logger.error(`LinkedIn replyToComment error: ${errDetail}`);
      throw new Error(`LinkedIn API error: ${errDetail}`);
    }
  }
}

module.exports = LinkedInService;
