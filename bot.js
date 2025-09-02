const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function startBot() {
  console.log('🤖 Démarrage du RMD Bot...');
  
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false // IMPORTANT: ne pas utiliser true
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // Gestion MANUELLE du QR Code
    if (qr) {
      console.log('\n\n📱 SCANNEZ CE QR CODE AVEC WHATSAPP:');
      console.log('=====================================');
      qrcode.generate(qr, { small: false }); // small: false pour plus de visibilité
      console.log('=====================================');
      console.log('1. Ouvrez WhatsApp → Paramètres');
      console.log('2. Appareils connectés → Connecter un appareil');
      console.log('3. Scannez ce code QR');
      console.log('\n\n');
    }
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🔌 Déconnecté... reconnexion dans 3s');
      if (shouldReconnect) {
        setTimeout(startBot, 3000);
      }
    } else if (connection === 'open') {
      console.log('✅ CONNECTÉ AVEC SUCCÈS!');
      console.log('🤖 Bot RMD opérationnel!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
  
  // Gestion des messages
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && m.type === 'notify') {
      console.log('📨 Message reçu');
      
      const text = msg.message?.conversation || '';
      if (text === '!ping') {
        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Pong! RMD Bot actif' });
      }
    }
  });
}

// Démarrer le bot
startBot().catch(console.error);
