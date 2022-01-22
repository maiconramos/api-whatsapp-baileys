const {WAConnection, MessageType} = require('@adiwajshing/baileys');
const fs = require('fs');
const express = require('express');
const http = require('http');
const {WebhookClient} = require('dialogflow-fulfillment');
const dialogflow = require('@google-cloud/dialogflow');
const app = express();
const port = process.env.PORT || 8000;
const server = http.createServer(app);

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
        }
    })
}
// run in main file
connectToWhatsApp ()
.catch (err => console.log("unexpected error: " + err) ) // catch any errors

server.listen(port, function() {
    console.log('App running on *: ' + port);
  });
  