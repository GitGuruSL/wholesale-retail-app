const express = require('express');
const router = express.Router();


// Get company profile
router.get('/company', async (req, res) => {
  try {
    const result = await db.query('SELECT name, address, contact FROM company_profile WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error fetching company profile:", err);
    res.status(500).json({ message: 'Failed to load company profile' });
  }
});

// Update company profile
router.put('/company', async (req, res) => {
  const { name, address, contact } = req.body;
  try {
    await db.query(
      `UPDATE company_profile SET name = $1, address = $2, contact = $3, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
      [name, address, contact]
    );
    res.json({ message: 'Company profile updated' });
  } catch (err) {
    console.error("Error updating company profile:", err);
    res.status(500).json({ message: 'Failed to update company profile' });
  }
});

// Get store settings
router.get('/store', async (req, res) => {
  try {
    const result = await db.query('SELECT default_store, currency FROM store_settings WHERE id = 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error("Error fetching store settings:", err);
    res.status(500).json({ message: 'Failed to load store settings' });
  }
});

// Update store settings
router.put('/store', async (req, res) => {
  const { defaultStore, currency } = req.body;
  try {
    await db.query(
      `UPDATE store_settings SET default_store = $1, currency = $2, updated_at = CURRENT_TIMESTAMP WHERE id = 1`,
      [defaultStore, currency]
    );
    res.json({ message: 'Store settings updated' });
  } catch (err) {
    console.error("Error updating store settings:", err);
    res.status(500).json({ message: 'Failed to update store settings' });
  }
});

module.exports = router;