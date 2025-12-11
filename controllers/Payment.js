const Payment = require("../models/Payment");
const http = require("https");
const { io } = require("../server");
const axios = require("axios");

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

/*
exports.getKyc = async  (req, res) =>  {

  try{

    console.log(req.body);
    const payload = JSON.stringify({
      payment_system_name: req.body.system_name, 
      msisdn: req.body.phone
    });
  
    const options = buildPaymentOptions(payload, "/api/v1/merchant/kyc");
    const response = await sendHttpRequest(options, payload);

    console.log("la reponse", response);

    res.status(201).json({status: 0, response}); 

  }catch(err){

    console.log(err); 
    res.status(505).json({err})
  }


}

*/

exports.getKyc = async (req, res) => {
  try {
    const username = "chronicklSarl";
    const shared_key = "dfecfc1e-ef0d-45a3-b3c3-e3f5889aa84a";

    const { system_name, phone } = req.body;

    // ✅ Construction de l’URL avec les paramètres GET
    const path = `/api/v1/merchant/kyc?payment_system_name=${encodeURIComponent(system_name)}&msisdn=${encodeURIComponent(phone)}`;

    const options = {
      hostname: "stg.billing-easy.com",
      path,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${shared_key}`).toString("base64")}`,
      },
    };

    // ✅ Envoi de la requête GET
    const response = await new Promise((resolve, reject) => {
      const reqHttp = http.request(options, (resHttp) => {
        let data = "";
        resHttp.on("data", (chunk) => (data += chunk));
        resHttp.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      });

      reqHttp.on("error", reject);
      reqHttp.end(); // pas de body sur GET
    });

    console.log("Réponse KYC :", response);
    
    res.status(200).json({ status: 0, response });
  } catch (err) {
    console.error("Erreur KYC :", err);
    res.status(500).json({ err });
  }
};




exports.initPayment = async (req, res) => {

    console.log(req.body); 
    

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

exports.useCallback = async (req, res) => {
  try {
    const reference = req.body.reference;

    console.log(req.body);
    const payment = await Payment.findByIdAndUpdate(
      reference,
      { $set: { status: "success" } },
      { new: true }
    );

    if (!payment) {
      return res.status(404).json({ error: "Paiement non trouvé." });
    }

    if(payment && payment.app_name === "kredix"){

      try {
        await axios.post("https://kredix.onrender.com/api/order/callback", {
          paymentId: payment._id,
          bill_id: payment.bill_id || null,
          status: "success"
        });
        console.log("retour envoyé avec succès", );
      } catch (notifyErr) {
        console.error("Erreur lors de la notification :", notifyErr.message);
        // Tu peux choisir de ne pas échouer la réponse locale à cause de la notification
      }

    }

    if(payment && payment.app_name === "agnos"){

      try {
        await axios.post("https://agnos-node2.onrender.com/api/contribution/callback", {
          paymentId: payment._id,
          bill_id: payment.bill_id || null,
          status: "success"
        });
        console.log("retour envoyé avec succès", );
      } catch (notifyErr) {
        console.error("Erreur lors de la notification :", notifyErr.message);
        // Tu peux choisir de ne pas échouer la réponse locale à cause de la notification
      }

    }

    // Envoi de la notification à l'URL externe
   /* try {
      await axios.post("https://lamajoritebloquante.com/statut/", {
        paymentId: payment._id,
        bill_id: payment.bill_id || null,
        status: "success"
      });
      console.log("retour envoyé avec succès", );
    } catch (notifyErr) {
      console.error("Erreur lors de la notification :", notifyErr.message);
      // Tu peux choisir de ne pas échouer la réponse locale à cause de la notification
    }   

    */

    return res.status(201).json({ status: 0 });
  } catch (err) {
    console.error(err);
    return res.status(505).json({ error: err.message });
  }
};


exports.paiementsList = async (req, res) => {
  try {
    const { startAt = 0 } = req.body;

    // 1. Paiements paginés (PAS de filtre)
    const payments = await Payment.find({app_name: "PaiementMB"})
      .sort({ date: -1 })
      .skip(startAt)
      .limit(10);

    // 2. Filtre pour le calcul des totaux
    const filterForTotals = { status: "success", app_name: "PaiementMB" };
    const allFilteredPayments = await Payment.find(filterForTotals);

    const brutes = allFilteredPayments.reduce((sum, p) => sum + (p.amount2 || 0), 0);
    const net = allFilteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 3. Détermination du prochain startAt
    const nextStartAt = payments.length < 10 ? null : startAt + payments.length;

    // 4. Réponse
    return res.status(200).json({
      status: 0,
      payments,
      brutes,
      net,
      startAt: nextStartAt
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur serveur." });
  }
}