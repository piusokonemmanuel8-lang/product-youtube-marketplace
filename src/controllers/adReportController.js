const pool = require('../config/db');

const CREATOR_SHARE_PERCENT = 55;
const PLATFORM_SHARE_PERCENT = 45;

function roundMoney(value) {
  return Number((Number(value || 0)).toFixed(4));
}

function calculateRevenueSplit(amount) {
  const grossRevenue = roundMoney(amount || 0);
  const creatorShareAmount = roundMoney((grossRevenue * CREATOR_SHARE_PERCENT) / 100);
  const platformShareAmount = roundMoney(grossRevenue - creatorShareAmount);

  return {
    gross_revenue: grossRevenue,
    creator_share_percent: CREATOR_SHARE_PERCENT,
    platform_share_percent: PLATFORM_SHARE_PERCENT,
    creator_share_amount: creatorShareAmount,
    platform_share_amount: platformShareAmount,
  };
}

async function getCampaignStats(req, res) {
  try {
    const { id } = req.params;

    const [campaigns] = await pool.query(
      'SELECT * FROM ad_campaigns WHERE id = ? LIMIT 1',
      [id]
    );

    if (!campaigns.length) {
      return res.status(404).json({
        message: 'Ad campaign not found',
      });
    }

    const campaign = campaigns[0];

    const [impressions] = await pool.query(
      `SELECT COUNT(*) AS total_impressions
       FROM ad_impressions
       WHERE campaign_id = ?`,
      [id]
    );

    const [clicks] = await pool.query(
      `SELECT COUNT(*) AS total_clicks
       FROM ad_clicks
       WHERE campaign_id = ?`,
      [id]
    );

    const [skips] = await pool.query(
      `SELECT COUNT(*) AS total_skips
       FROM ad_impressions
       WHERE campaign_id = ? AND is_skipped = 1`,
      [id]
    );

    const totalImpressions = Number(impressions[0]?.total_impressions || 0);
    const totalClicks = Number(clicks[0]?.total_clicks || 0);
    const totalSkips = Number(skips[0]?.total_skips || 0);

    const impressionRevenue = roundMoney(totalImpressions * Number(campaign.cost_per_view || 0));
    const clickRevenue = roundMoney(totalClicks * Number(campaign.cost_per_click || 0));
    const totalRevenue = roundMoney(impressionRevenue + clickRevenue);

    const revenueSplit = calculateRevenueSplit(totalRevenue);

    return res.status(200).json({
      campaign,
      stats: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_skips: totalSkips,
        impression_revenue: impressionRevenue,
        click_revenue: clickRevenue,
        total_revenue: totalRevenue,
        creator_reserved_amount: revenueSplit.creator_share_amount,
        platform_kept_amount: revenueSplit.platform_share_amount,
        creator_share_percent: revenueSplit.creator_share_percent,
        platform_share_percent: revenueSplit.platform_share_percent,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch campaign stats',
      error: error.message,
    });
  }
}

module.exports = {
  getCampaignStats,
};