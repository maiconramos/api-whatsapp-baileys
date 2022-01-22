const {WAConnection, MessageType} = require('@adiwajshing/baileys');
const fs = require('fs');
const express = require('express');
const http = require('http');
const {WebhookClient} = require('dialogflow-fulfillment');
const dialogflow = require('@google-cloud/dialogflow');
const app = express();
const port = process.env.PORT || 8000;
const server = http.createServer(app);
const { body, validationResult } = require('express-validator');
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

//webhook dialogflow
app.post('/webhook', function(request,response){
    const agent = new WebhookClient ({ request, response });
        let intentMap = new Map();
        intentMap.set('nomedaintencao', nomedafuncao)
        agent.handleRequest(intentMap);
        });
  function nomedafuncao (agent) {
  }

const sessionClient = new dialogflow.SessionsClient({keyFilename: "zdg-9un9-bf578834c822.json"});

async function detectIntent(
    projectId,
    sessionId,
    query,
    contexts,
    languageCode
  ) {
    const sessionPath = sessionClient.projectAgentSessionPath(
      projectId,
      sessionId
    );
  
    // The text query request.
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: query,
          languageCode: languageCode,
        },
      },
    };
  
    if (contexts && contexts.length > 0) {
      request.queryParams = {
        contexts: contexts,
      };
    }
  
    const responses = await sessionClient.detectIntent(request);
    return responses[0];
}

async function executeQueries(projectId, sessionId, queries, languageCode) {
    let context;
    let intentResponse;
    for (const query of queries) {
        try {
            console.log(`Pergunta: ${query}`);
            intentResponse = await detectIntent(
                projectId,
                sessionId,
                query,
                context,
                languageCode
            );
            console.log('Enviando Resposta');
            console.log(intentResponse.queryResult.fulfillmentText);
            return `${intentResponse.queryResult.fulfillmentText}`
        } catch (error) {
            console.log(error);
        }
    }
}

