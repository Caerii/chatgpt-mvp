const express = require("express");
const axios = require("axios");
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || "";

const app = express();
const filePath = __dirname + '/usage.txt';
const writer = fs.createWriteStream(filePath, {flags:'a'});

app.use(express.json());
app.use(BASE_URL, express.static(path.resolve(__dirname, '../client/build')));

let conversationStates = {}; // To keep conversation states by chat ID

app.post(BASE_URL+"/api", (req, res) => {

  let chatId = req.body.chatId; // Make sure to send this from client
  if(!conversationStates[chatId]) {
    conversationStates[chatId] = [];
  }

  // Update the conversation state
  conversationStates[chatId].push(...req.body.chat);

  let requestBody = {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "messages": conversationStates[chatId]
  };
  let axiosConfig = {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer "+process.env.OPEN_API_KEY
    }
  };
  axios.post("https://api.openai.com/v1/chat/completions", requestBody, axiosConfig).then(response => {
    gpt_text = response.data.choices[0].message.content;
    let dataOut = {
      time: req.body.time,
      user: req.body.user,
      request: req.body.chat.slice(-1)[0].content,
      response: gpt_text
    }
    writer.write(JSON.stringify(dataOut)+"\n");
    res.json( gpt_text );
  })

})

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
