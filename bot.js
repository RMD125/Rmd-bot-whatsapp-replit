const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

console.log('🤖 Démarrage du RMD Bot WhatsApp...');
console.log('📞 Support: +228 96 19 09 34');
console.log('='.repeat(50));

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Désactivé car déprécié
      logger: {
        level: 'silent' // Désactive les logs inutiles
      }
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      // Gestion MANUELLE du QR Code - TAILLE OPTIMISÉE
      if (qr) {
        console.log('\n'.repeat(3)); // Espacement
        console.log('='.repeat(40));
        console.log('📱 QR CODE WHATSAPP - SCANNEZ RAPIDEMENT');
        console.log('='.repeat(40));
        
        // QR Code de taille optimale
        qrcode.generate(qr, { 
          small: true // ← TAILLE RÉDUITE
        });
        
        console.log('='.repeat(40));
        console.log('💡 Instructions:');
        console.log('1. WhatsApp → Paramètres → Appareils connectés');
        console.log('2. "Connecter un appareil"');
        console.log('3. Scannez le code ci-dessus');
        console.log('⏰ Code valable 60 secondes');
        console.log('='.repeat(40));
        console.log('\n'.repeat(2));
      }
      
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('🔌 Déconnexion... reconnexion dans 5s');
        if (shouldReconnect) {
          setTimeout(startBot, 5000);
        }
      } else if (connection === 'open') {
        console.log('✅ CONNEXION RÉUSSIE!');
        console.log('🤖 Bot RMD opérationnel!');
      }
    });

    sock.ev.on('creds.update', saveCreds);
    
    // Gestion des messages
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      if (!msg.key.fromMe && m.type === 'notify') {
        const text = msg.message?.conversation || '';
        const jid = msg.key.remoteJid;
        
        if (text === '!ping') {
          await sock.sendMessage(jid, { text: '🏓 Pong! RMD Bot actif' });
        }
        else if (text === '!aide') {
          await sock.sendMessage(jid, { text: '🤖 Commandes: !ping, !aide, !status' });
        }
      }
    });

  } catch (error) {
    console.log('🔄 Erreur, nouvelle tentative dans 5s...');
    setTimeout(startBot, 5000);
  }
}

// Démarrer le bot
startBot();
