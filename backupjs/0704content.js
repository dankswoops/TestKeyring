console.log('Nostr Key Signer: Content script starting');

const injectScript = () => {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      console.log('Nostr Key Signer: Injecting window.nostr object');
      window.nostr = {
        getPublicKey: () => {
          console.log('Nostr Key Signer: getPublicKey called');
          return new Promise((resolve, reject) => {
            window.postMessage({ type: 'NOSTR_GET_PUBLIC_KEY' }, '*');
            window.addEventListener('message', function listener(event) {
              if (event.data.type === 'NOSTR_PUBLIC_KEY_RESPONSE') {
                window.removeEventListener('message', listener);
                if (event.data.error) {
                  console.error('Nostr Key Signer: Error getting public key', event.data.error);
                  reject(new Error(event.data.error));
                } else {
                  console.log('Nostr Key Signer: Public key received', event.data.publicKey);
                  resolve(event.data.publicKey);
                }
              }
            });
          });
        },
        signEvent: (event) => {
          console.log('Nostr Key Signer: signEvent called', event);
          return new Promise((resolve, reject) => {
            window.postMessage({ type: 'NOSTR_SIGN_EVENT', event }, '*');
            window.addEventListener('message', function listener(event) {
              if (event.data.type === 'NOSTR_SIGNED_EVENT_RESPONSE') {
                window.removeEventListener('message', listener);
                if (event.data.error) {
                  console.error('Nostr Key Signer: Error signing event', event.data.error);
                  reject(new Error(event.data.error));
                } else {
                  console.log('Nostr Key Signer: Event signed', event.data.signedEvent);
                  resolve(event.data.signedEvent);
                }
              }
            });
          });
        },
        nip04: {
          encrypt: (recipientPubkey, plaintext) => {
            console.log('Nostr Key Signer: nip04.encrypt called');
            return new Promise((resolve, reject) => {
              window.postMessage({ type: 'NOSTR_ENCRYPT_MESSAGE', recipientPubkey, plaintext }, '*');
              window.addEventListener('message', function listener(event) {
                if (event.data.type === 'NOSTR_ENCRYPTED_MESSAGE_RESPONSE') {
                  window.removeEventListener('message', listener);
                  if (event.data.error) {
                    console.error('Nostr Key Signer: Error encrypting message', event.data.error);
                    reject(new Error(event.data.error));
                  } else {
                    console.log('Nostr Key Signer: Message encrypted', event.data.encryptedMessage);
                    resolve(event.data.encryptedMessage);
                  }
                }
              });
            });
          },
          decrypt: (senderPubkey, ciphertext) => {
            console.log('Nostr Key Signer: nip04.decrypt called');
            return new Promise((resolve, reject) => {
              window.postMessage({ type: 'NOSTR_DECRYPT_MESSAGE', senderPubkey, ciphertext }, '*');
              window.addEventListener('message', function listener(event) {
                if (event.data.type === 'NOSTR_DECRYPTED_MESSAGE_RESPONSE') {
                  window.removeEventListener('message', listener);
                  if (event.data.error) {
                    console.error('Nostr Key Signer: Error decrypting message', event.data.error);
                    reject(new Error(event.data.error));
                  } else {
                    console.log('Nostr Key Signer: Message decrypted', event.data.decryptedMessage);
                    resolve(event.data.decryptedMessage);
                  }
                }
              });
            });
          }
        }
      };
      console.log('Nostr Key Signer: window.nostr object injected');
      window.dispatchEvent(new Event('nostr:ready'));
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  console.log('Nostr Key Signer: Script injected into the page');
};

// Inject the script as soon as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScript);
} else {
  injectScript();
}

window.addEventListener('message', async (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'NOSTR_GET_PUBLIC_KEY') {
    console.log('Nostr Key Signer: Received request for public key');
    try {
      const response = await chrome.runtime.sendMessage({ type: 'getPublicKey' });
      console.log('Nostr Key Signer: Public key received from background', response);
      window.postMessage({ type: 'NOSTR_PUBLIC_KEY_RESPONSE', publicKey: response }, '*');
    } catch (error) {
      console.error('Nostr Key Signer: Error getting public key from background', error);
      window.postMessage({ type: 'NOSTR_PUBLIC_KEY_RESPONSE', error: error.message }, '*');
    }
  } else if (event.data.type === 'NOSTR_SIGN_EVENT') {
    console.log('Nostr Key Signer: Received request to sign event', event.data.event);
    try {
      const signedEvent = await chrome.runtime.sendMessage({ type: 'signEvent', event: event.data.event });
      console.log('Nostr Key Signer: Event signed by background', signedEvent);
      window.postMessage({ type: 'NOSTR_SIGNED_EVENT_RESPONSE', signedEvent }, '*');
    } catch (error) {
      console.error('Nostr Key Signer: Error signing event in background', error);
      window.postMessage({ type: 'NOSTR_SIGNED_EVENT_RESPONSE', error: error.message }, '*');
    }
  } else if (event.data.type === 'NOSTR_ENCRYPT_MESSAGE') {
    console.log('Nostr Key Signer: Received request to encrypt message');
    try {
      const encryptedMessage = await chrome.runtime.sendMessage({ 
        type: 'encryptMessage', 
        recipientPubkey: event.data.recipientPubkey, 
        content: event.data.plaintext 
      });
      console.log('Nostr Key Signer: Message encrypted by background', encryptedMessage);
      window.postMessage({ type: 'NOSTR_ENCRYPTED_MESSAGE_RESPONSE', encryptedMessage }, '*');
    } catch (error) {
      console.error('Nostr Key Signer: Error encrypting message in background', error);
      window.postMessage({ type: 'NOSTR_ENCRYPTED_MESSAGE_RESPONSE', error: error.message }, '*');
    }
  } else if (event.data.type === 'NOSTR_DECRYPT_MESSAGE') {
    console.log('Nostr Key Signer: Received request to decrypt message');
    try {
      const decryptedMessage = await chrome.runtime.sendMessage({ 
        type: 'decryptMessage', 
        senderPubkey: event.data.senderPubkey, 
        encryptedContent: event.data.ciphertext 
      });
      console.log('Nostr Key Signer: Message decrypted by background', decryptedMessage);
      window.postMessage({ type: 'NOSTR_DECRYPTED_MESSAGE_RESPONSE', decryptedMessage }, '*');
    } catch (error) {
      console.error('Nostr Key Signer: Error decrypting message in background', error);
      window.postMessage({ type: 'NOSTR_DECRYPTED_MESSAGE_RESPONSE', error: error.message }, '*');
    }
  }
});

console.log('Nostr Key Signer: Content script loaded');