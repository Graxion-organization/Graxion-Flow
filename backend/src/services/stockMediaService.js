const axios = require('axios');
const logger = require('../utils/logger');

// Beautiful, curated fallback royalty-free video URLs hosted on Pexels/Pixabay CDNs
const CATEGORY_FALLBACKS = {
  tech: [
    'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054ba201e86f2199159f81d1157053e&profile_id=165&oauth2_token_id=57447761', // Coding on laptop
    'https://player.vimeo.com/external/435674703.sd.mp4?s=7f5c5369c7353f47e30d1e1f72782e448b111425&profile_id=165&oauth2_token_id=57447761'  // Tech server room / abstract
  ],
  cafe: [
    'https://player.vimeo.com/external/434045526.sd.mp4?s=c1b1a20a672729a6b1070ff2a7e774f384a51e60&profile_id=165&oauth2_token_id=57447761', // Pouring latte art
    'https://player.vimeo.com/external/454807490.sd.mp4?s=d00466479f6fb4f61f7d2ee64906f368eb2a6884&profile_id=165&oauth2_token_id=57447761'  // Cafe interior / aesthetics
  ],
  fitness: [
    'https://player.vimeo.com/external/482255755.sd.mp4?s=b6241b7145781a704e672f2d93e1572de4279cc9&profile_id=165&oauth2_token_id=57447761', // Running on treadmill
    'https://player.vimeo.com/external/394334342.sd.mp4?s=c8065096a60d0e6538b3687bd75bc66c5a04a60b&profile_id=165&oauth2_token_id=57447761'  // Gym workout
  ],
  business: [
    'https://player.vimeo.com/external/394285150.sd.mp4?s=694e9f7336fbf4a070f61d2d348a04ab43f07a7e&profile_id=165&oauth2_token_id=57447761', // Team meeting / charts
    'https://player.vimeo.com/external/384761655.sd.mp4?s=811fb264f2a58b2915fa016b8a87b5a190fb0a3a&profile_id=165&oauth2_token_id=57447761'  // Brainstorming on glass board
  ],
  fashion: [
    'https://player.vimeo.com/external/538902581.sd.mp4?s=4f7a634ad2d37c95e1ef935e46beed8234857758&profile_id=165&oauth2_token_id=57447761', // Clothes hangers / clothing store
    'https://player.vimeo.com/external/409156093.sd.mp4?s=f52be6ff0c0a969ecb52996d9cc7d142d3a3c9be&profile_id=165&oauth2_token_id=57447761'  // Fashion model walking
  ],
  generic: [
    'https://player.vimeo.com/external/517602058.sd.mp4?s=8105d15a975764dc08b9818817454fa6a12b6df8&profile_id=165&oauth2_token_id=57447761', // Glowing abstract particles loop
    'https://player.vimeo.com/external/384761370.sd.mp4?s=810fa25e40e6c2cb48ef98f56efde75ffde34691&profile_id=165&oauth2_token_id=57447761'  // Conceptual planning / creative
  ]
};

class StockMediaService {
  /**
   * Helper to clean a prompt and return 1-2 keywords
   */
  static extractKeywords(promptText = '') {
    const cleanText = promptText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim();
    
    const words = cleanText.split(/\s+/).filter(w => w.length > 3);
    
    // Filter out common stop words
    const stopWords = new Set(['showing', 'smiling', 'happy', 'create', 'generate', 'beautiful', 'using', 'about', 'their', 'there', 'would', 'should', 'could', 'people', 'person', 'woman', 'group']);
    const keywords = words.filter(w => !stopWords.has(w));

    if (keywords.length > 0) {
      return keywords.slice(0, 2).join(' ');
    }
    return 'business';
  }

