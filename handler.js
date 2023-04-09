require('dotenv').config();
const serverless = require("serverless-http");
const express = require("express");
const line = require('@line/bot-sdk');
const request = require('request');

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESSTOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new line.Client(lineConfig);

app.post('/callback', line.middleware(lineConfig), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    // ignore non-text-message event
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    request.post({
      url: 'https://api.openai.com/v1/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_TOKEN}`
      },
      json: {
        model: 'text-davinci-003',
        prompt: event.message.text,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      }
    }, (error, response, body) => {
      if (error) {
        reject(error);
      } else {
        console.log(body)
        resolve(lineClient.replyMessage(event.replyToken, {
          type: 'text',
          text: body.choices[0].text.trim()
        }));
      }
    });
  });
}

module.exports.handler = serverless(app);
