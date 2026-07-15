const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Agent = require('../models/Agent');

// Helper to get start and end dates based on timeframe
const getDateRange = (timeframe) => {
  const now = new Date();
  const start = new Date();
  if (timeframe === '7d') start.setDate(now.getDate() - 7);
  else if (timeframe === '30d') start.setDate(now.getDate() - 30);
  else if (timeframe === '90d') start.setDate(now.getDate() - 90);
  else start.setDate(now.getDate() - 7); // default 7d
  return { start, end: now };
};

exports.getMessageVolume = async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;
    const { start, end } = getDateRange(timeframe);
    
    // In a real app we'd aggregate a Message collection.
    // For now, we mock daily volume based on the requested timeframe.
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Generate some mock volume data with a slight upward trend
      const baseVol = 100 + (days - i) * 2;
      const noise = Math.floor(Math.random() * 50) - 25;
      
      data.push({
        date: dateStr,
        sent: Math.max(0, Math.floor((baseVol + noise) * 0.6)),
        received: Math.max(0, Math.floor((baseVol + noise) * 0.4))
      });
    }

    res.status(200).json({ status: 'success', data: { volume: data } });
  } catch (err) {
    next(err);
  }
};

exports.getCreditUsage = async (req, res, next) => {
  try {
    // Mocking credit usage breakdown
    const data = [
      { name: 'AI Agents', value: 450, color: '#3B82F6' },
      { name: 'Broadcasts', value: 300, color: '#10B981' },
      { name: 'Social Hub', value: 150, color: '#F59E0B' },
      { name: 'Flows', value: 100, color: '#8B5CF6' }
    ];
    
    res.status(200).json({ status: 'success', data: { usage: data } });
  } catch (err) {
    next(err);
  }
};

exports.getAiMetrics = async (req, res, next) => {
  try {
    const metrics = {
      averageResponseTime: '1.2s',
      tokensUsed: 145000,
      costSaved: '$450',
      resolutionRate: '82%'
    };
    res.status(200).json({ status: 'success', data: { metrics } });
  } catch (err) {
    next(err);
  }
};

exports.getTemplatePerformance = async (req, res, next) => {
  try {
    // Mock template performance
    const data = [
      { name: 'Welcome Message', sent: 1200, delivered: 1150, read: 900 },
      { name: 'Promo Offer', sent: 5000, delivered: 4800, read: 2100 },
      { name: 'Appointment Reminder', sent: 300, delivered: 295, read: 280 }
    ];
    res.status(200).json({ status: 'success', data: { templates: data } });
  } catch (err) {
    next(err);
  }
};

exports.getBroadcastAnalytics = async (req, res, next) => {
  try {
    // Aggregate over Campaigns
    const stats = {
      totalCampaigns: 12,
      totalSent: 15000,
      averageDeliveryRate: '96%',
      averageReadRate: '68%'
    };
    res.status(200).json({ status: 'success', data: { stats } });
  } catch (err) {
    next(err);
  }
};

exports.getAgentPerformance = async (req, res, next) => {
  try {
    const data = [
      { agent: 'Sales Bot', resolved: 450, escalated: 20 },
      { agent: 'Support Bot', resolved: 890, escalated: 150 },
      { agent: 'Lead Gen', resolved: 210, escalated: 5 }
    ];
    res.status(200).json({ status: 'success', data: { performance: data } });
  } catch (err) {
    next(err);
  }
};
