const {WAConnection, MessageType, MessageOptions, Mimetype} = require('@adiwajshing/baileys');
const fs = require('fs');
const express = require('express');
const qrcode = require("qrcode");
const http = require('http');
const socketIO = require("socket.io");
const app = express();
const port = process.env.PORT || 8001;
const server = http.createServer(app);
const { body, validationResult } = require('express-validator');
const io = socketIO(server);


app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.use("/assets", express.static(__dirname + "/front/assets"))

app.get("/qrcode", (req, res) => {
	res.sendFile("./front/qrcode.html", {
		root: __dirname
	})
})

app.get("/", (req, res) => {
	res.sendFile("./front/disparador.html", {
		root: __dirname
	})
})

async function connectToWhatsApp () {
    const conn = new WAConnection() 
    const cliente = 'maicon';
    conn.on ('open', () => {
        // save credentials whenever updated
        console.log (`credentials updated!`)
        const authInfo = conn.base64EncodedAuthInfo() // get all the auth info we need to restore this session
        fs.writeFileSync('./'+cliente+'auth_info.json', JSON.stringify(authInfo, null, '\t')) // save this info to a file
    })

    const wa = conn;

    io.on("connection", async socket => {
      socket.emit("log", "Connecting...")
    
      conn.on("qr", qr => {
        qrcode.toDataURL(qr, (err, url) => {
          socket.emit("qr", url)
          socket.emit("log", "QR Code received, please scan!")
        })
      })
    
      conn.on("open", res => {
        socket.emit("qrstatus", "./assets/check.svg")
        socket.emit("log", "WhatsApp terhubung!")
        socket.emit("log", res)
      })
    
      conn.on("close", res => {
        socket.emit("log", "WhatsApp terputus!")
        socket.emit("log", res)
      })
    
      switch (conn.state) {
        case "close":
          await conn.connect()
          break
        case "open":
          socket.emit("qrstatus", "./assets/check.svg")
          socket.emit("log", "WhatsApp terhubung!")
          break
        default:
          socket.emit("log", conn.state)
      }
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
    if (fs.existsSync('./'+cliente+'auth_info.json')) {
      conn.loadAuthInfo ('./'+cliente+'auth_info.json') // will load JSON credentials from file
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
// SendList
app.post('/send-list', async (req, res) => {

  const number = req.body.number;
  const row1 = req.body.row1;
  const row2 = req.body.row2;
  const description1 = req.body.description1;
  const description2 = req.body.description2;
  const title = req.body.title;
  const buttonText = req.body.buttonText;
  const description = req.body.description;

  // send a list message!
  const rows = [
    {title: row1, description: description1, rowId:"rowid1"},
    {title: row2, description: description2, rowId:"rowid2"}
  ]
  
  const sections = [{title: title, rows: rows}]
  
  const button = {
    buttonText: buttonText,
    description: description,
    sections: sections,
    listType: 1
  }
 
  const sendMsg = await conn.sendMessage(number + '@s.whatsapp.net', button, MessageType.listMessage)
  .then(response => {
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

})

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
      const message = req.body.message;
      const numberValid = await wa.isOnWhatsApp(number)

      
      if (numberValid) {
        await conn.sendMessage (numberValid.jid, message, MessageType.text).then(response => {
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
      } else {
        res.status(500).json({
          status: false,
          response: `O ${number} não é um número de Whatsapp.`
        })
      }

    })


// APP
// POST
// SendButton
app.post('/send-button', async (req, res) => {

      const number = req.body.number;
      const displayText1 = req.body.displayText1;
      const displayText2 = req.body.displayText2;
      const displayText3 = req.body.displayText3;
      const contentText = req.body.contentText;
      const footerText = req.body.footerText;

      // send a buttons message!
      const buttons = [
        {buttonId: 'id1', buttonText: {displayText: displayText1}, type: 1},
        {buttonId: 'id2', buttonText: {displayText: displayText2}, type: 1},
        {buttonId: 'id3', buttonText: {displayText: displayText3}, type: 1}
      ]

      const buttonMessage = {
          contentText: contentText,
          footerText: footerText,
          buttons: buttons,
          headerType: 1
      }

      const sendMsg = await conn.sendMessage(number + '@s.whatsapp.net', buttonMessage, MessageType.buttonsMessage)
      .then(response => {
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

    })

// APP
// POST
// SendList
app.post('/send-list', async (req, res) => {

  const number = req.body.number;
  const row1 = req.body.row1;
  const row2 = req.body.row2;
  const description1 = req.body.description1;
  const description2 = req.body.description2;
  const title = req.body.title;
  const buttonText = req.body.buttonText;
  const description = req.body.description;

  // send a list message!
  const rows = [
    {title: row1, description: description1, rowId:"rowid1"},
    {title: row2, description: description2, rowId:"rowid2"}
  ]
  
  const sections = [{title: title, rows: rows}]
  
  const button = {
    buttonText: buttonText,
    description: description,
    sections: sections,
    listType: 1
  }
 
  const sendMsg = await conn.sendMessage(number + '@s.whatsapp.net', button, MessageType.listMessage)
  .then(response => {
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

})

// APP
// POST
// SendVcard
app.post('/send-vcard', async (req, res) => {

  const number = req.body.number;
  const Vname = req.body.Vname;
  const Vorg = req.body.Vorg;

  // send a vCard!
  const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
  + 'VERSION:3.0\n' 
  + 'FN:'+ Vname + '\n' // full name
  + 'ORG:'+ Vorg + '\n' // the organization of the contact
  + 'TEL;type=CELL;type=VOICE;waid=' + number + ':+' + number + '\n' // WhatsApp ID + phone number
  + 'END:VCARD'
  const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', {displayname: Vname, vcard: vcard}, MessageType.contact)

  .then(response => {
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

})

// APP
// POST
// SendImage
app.post('/send-image', async (req, res) => {

  const number = req.body.number;
  const filePath = req.body.filePath;
  const caption = req.body.caption;
  const extension = filePath.split(".")[1];
  if (extension === "png") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.image,{ mimetype: Mimetype.png, caption: caption })
    .then(response => {
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
  else if (extension === "jpeg") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.image,{ mimetype: Mimetype.jpeg, caption: caption })
    .then(response => {
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

// APP
// POST
// SendAudio
app.post('/send-audio', async (req, res) => {

  const number = req.body.number;
  const filePath = req.body.filePath;
  const caption = req.body.caption;
  const extension = filePath.split(".")[1];
  if (extension === "ogg") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.audio,{ mimetype: Mimetype.ogg, caption: caption })
    .then(response => {
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
  else if (extension === "mp3") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.audio,{ mimetype: Mimetype.mp3, caption: caption })
    .then(response => {
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

// APP
// POST
// SendVideo
app.post('/send-video', async (req, res) => {

  const number = req.body.number;
  const filePath = req.body.filePath;
  const caption = req.body.caption;
  const extension = filePath.split(".")[1];
  if (extension === "gif") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.video,{ mimetype: Mimetype.gif, caption: caption })
    .then(response => {
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
  else if (extension === "mp4") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.video,{ mimetype: Mimetype.mp4, caption: caption })
    .then(response => {
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


// APP
// POST
// SendImage
app.post('/send-image', async (req, res) => {

  const number = req.body.number;
  const filePath = req.body.filePath;
  const caption = req.body.caption;
  const extension = filePath.split(".")[1];
  if (extension === "png") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.image,{ mimetype: Mimetype.png, caption: caption })
    .then(response => {
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
  else if (extension === "jpeg") {
    const sentMsg  = await conn.sendMessage(number + '@s.whatsapp.net', fs.readFileSync("./" + filePath), MessageType.image,{ mimetype: Mimetype.jpeg, caption: caption })
    .then(response => {
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
  
// www.zapdasgalaxias.com.br
// www.maiconramos.com