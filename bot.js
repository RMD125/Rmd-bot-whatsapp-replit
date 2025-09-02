const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Route principale avec QR Code
app.get('/', async (req, res) => {
  try {
    const appUrl = 'https://votre-app.render.com';
    const qrImage = await QRCode.toDataURL(appUrl);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>🤖 RMD Bot WhatsApp</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #25D366, #128C7E);
            color: white;
            min-height: 100vh;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
          }
          .qr-code {
            background: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
          }
          .instructions {
            background: white;
            color: #128C7E;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          .step {
            margin: 10px 0;
            padding: 10px;
            background: #e8f5e8;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 RMD Bot WhatsApp</h1>
          <p>Développé par <strong>RMD125</strong></p>
          
          <div class="qr-code">
            <h3>📱 Scannez ce QR Code</h3>
            <img src="${qrImage}" alt="QR Code" width="250" height="250">
            <p>Pour accéder à votre bot WhatsApp</p>
          </div>
          
          <div class="instructions">
            <h3>📋 Instructions :</h3>
            <div class="step">1. Ouvrez votre application de scan QR</div>
            <div class="step">2. Scannez le code ci-dessus</div>
            <div class="step">3. Suivez les instructions de connexion</div>
            <div class="step">4. Utilisez les commandes WhatsApp</div>
          </div>
          
          <div class="instructions">
            <h3>📞 Support RMD125</h3>
            <div class="step">📱 WhatsApp: +228 96 19 09 34</div>
            <div class="step">📱 WhatsApp: +228 96 12 40 78</div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Erreur de chargement');
  }
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  initializeWhatsApp();
});

async function initializeWhatsApp() {
  try {
    console.log('🔗 Initialisation WhatsApp...');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect } = update;
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('🔌 Déconnecté - Reconnexion...');
        setTimeout(() => initializeWhatsApp(), 5000);
      } else if (connection === 'open') {
        console.log('✅ Connecté à WhatsApp!');
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.key.fromMe && m.type === 'notify') {
        await sock.readMessages([message.key]);
        const text = message.message?.conversation || '';
        const jid = message.key.remoteJid;
        
        if (text === '!ping') await sock.sendMessage(jid, { text: '🏓 Pong!' });
        if (text === '!aide') await sock.sendMessage(jid, { text: '🤖 Commandes: !ping, !aide' });
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    setTimeout(() => initializeWhatsApp(), 5000);
  }
}
