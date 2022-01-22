const {WAConnection, MessageType} = require('@adiwajshing/baileys');
const fs = require('fs');
const express = require('express');
const http = require('http');
const app = express();
const port = process.env.PORT || 8000;
const server = http.createServer(app);
const { body, validationResult } = require('express-validator');
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

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
}
// run in main file
connectToWhatsApp ()
.catch (err => console.log("unexpected error: " + err) ) // catch any errors

server.listen(port, function() {
    console.log('App running on *: ' + port);
  });
  