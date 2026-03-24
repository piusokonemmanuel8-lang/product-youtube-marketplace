const pool = require('../config/db');

async function getCreatorMarketplaceAuthStatus(req, res) {
  try {
    const userId = req.user.id;

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    const [authRows] = await pool.query(
      'SELECT * FROM creator_marketplace_auth WHERE creator_id = ? LIMIT 1',
      [creatorId]
    );

    if (!authRows.length) {
      return res.status(404).json({
        message: 'Creator marketplace auth not found',
      });
    }

    return res.status(200).json({
      creator_marketplace_auth: authRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch creator marketplace auth status',
      error: error.message,
    });
  }
}

async function upsertCreatorMarketplaceAuth(req, res) {
  try {
    const userId = req.user.id;
    const { auth_type, supgad_account_id, supgad_store_url } = req.body;

    if (!['supgad', 'external'].includes(auth_type)) {
      return res.status(400).json({
        message: 'auth_type must be supgad or external',
      });
    }

    const [creatorProfiles] = await pool.query(
      'SELECT id FROM creator_profiles WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!creatorProfiles.length) {
      return res.status(404).json({
        message: 'Creator profile not found',
      });
    }

    const creatorId = creatorProfiles[0].id;

    let supgadStatus = 'none';
    let isAuthenticated = 0;
    let isInternalSupgad = 0;
    let paymentRequired = 1;
    let verifiedAt = null;

    if (auth_type === 'supgad') {
      isAuthenticated = 1;
      isInternalSupgad = 1;
      paymentRequired = 0;
      supgadStatus = 'active';
      verifiedAt = new Date();
    }

    const [existingRows] = await pool.query(
      'SELECT id FROM creator_marketplace_auth WHERE creator_id = ? LIMIT 1',
      [creatorId]
    );

    if (!existingRows.length) {
      await pool.query(
        `INSERT INTO creator_marketplace_auth
        (
          creator_id,
          auth_type,
          supgad_account_id,
          supgad_store_url,
          supgad_status,
          is_authenticated,
          is_internal_supgad,
          payment_required,
          verified_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          creatorId,
          auth_type,
          supgad_account_id || null,
          supgad_store_url || null,
          supgadStatus,
          isAuthenticated,
          isInternalSupgad,
          paymentRequired,
          verifiedAt,
        ]
      );
    } else {
      await pool.query(
        `UPDATE creator_marketplace_auth
         SET auth_type = ?,
             supgad_account_id = ?,
             supgad_store_url = ?,
             supgad_status = ?,
             is_authenticated = ?,
             is_internal_supgad = ?,
             payment_required = ?,
             verified_at = ?
         WHERE creator_id = ?`,
        [
          auth_type,
          supgad_account_id || null,
          supgad_store_url || null,
          supgadStatus,
          isAuthenticated,
          isInternalSupgad,
          paymentRequired,
          verifiedAt,
          creatorId,
        ]
      );
    }

    const [rows] = await pool.query(
      'SELECT * FROM creator_marketplace_auth WHERE creator_id = ? LIMIT 1',
      [creatorId]
    );

    return res.status(200).json({
      message: 'Creator marketplace auth saved successfully',
      creator_marketplace_auth: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to save creator marketplace auth',
      error: error.message,
    });
  }
}

async function getExternalPostingPlans(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT *
       FROM external_posting_plans
       WHERE status = 'active'
       ORDER BY price ASC, id ASC`
    );

    return res.status(200).json({
      external_posting_plans: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch external posting plans',
      error: error.message,
    });
  }
}

module.exports = {
  getCreatorMarketplaceAuthStatus,
  upsertCreatorMarketplaceAuth,
  getExternalPostingPlans,
};