require("dotenv").config();
const axios = require("axios");
const { yamatoRun } = require("./src/yamato");
const { pndRun } = require("./src/pnd");

const sendToWebhook = async (webhookUrl, messageContent) => {
  try {
    const payload = { content: messageContent };
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 204) {
      console.log("Message successfully sent to webhook");
    } else {
      console.error("Unexpected response from webhook:", response.status);
    }
  } catch (err) {
    console.error(`Error sending message to webhook: ${err.name}: ${err.message}`);
  }
};

const main = async () => {
  try {
    const yamatoResults = await yamatoRun();
    const pndResults = await pndRun();

    let yamatoMessage = "";
    yamatoResults.forEach((result) => {
      yamatoMessage += `
**${result.displayName}**
**Total Collateral:** ${result.totalCollateral}
**Total Supply CDP:** ${result.totalSupplyCDP}
**TCR:** ${result.tcr}
**Redeemables Candidate:** ${result.redeemablesCandidate}
**Exchange Rate Difference:** ${result.exchangeRateDiff}
**JPY per USD:** ${result.jpyPerUSD}
**CJPY per USD:** ${result.cdpPerUSD}
      \n`;
    });

    let pndMessage = "";
    pndResults.forEach((result) => {
      if (result.utilization !== "0%") {
        pndMessage += `
**${result.displayName}**
**Utilization:** ${result.utilization}
**Supply:** ${result.supply}
**Borrow:** ${result.borrow}
**Reserves:** ${result.reserves}
        \n`;
      }
    });

    const webhooks = [
      { url: process.env.YAMATO_WEBHOOK_URL, message: yamatoMessage },
      { url: process.env.PND_WEBHOOK_URL, message: pndMessage },
    ];

    if (!webhooks[0].url || !webhooks[1].url) {
      throw new Error("Both webhook URLs must be defined in the .env file");
    }

    for (const webhook of webhooks) {
      await sendToWebhook(webhook.url, webhook.message);
    }
  } catch (err) {
    console.error(`${err.name}: ${err.message}`);
  }
};

main();
