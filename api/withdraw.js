const crypto = require('crypto');

const JAZZCASH_CONFIG = {
  merchantId: "MC151327",
  password: "5gzt1t7153",
  integritySalt: "xtsux45vw4",
  returnUrl: "https://yourdomain.com/jazzcash-withdraw-response.html",
  payoutEndpoint: "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/payout" // <-- check actual endpoint
};

// Utility to get current datetime in yyyyMMddHHmmss
function getTxnDateTime() {
  const now = new Date();
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

// Generate secure hash as per JazzCash spec
function generateSecureHash(data) {
  // Sort keys alphabetically and concat values with '&'
  const sorted = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${val}`)
    .join('&');

  const stringToHash = JAZZCASH_CONFIG.integritySalt + '&' + sorted;
  return crypto.createHmac('sha256', JAZZCASH_CONFIG.integritySalt).update(stringToHash).digest('hex');
}

// Sample in-memory user balances (replace with DB)
const userBalances = {
  'user1': 50000, // 500 PKR = 50000 paisa
  // Add other users
};

async function withdrawHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId, amount, mobileNumber } = req.body;

  if (!userId || !amount || !mobileNumber) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  // Check user balance (convert to paisa)
  const amountPaisa = parseInt(amount) * 100;
  if (!userBalances[userId] || userBalances[userId] < amountPaisa) {
    return res.status(400).json({ success: false, message: 'Insufficient balance.' });
  }

  // Prepare payout data
  const txnRefNo = 'W' + Date.now(); // Unique withdrawal txn ref no
  const txnDateTime = getTxnDateTime();

  const requestData = {
    pp_Version: "1.1",
    pp_TxnType: "PAYOUT",           // Check actual value in JazzCash payout docs
    pp_Language: "EN",
    pp_MerchantID: JAZZCASH_CONFIG.merchantId,
    pp_Password: JAZZCASH_CONFIG.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: amountPaisa.toString(),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: txnDateTime,
    pp_ReturnURL: JAZZCASH_CONFIG.returnUrl,
    pp_MobileNumber: mobileNumber,
    pp_Description: "Withdraw from wallet",
  };

  // Generate secure hash
  requestData.pp_SecureHash = generateSecureHash(requestData);

  try {
    // Call JazzCash payout API (usually a POST form or HTTP call)
    // For demo, assuming POST with axios and application/x-www-form-urlencoded
    const axios = require('axios');
    const qs = require('querystring');

    const response = await axios.post(JAZZCASH_CONFIG.payoutEndpoint, qs.stringify(requestData), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // Parse response from JazzCash payout API
    // (Format depends on JazzCash API, check docs)
    const responseData = response.data;

    // For demo: assume success if responseData.status == 'Success'
    if (responseData && responseData.status === 'Success') {
      // Deduct from user balance
      userBalances[userId] -= amountPaisa;

      return res.status(200).json({
        success: true,
        message: 'Withdrawal successful',
        data: responseData
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Withdrawal failed',
        error: responseData
      });
    }
  } catch (error) {
    console.error('JazzCash payout error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

module.exports = withdrawHandler;
