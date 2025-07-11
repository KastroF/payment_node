const Payment = require("../models/Payment");
const http = require("https");
const { io } = require("../server");

const sendHttpRequest = (options, data) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => resolve(JSON.parse(responseData)));
    });
    req.on("error", (error) => reject(error));
    req.write(data);
    req.end();
  });
};

const buildPaymentOptions = (data, path) => {
  const username = "chronicklSarl";
  const shared_key = "dfecfc1e-ef0d-45a3-b3c3-e3f5889aa84a";
  return {
    hostname: "stg.billing-easy.com",
    path,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${username}:${shared_key}`).toString("base64")}`,
      "Content-Length": Buffer.byteLength(data),
    },
  };
};

exports.initPayment = async (req, res) => {
  const isVisa = req.body.moneyType === "VISA";
  try {
    const payment = await new Payment({
      userId: req.body.userId,
      amount: parseInt(req.body.amount),
      app_name: req.body.app_name,
      client_phone: req.body.client_phone,
      country_code: req.body.country_code,
      money_type: req.body.moneyType,
      amount2: parseInt(req.body.amount2),
      status: 'initial',
    }).save();

    const payload = JSON.stringify({
      amount: payment.amount2,
      short_description: isVisa ? "Paiement visa" : "Paiement mobile money",
      payer_email: "chronickl@test.com",
      payer_name: `${req.body.app_name} User`,
      payer_msisdn: isVisa ? "074093850" : req.body.client_phone,
      external_reference: payment._id,
      expiry_period: 2,
    });

    const options = buildPaymentOptions(payload, "/api/v1/merchant/e_bills");
    const response = await sendHttpRequest(options, payload);

    const bill_id = response.e_bill.bill_id;
    await Payment.updateOne({ _id: payment._id }, { $set: { bill_id } });

    if (!isVisa) {
      const pushPayload = JSON.stringify({
        payer_msisdn: req.body.client_phone,
        payment_system_name: req.body.moneyType === "AM" ? "airtelmoney" : "moovmoney4",
      });
      const pushOptions = buildPaymentOptions(pushPayload, `/api/v1/merchant/e_bills/${bill_id}/ussd_push`);
      await sendHttpRequest(pushOptions, pushPayload);
    }

    return res.status(201).json({ status: 0, bill_id, paymentId: payment._id });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};

exports.ebillingCallback = async (req, res) => {
  try {
    await Payment.updateOne(
      { _id: req.body.reference },
      { $set: { status: "success" } }
    );

    io.emit("paymentStatus", {
      paymentId: req.body.reference,
      status: "success",
      message: "Paiement réussi",
    });

    return res.status(201).json({ status: 0 });
  } catch (err) {
    console.error(err);
    return res.status(505).json({ error: err.message });
  }
};


