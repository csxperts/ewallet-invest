const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.json());

const PORT = 3000;

// JazzCash Configuration
const JAZZCASH_CONFIG = {
  merchantId: "MC151327",
  password: "5gzt1t7153",
  integritySalt: "xtsux45vw4",
  returnUrl: "http://invest.ewallet.pk/jazzcash-response.html",
  endpoint: "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
};

// Utility: Timestamp in format yyyyMMddHHmmss
function getTxnDateTime(offsetMinutes = 0) {
  const now = new Date(Date.now() + offsetMinutes * 60000); // Offset in minutes
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

// Utility: Secure Hash Generator
function generateSecureHash(data) {
  const sorted = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${val}`)
    .join('&');

  const stringToHash = JAZZCASH_CONFIG.integritySalt + '&' + sorted;
  console.log(`[${new Date().toISOString()}] String to hash:`, stringToHash);

  const hash = crypto.createHmac('sha256', JAZZCASH_CONFIG.integritySalt)
    .update(stringToHash)
    .digest('hex');

  console.log(`[${new Date().toISOString()}] Generated secure hash:`, hash);
  return hash;
}

// Endpoint: Initiate JazzCash Deposit
app.post('/api/initiate-deposit', async (req, res) => {
  console.log(`[${new Date().toISOString()}] /api/initiate-deposit`, req.body);

  const { amount, account, cnic } = req.body;
  if (!amount || !account || !cnic) {
    console.warn(`[${new Date().toISOString()}] Missing required fields:`, { amount, account, cnic });
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const txnRefNo = 'T' + Date.now();
  const txnDateTime = getTxnDateTime();
  const expiryDateTime = getTxnDateTime(60); // Expire in 1 hour
  const pp_Amount = parseInt(amount) * 100;

  console.log(`[${new Date().toISOString()}] Creating transaction RefNo=${txnRefNo}, Amount=${pp_Amount}`);

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
    pp_CNIC: cnic,
    pp_MobileNumber: account
  };

  requestData.pp_SecureHash = generateSecureHash(requestData);

  console.log(`[${new Date().toISOString()}] Final requestData for redirect:`, requestData);

  res.json({
    success: true,
    redirectUrl: JAZZCASH_CONFIG.endpoint,
    formData: requestData
  });

  console.log(`[${new Date().toISOString()}] Response sent to client.`);
});

// Serve static HTML form from /public
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Server running at http://localhost:${PORT}`);
});
