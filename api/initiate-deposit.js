const crypto = require('crypto');

const JAZZCASH_CONFIG = {
  merchantId: "MC151327",
  password: "5gzt1t7153",
  integritySalt: "xtsux45vw4",
  returnUrl: "https://invest.ewallet.pk/jazzcash-response.html",
  endpoint: "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/"
};

function getTxnDateTime() {
  const now = new Date();
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function getTxnExpiryDateTime() {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

function generateSecureHash(data) {
  const sorted = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => `${val}`)
    .join('&');

  const stringToHash = JAZZCASH_CONFIG.integritySalt + '&' + sorted;
  return crypto.createHmac('sha256', JAZZCASH_CONFIG.integritySalt).update(stringToHash).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { amount, account, cnic } = req.body;

  if (!amount || !account || !cnic) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const txnRefNo = 'T' + Date.now();
  const txnDateTime = getTxnDateTime();
  const expiryDateTime = getTxnExpiryDateTime();

  const pp_Amount = parseInt(amount) * 100;

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

  res.status(200).json({
    success: true,
    redirectUrl: JAZZCASH_CONFIG.endpoint,
    formData: requestData
  });
}
