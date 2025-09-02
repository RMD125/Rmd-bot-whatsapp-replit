const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Replit
const IS_REPLIT = process.env.REPLIT_DB_URL !== undefined;
const DOMAIN = IS_REPLIT ? `https://${process.env.REPLIT_SLUG}.${process.env.REPLIT_OWNER}.repl.co` : 'http://localhost:3000';

app.use(express.json());

// Route principale avec QR Code
app.get('/', async (req, res) => {
  try {
    const qrImage = await QRCode.toDataURL(DOMAIN);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>🤖 RMD Bot WhatsApp - Replit</title>
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
          .qr-section {
            text-align: center;
            margin: 20px 0;
          }
          .qr-code {
            background: white;
            padding: 20px;
            border-radius: 10px;
            display: inline-block;
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
          .replit-badge {
            background: #000;
            color: white;
            padding: 10px;
            border-radius: 5px;
            text-align: center;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 RMD Bot WhatsApp</h1>
          <p>🚀 Hébergé sur Replit - Développé par <strong>RMD125</strong></p>
          
          <div class="replit-badge">
            🔗 ${DOMAIN}
          </div>

          <div class="qr-section">
            <h3>📱 Scannez pour vous connecter</h3>
            <div class="qr-code">
              <img src="${qrImage}" alt="QR Code" width="200" height="200">
            </div>
            <p>Utilisez une app de scan QR pour accéder au bot</p>
          </div>

          <div class="instructions">
            <h3>📋 Instructions de connexion :</h3>
            <div class="step">1. Scannez le QR code ci-dessus</div>
            <div class="step">2. Suivez le lien vers l'interface du bot</div>
            <div class="step">3. Scannez le QR Code WhatsApp qui s'affichera</div>
            <div class="step">4. Votre bot sera connecté!</div>
          </div>

          <div class="instructions">
            <h3>🔧 Commandes WhatsApp :</h3>
            <div class="step"><code>!ping</code> - Test de connexion</div>
            <div class="step"><code>!aide</code> - Menu d'aide</div>
            <div class="step"><code>!tagall</code> - Mentionner tous les membres</div>
            <div class="step"><code>!status</code> - Statut du bot</div>
          </div>

          <div class="instructions">
            <h3>📞 Support RMD125</h3>
            <div class="step">📱 WhatsApp: +228 96 19 09 34</div>
            <div class="step">📱 WhatsApp: +228 96 12 40 78</div>
            <div class="step">⏰ Réponse sous 24h maximum</div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Erreur de chargement: ' + error.message);
  }
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🤖 RMD BOT WHATSAPP - REPLIT EDITION');
  console.log('='.repeat(50));
  console.log(`🚀 Serveur démarré sur: ${DOMAIN}`);
  console.log(`📞 Support: +228 96 19 09 34`);
  console.log('='.repeat(50));
  
  initializeWhatsApp();
});

async function initializeWhatsApp() {
  try {
    console.log('🔗 Initialisation de la connexion WhatsApp...');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' }),
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        console.log('📱 QR Code WhatsApp disponible - Scannez-le!');
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('🔌 Déconnecté - Reconnexion dans 5 secondes...');
        setTimeout(() => initializeWhatsApp(), 5000);
      } else if (connection === 'open') {
        console.log('✅ Connecté avec succès à WhatsApp!');
        console.log('🤖 Bot opérationnel et prêt à recevoir des commandes');
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
          await sock.sendMessage(jid, { text: '🏓 Pong! Bot RMD opérationnel sur Replit!' });
        }
        else if (text === '!aide') {
          await sock.sendMessage(jid, { text: helpMessage });
        }
        else if (text === '!status') {
          await sock.sendMessage(jid, { text: '✅ Bot RMD en ligne sur Replit! Développé par RMD125' });
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
🤖 *RMD BOT - AIDE* 🚀

*Hébergé sur Replit - Développé par RMD125*

🔧 *Commandes Disponibles:*
!aide - Affiche ce message d'aide
!ping - Test de connexion du bot
!status - Statut du bot
!tagall - Mentionne tous les membres (groupes)

🏷️ *Fonctionnalités:*
- Messages avec mentions
- Réponses automatiques
- Gestion des groupes
- Connexion stable

👑 *Développeur:* RMD125
📞 *Support:* +228 96 19 09 34
🌐 *Hébergement:* Replit

_Utilisez ! devant chaque commande_
`;

// Gestion propre de la fermeture
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du bot...');
  process.exit(0);
});
