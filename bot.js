const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = null;
let isConnected = false;

app.use(express.json());

// Route principale
app.get('/', (req, res) => {
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
        .status {
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: center;
          font-weight: bold;
        }
        .online { background: #4CAF50; }
        .offline { background: #f44336; }
        .connecting { background: #ff9800; }
        .qr-instructions {
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
        .qr-code {
          background: white;
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 RMD Bot WhatsApp</h1>
        
        <div id="status" class="status ${isConnected ? 'online' : 'connecting'}">
          ${isConnected ? '✅ Connecté' : '🔄 En attente de connexion...'}
        </div>

        <div class="qr-instructions">
          <h3>📋 Instructions de Connexion</h3>
          <div class="step">
            <strong>1. Le QR Code s'affiche dans les LOGS de Render</strong>
          </div>
          <div class="step">
            <strong>2. Allez dans l'onglet "Logs" de votre application Render</strong>
          </div>
          <div class="step">
            <strong>3. Cherchez le QR Code dans les messages de log</strong>
          </div>
          <div class="step">
            <strong>4. Scannez-le avec WhatsApp → Appareils connectés</strong>
          </div>
        </div>

        <div id="qrContainer" class="qr-code" style="display: none;">
          <h3>📱 QR Code de Connexion</h3>
          <pre id="qrDisplay">Chargement du QR Code...</pre>
          <p>Scannez ce code avec WhatsApp</p>
        </div>

        <div class="qr-instructions">
          <h3>📞 Support RMD125</h3>
          <div class="step">📱 WhatsApp: +228 96 19 09 34</div>
          <div class="step">📱 WhatsApp: +228 96 12 40 78</div>
          <div class="step">⏰ Réponse sous 24h maximum</div>
        </div>
      </div>

      <script>
        function updateStatus(connected) {
          const statusDiv = document.getElementById('status');
          const qrContainer = document.getElementById('qrContainer');
          
          if (connected) {
            statusDiv.className = 'status online';
            statusDiv.innerHTML = '✅ Connecté avec succès!';
            qrContainer.style.display = 'none';
          } else {
            statusDiv.className = 'status connecting';
            statusDiv.innerHTML = '🔄 En attente de QR Code...';
          }
        }

        function displayQRCode(qrText) {
          const qrDisplay = document.getElementById('qrDisplay');
          const qrContainer = document.getElementById('qrContainer');
          
          qrDisplay.textContent = qrText;
          qrContainer.style.display = 'block';
          updateStatus(false);
        }

        // Connexion SSE pour les mises à jour
        const eventSource = new EventSource('/qr-updates');
        
        eventSource.onmessage = function(event) {
          const data = JSON.parse(event.data);
          
          if (data.type === 'qr') {
            displayQRCode(data.qr);
          } else if (data.type === 'connected') {
            updateStatus(true);
          }
        };
      </script>
    </body>
    </html>
  `);
});

// Route pour les mises à jour en temps réel
app.get('/qr-updates', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Envoyer le QR code actuel si disponible
  if (currentQR) {
    res.write(`data: ${JSON.stringify({ type: 'qr', qr: currentQR })}\n\n`);
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 Accédez à l'URL Render pour voir l'interface`);
  initializeWhatsApp();
});

async function initializeWhatsApp() {
  try {
    console.log('🔗 Initialisation de la connexion WhatsApp...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      // NE PAS utiliser printQRInTerminal car déprécié
      logger: pino({ level: 'silent' }),
      // Options de connexion
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      browser: ['RMD Bot', 'Chrome', '120.0.0.0']
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Gestion manuelle du QR Code
      if (qr) {
        console.log('\n' + '='.repeat(50));
        console.log('📱 QR CODE WHATSAPP DISPONIBLE');
        console.log('='.repeat(50));
        
        // Générer le QR code manuellement
        qrcode.generate(qr, { small: true });
        
        console.log('='.repeat(50));
        console.log('💡 Instructions:');
        console.log('1. Ouvrez WhatsApp → Paramètres → Appareils connectés');
        console.log('2. Cliquez sur "Connecter un appareil"');
        console.log('3. Scannez le QR code ci-dessus');
        console.log('='.repeat(50) + '\n');
        
        currentQR = qr;
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('🔌 Déconnecté - Reconnexion dans 3 secondes...');
        currentQR = null;
        isConnected = false;
        
        if (shouldReconnect) {
          setTimeout(() => initializeWhatsApp(), 3000);
        }
      } else if (connection === 'open') {
        console.log('✅ CONNEXION RÉUSSIE À WHATSAPP!');
        currentQR = null;
        isConnected = true;
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Gestion des messages
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.key.fromMe && m.type === 'notify') {
        await sock.readMessages([message.key]);
        
        const text = getMessageText(message);
        const jid = message.key.remoteJid;
        
        if (text === '!ping') {
          await sock.sendMessage(jid, { text: '🏓 Pong! Bot RMD connecté' });
        }
        else if (text === '!aide') {
          await sock.sendMessage(jid, { text: helpMessage });
        }
        else if (text === '!status') {
          await sock.sendMessage(jid, { text: '✅ Bot RMD en ligne! Développé par RMD125' });
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('🔄 Nouvelle tentative dans 5 secondes...');
    setTimeout(() => initializeWhatsApp(), 5000);
  }
}

function getMessageText(message) {
  if (message.message?.conversation) {
    return message.message.conversation;
  }
  if (message.message?.extendedTextMessage?.text) {
    return message.message.extendedTextMessage.text;
  }
  return '';
}

const helpMessage = `
🤖 *RMD BOT - AIDE*

🔧 *Commandes Disponibles:*
!aide - Affiche ce message d'aide
!ping - Test de connexion du bot
!status - Statut du bot

👑 *Développeur:* RMD125
📞 *Support:* +228 96 19 09 34

_Utilisez ! devant chaque commande_
`;

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error.message);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du bot...');
  process.exit(0);
});