  /**
   * Match keywords to a fallback category
   */
  static matchCategory(query = '') {
    const q = query.toLowerCase();
    if (q.includes('code') || q.includes('tech') || q.includes('laptop') || q.includes('software') || q.includes('saas') || q.includes('developer')) {
      return 'tech';
    }
    if (q.includes('coffee') || q.includes('cafe') || q.includes('food') || q.includes('restaurant') || q.includes('bakery') || q.includes('dining')) {
      return 'cafe';
    }
    if (q.includes('fit') || q.includes('gym') || q.includes('workout') || q.includes('exercise') || q.includes('health') || q.includes('run')) {
      return 'fitness';
    }
    if (q.includes('fashion') || q.includes('clothing') || q.includes('wear') || q.includes('boutique') || q.includes('store')) {
      return 'fashion';
    }
    if (q.includes('office') || q.includes('work') || q.includes('business') || q.includes('marketing') || q.includes('meeting') || q.includes('chart')) {
      return 'business';
    }
    return 'generic';
  }

  /**
   * Search stock video on Pexels
   */
  static async searchPexelsVideo(query) {
    if (!process.env.PEXELS_API_KEY) {
      logger.warn('[StockMedia] PEXELS_API_KEY not configured, skipping Pexels.');
      return null;
    }

    try {
      logger.info(`[StockMedia] Searching Pexels videos for: "${query}"`);
      const response = await axios.get('https://api.pexels.com/videos/search', {
        headers: { Authorization: process.env.PEXELS_API_KEY },
        params: { query, per_page: 5, orientation: 'portrait' } // Portrait is best for Reels/Shorts
      });

      const videos = response.data?.videos || [];
      if (videos.length === 0) return null;

      // Find the best quality video file (HD, MP4 format)
      const bestVideo = videos[0];
      const videoFiles = bestVideo.video_files || [];
      
      // Find a vertical SD/HD file under 15MB ideally, or default to first link
      const optimalFile = videoFiles.find(f => f.width < 1200 && f.file_type === 'video/mp4') || videoFiles[0];
      return optimalFile?.link || null;
    } catch (err) {
      logger.error('[StockMedia] Pexels video search error:', err.message);
      return null;
    }
  }

  /**
   * Search stock video on Pixabay
   */
  static async searchPixabayVideo(query) {
    if (!process.env.PIXABAY_API_KEY) {
      logger.warn('[StockMedia] PIXABAY_API_KEY not configured, skipping Pixabay.');
      return null;
    }

    try {
      logger.info(`[StockMedia] Searching Pixabay videos for: "${query}"`);
      const response = await axios.get('https://pixabay.com/api/videos/', {
        params: {
          key: process.env.PIXABAY_API_KEY,
          q: query,
          per_page: 3,
          video_type: 'film'
        }
      });

      const hits = response.data?.hits || [];
      if (hits.length === 0) return null;

      const videoData = hits[0].videos;
      // Prefer medium or small size MP4 for fast uploads
      const optimalVideo = videoData.medium || videoData.small || videoData.tiny;
      return optimalVideo?.url || null;
    } catch (err) {
      logger.error('[StockMedia] Pixabay video search error:', err.message);
      return null;
    }
  }

  /**
   * Primary entry point: Get video clip url (tries APIs, falls back to catalog)
   */
  static async getVideoUrl(promptText) {
    const keywords = this.extractKeywords(promptText);
    
    // 1. Try Pexels first
    let videoUrl = await this.searchPexelsVideo(keywords);
    
    // 2. Try Pixabay second
    if (!videoUrl) {
      videoUrl = await this.searchPixabayVideo(keywords);
    }
    
    // 3. Fallback to curated catalog
    if (!videoUrl) {
      const cat = this.matchCategory(promptText);
      const list = CATEGORY_FALLBACKS[cat] || CATEGORY_FALLBACKS.generic;
      const randomIndex = Math.floor(Math.random() * list.length);
      videoUrl = list[randomIndex];
      logger.info(`[StockMedia] Using fallback video for category: ${cat} (${videoUrl})`);
    }

    return videoUrl;
  }
}

module.exports = StockMediaService;
