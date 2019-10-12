const openpgp = typeof window !== undefined ? require('openpgp') : null // use as CommonJS, AMD, ES6 module or via window.openpgp

const passphrase = 'super long and hard to guess secret';


export const keygen = async () => {
    var options = {
        userIds: [{ name: 'Jon Smith', email: 'jon@example.com' }], // multiple user IDs
        rsaBits: 1024,                                            // RSA key size
        passphrase: passphrase         // protects the private key
    };

    const keys = await openpgp.generateKey(options).then(function (key) {

        return key
    });
    const privKeyObj = (await openpgp.key.readArmored(keys.privateKeyArmored)).keys[0]
    await privKeyObj.decrypt(passphrase)
    const keysData = {
        passphrase: passphrase,
        privkey: keys.privateKeyArmored, // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        pubkey: keys.publicKeyArmored,   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
        revocationCertificate: keys.revocationCertificate, // '-----BEGIN PGP PUBLIC KEY BLOCK ... '     
        privKeyObj:privKeyObj
    }

   /* console.log('msgE')
    const msgE = await encrypt(keysData.pubkey, 'mensaje encriptado')
    console.log(msgE)
    console.log('msgD')
    const msgD = await decrypt(keysData.privkey, passphrase, msgE)
    console.log(msgD)

*/

    return keysData


}
keygen()

export const encrypt = async (pubkey, msg) => {

    const options = {
        message: openpgp.message.fromText(msg),       // input as Message object
        publicKeys: (await openpgp.key.readArmored(pubkey)).keys, // for encryption
    }

    const encryptedMsg = await openpgp.encrypt(options).then(ciphertext => {
        const encrypted = ciphertext.data // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
        return encrypted
    })

    return encryptedMsg

}

export const decrypt = async (privkey, passphrase, encrypted) => {





    const privKeyObj = (await openpgp.key.readArmored(privkey)).keys[0]
    await privKeyObj.decrypt(passphrase)
    const options = {
        message: await openpgp.message.readArmored(encrypted),    // parse armored message
        privateKeys: [privKeyObj]                                 // for decryption
    }
 
    const decryptedMsg = await openpgp.decrypt(options).then(plaintext => {
        return plaintext.data
    })

  
    return decryptedMsg


}

