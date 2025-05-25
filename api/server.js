const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = 3000;

// JazzCash Configuration (Sandbox or Live)
const JAZZCASH_CONFIG = {
  merchantId: "MC12345", // Replace with your Merchant ID
  password: "123456",     // API password
  integritySalt: "YourIntegritySalt", // Provided by JazzCash
  returnUrl: "https://yourdomain.com/payment-response", // Where user returns after payment
  endpoint: "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/" // Use live URL for production
};

// Utility function: Generate timestamp in format yyyyMMddHHmmss
function getTxnDateTime() {
  const now = new Date();
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

// Utility: Generate secure hash
function generateSecureHash(data) {
  const sorted = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${val}`)
    .join('&');

  const stringToHash = JAZZCASH_CONFIG.integritySalt + '&' + sorted;
  return crypto.createHmac('sha256', JAZZCASH_CONFIG.integritySalt).update(stringToHash).digest('hex');
}

// Route: Initiate Deposit
app.post('/api/initiate-deposit', async (req, res) => {
  const { amount, account, cnic } = req.body;

  if (!amount || !account || !cnic) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const txnRefNo = 'T' + Date.now(); // Unique transaction ID
  const txnDateTime = getTxnDateTime();
  const expiryDateTime = getTxnDateTime(); // Ideally add +1 hour

  const pp_Amount = parseInt(amount) * 100; // Convert PKR to paisa

  const requestData = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: JAZZCASH_CONFIG.merchantId,
    pp_Password: JAZZCASH_CONFIG.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: pp_Amount.toString(),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: txnDateTime,
    pp_BillReference: "Deposit",
    pp_Description: "JazzCash Deposit",
    pp_TxnExpiryDateTime: expiryDateTime,
    pp_ReturnURL: JAZZCASH_CONFIG.returnUrl,
    pp_SecureHash: "", // To be added
    pp_CNIC: cnic,
    pp_MobileNumber: account
  };

  // Generate hash
  const hash = generateSecureHash(requestData);
  requestData.pp_SecureHash = hash;

  // Redirect user to JazzCash payment page with POST data
  res.json({
    success: true,
    redirectUrl: JAZZCASH_CONFIG.endpoint,
    formData: requestData
  });
});

// Serve static HTML form for testing (optional)
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