async function connectToWhatsApp () {
    const conn = new WAConnection() 
    conn.on ('open', () => {
        // save credentials whenever updated
        console.log (`credentials updated!`)
        const authInfo = conn.base64EncodedAuthInfo() // get all the auth info we need to restore this session
        fs.writeFileSync('./auth_info.json', JSON.stringify(authInfo, null, '\t')) // save this info to a file
    })
    // called when WA sends chats
    // this can take up to a few minutes if you have thousands of chats!
    conn.on('chats-received', async ({ hasNewChats }) => {
        console.log(`you have ${conn.chats.length} chats, new chats available: ${hasNewChats}`)
        const unread = await conn.loadAllUnreadMessages ()
        console.log ("you have " + unread.length + " unread messages")
    })
    // called when WA sends chats
    // this can take up to a few minutes if you have thousands of contacts!
    conn.on('contacts-received', () => {
        console.log('you have ' + Object.keys(conn.contacts).length + ' contacts')
    })
    if (fs.existsSync('./auth_info.json')) {
      conn.loadAuthInfo ('./auth_info.json') // will load JSON credentials from file
      await conn.connect ()
    } else {
      await conn.connect ()
    }
    conn.on('chat-update', async chatUpdate => {
        if (chatUpdate.messages && chatUpdate.count) {
            const message = chatUpdate.messages.all()[0];
            let textoResposta = await executeQueries("zdg-9un9", message.key.remoteJid, [JSON.stringify(message.message.conversation)], 'pt-BR');
            const sentMsg  = await conn.sendMessage (message.key.remoteJid, textoResposta, MessageType.text);
            console.log(JSON.stringify(message));
        }
    })
    // APP
    // POST
    // SendText
    app.post('/send-message', [
        body('number').notEmpty(),
        body('message').notEmpty(),
      ], async (req, res) => {

      const errors = validationResult(req).formatWith(({
      msg
      }) => {
      return msg;
      });

      if (!errors.isEmpty()) {
      return res.status(422).json({
      status: false,
      message: errors.mapped()
      });
      }

      const number = req.body.number;
      const numberDDI = number.substr(0, 2);
      const numberDDD = number.substr(2, 2);
      const numberUser = number.substr(-8, 8);
      const message = req.body.message;

      if (numberDDD <= 30) {
      const numberZDG = numberDDI + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await conn.sendMessage (numberZDG, message, MessageType.text).then(response => {
      res.status(200).json({
        status: true,
        message: 'Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'Mensagem não enviada',
        response: err.text
      });
      });
      }
      else {
      const numberZDG = numberDDI + numberDDD + numberUser + "@s.whatsapp.net";
      await conn.sendMessage (numberZDG, message, MessageType.text).then(response => {
      res.status(200).json({
        status: true,
        message: 'Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'Mensagem não enviada',
        response: err.text
      });
      });
      }
    })

    // SendButtons
    app.post('/send-buttons', [
        body('number').notEmpty(),
        body('buttonId1').notEmpty(),
        body('buttonId2').notEmpty(),
        body('displayText1').notEmpty(),
        body('displayText2').notEmpty(),
        body('contentText').notEmpty(),
        body('footerText').notEmpty(),
      ], async (req, res) => {

      const errors = validationResult(req).formatWith(({
      msg
      }) => {
      return msg;
      });

      if (!errors.isEmpty()) {
      return res.status(422).json({
      status: false,
      message: errors.mapped()
      });
      }

      const number = req.body.number;
      const numberDDI = number.substr(0, 2);
      const numberDDD = number.substr(2, 2);
      const numberUser = number.substr(-8, 8);
      const buttons = [
        {buttonId: req.body.buttonId1, buttonText: {displayText: req.body.displayText1}, type: 1},
        {buttonId: req.body.buttonId2, buttonText: {displayText: req.body.displayText2}, type: 1}
      ]

      const buttonMessage = {
        contentText: req.body.contentText,
        footerText: req.body.footerText,
        buttons: buttons,
        headerType: 1
      }      

      if (numberDDD <= 30) {
      const numberZDG = numberDDI + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await conn.sendMessage(numberZDG, buttonMessage, MessageType.buttonsMessage).then(response => {
      res.status(200).json({
        status: true,
        message: 'Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'Mensagem não enviada',
        response: err.text
      });
      });
      }
      else {
      const numberZDG = numberDDI + numberDDD + numberUser + "@s.whatsapp.net";
      await conn.sendMessage (numberZDG, buttonMessage, MessageType.buttonsMessage).then(response => {
      res.status(200).json({
        status: true,
        message: 'Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'Mensagem não enviada',
        response: err.text
      });
      });
      }
    })

    app.post('/send-lists', [
        body('number').notEmpty(),
        body('titleR1').notEmpty(),
        body('titleR2').notEmpty(),
        body('descriptionR1').notEmpty(),
        body('descriptionR2').notEmpty(),
        body('titleS').notEmpty(),
        body('buttonText').notEmpty(),
        body('description').notEmpty()
      ], async (req, res) => {

      const errors = validationResult(req).formatWith(({
      msg
      }) => {
      return msg;
      });

      if (!errors.isEmpty()) {
      return res.status(422).json({
      status: false,
      message: errors.mapped()
      });
      }

      const number = req.body.number;
      const numberDDI = number.substr(0, 2);
      const numberDDD = number.substr(2, 2);
      const numberUser = number.substr(-8, 8);
      
      const rows = [
        {title: req.body.titleR1, description: req.body.descriptionR1, rowId:"rowid1"},
        {title: req.body.titleR2, description: req.body.descriptionR2, rowId:"rowid2"}
      ]
      
      const sections = [{title: req.body.titleS, rows: rows}]
      
      const button = {
        buttonText: req.body.buttonText,
        description: req.body.description,
        sections: sections,
        listType: 1
      }   

      if (numberDDD <= 30) {
      const numberZDG = numberDDI + numberDDD + "9" + numberUser + "@s.whatsapp.net";
      await conn.sendMessage(numberZDG, button, MessageType.listMessage).then(response => {
      res.status(200).json({
        status: true,
        message: 'Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'Mensagem não enviada',
        response: err.text
      });
      });
      }
      else {
      const numberZDG = numberDDI + numberDDD + numberUser + "@s.whatsapp.net";
      await conn.sendMessage (numberZDG, button, MessageType.listMessage).then(response => {
      res.status(200).json({
        status: true,
        message: 'Mensagem enviada',
        response: response
      });
      }).catch(err => {
      res.status(500).json({
        status: false,
        message: 'Mensagem não enviada',
        response: err.text
      });
      });
      }
    })

}
// run in main file
connectToWhatsApp ()
.catch (err => console.log("unexpected error: " + err) ) // catch any errors

server.listen(port, function() {
    console.log('App running on *: ' + port);
  });
  