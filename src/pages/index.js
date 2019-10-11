/* eslint-disable */
import React from 'react'
import { Users } from '../components/ipfs/Users'
import { Chat } from '../components/ipfs/Chat'
import { Buffer } from 'ipfs'
import { keygen, decrypt, encrypt } from '../components/encryptionpgp'
import SoundMute from '../assets/images/volume-mute-solid.svg'
import SoundUp from '../assets/images/volume-up-solid.svg'


const IPFS = typeof window !== `undefined` ? require('ipfs') : null
const OrbitDB = typeof window !== `undefined` ? require('orbit-db') : null

const MASTER_MULTIADDR = `/dns4/wss.psfoundation.cash/tcp/443/wss/ipfs/QmaUW4oCVPUFLRqeSjvhHwGFJHGWrYWLBEt7WxnexDm3Xa`
let DB_ADDRESS = `/orbitdb/zdpuAwv8VBZUtY7mbjFqgVkAvntwpvVZP8AH5raqSnZwy7TE5/orbitdbchatipfs987333979`

let myDateConnection = new Date()
let PUBSUB_CHANNEL = 'ipfsObitdb-chat'
const DB_NAME_CONTROL_USERNAMES = 'controlUsersName1234885'
let channelsSuscriptions = []
let myNameStoreKey = 'myUsername'
let db_nicknameControl
let db

let _this

export class chatapp extends React.Component {
  state = {
    ipfs: null,
    orbitdb: null,
    masterConnected: false,
    onlineNodes: [],
    ipfsId: '',
    channelSend: 'ipfsObitdb-chat',
    output: '',
    isConnected: false,
    success: false,
    username: 'Node' + Math.floor(Math.random() * 900 + 100).toString(),
    chatWith: 'All',
    dbIsReady: false,
    sound: true,
    showArrow: false,
    keysData: {
      passphrase: '',
      privkey: '',
      pubkey: '',
      revocationCertificate: '',
      privKeyObj: ''
    },
    chatPublicKey: ''
  }

  constructor(props) {
    super(props)

    _this = this

    // Exit if IPFS or OrbitDB are not avaiable in the browser.
    if (!IPFS || !OrbitDB) return

    //connect to IPFS
    const ipfs = new IPFS({
      repo: './orbitdbipfs/chatapp/ipfs',
      EXPERIMENTAL: {
        pubsub: true,
      },
      relay: {
        enabled: true, // enable circuit relay dialer and listener
        hop: {
          enabled: true, // enable circuit relay HOP (make this node a relay)
        },
      },
      config: {
        Addresses: {
          Swarm: [MASTER_MULTIADDR],
          // TODO: Ensure other public wss servers are added to the swarm.
        },
      },
    })

    ipfs.on('ready', async () => {
      console.log('ipfs ready')

      // Pass the IPFS instance to the window object. Makes it easy to debug IPFS
      // issues in the browser console.
      if (typeof window !== 'undefined') window.ipfs = ipfs

      // Create OrbitDB instance
      const optionsDb = {
        directory: './orbitdbipfs/chatapp/store',
      }
      const orbitdb = await OrbitDB.createInstance(ipfs, optionsDb)
      console.log('orbitdb ready')

      // store ipfs and orbitdb in state
      let ipfsId = await ipfs.id()
      _this.setState({
        ipfs: ipfs,
        orbitdb: orbitdb,
        ipfsId: ipfsId.id,
      })

      // Wait until we can connect to the chat server.
      // Multiple connections will blacklist the server.
      await _this.state.ipfs.swarm.connect(MASTER_MULTIADDR)
      console.log(`Connected to master node.`)
      _this.setState({
        masterConnected: true,
      })

      // Instantiate db key-value to store my username
      try {
        const access = {
          // Give write access to everyone
          write: ['*'],
        }
        db_nicknameControl = await orbitdb.keyvalue(
          DB_NAME_CONTROL_USERNAMES,
          access
        )
        await db_nicknameControl.load()
        console.log(`db_nicknameControl id: ${db_nicknameControl.id}`)
      } catch (e) {
        console.error(e)
      }

      // Verify, obtain and make persistent my username
      _this.getUserName()

      //Verify , obtain and make encryption keys
      _this.getKeysData()

      // Create a local instance of the group chat database.
      _this.createDb(DB_ADDRESS)

      //Subscribe to master channel
      channelsSuscriptions.push(PUBSUB_CHANNEL)
      _this.state.ipfs.pubsub.subscribe(PUBSUB_CHANNEL, data => {
        const jsonData = JSON.parse(data.data.toString())
        if (jsonData.onlineNodes) {
          let onlineUsers = []
          for (var nodes in jsonData.onlineNodes) {
            jsonData.onlineNodes[nodes].username
              ? onlineUsers.push(jsonData.onlineNodes[nodes])
              : onlineUsers.push(nodes)
          }
          let Nodes = [...onlineUsers]
          //console.log(onlineUsers)
          if (_this.state.onlineNodes != onlineUsers) {
            _this.setState({
              onlineNodes: [...onlineUsers],
            })
          }
        }
        if (jsonData.status === 'message' &&
          data.from !== _this.state.ipfsId &&
          _this.state.chatWith === 'All') {
          _this.playSound();
        }
        //Recived status online to master to control my status
        if (jsonData.status === 'online' && jsonData.username === 'system') {
          if (_this.state.isConnected === false) {
            _this.setState({
              isConnected: true,
            })
            myDateConnection = new Date()
          }
        }
      })

      //Send status online to master to control online users
      setInterval(() => {
        const msg = {
          status: 'online',
          username: _this.state.username,
          publicKey: _this.state.keysData.pubkey
        }
        const msgEncoded = Buffer.from(JSON.stringify(msg))
        _this.state.ipfs.pubsub.publish(PUBSUB_CHANNEL, msgEncoded, err => {
          if (err) {
            return console.error(`failed to publish to ${PUBSUB_CHANNEL}`, err)
          }
        })
        // Verify my connection status
        if ((new Date() - myDateConnection) / 1500 > 6) {
          _this.setState({
            isConnected: false,
          })
          //  console.log("Disconneted")
        }
      }, 1000)

      /*
      Subscribe to my own channel.
      This  get info to personal chat request
      */
      channelsSuscriptions.push(ipfsId.id)
      _this.state.ipfs.pubsub.subscribe(ipfsId.id, data => {
        const jsonData = JSON.parse(data.data.toString())
        if (jsonData.peer1 === ipfsId.id) {
          _this.setState({
            channelSend: jsonData.channelName,
          })
          let flag = true
          _this.createDb(jsonData.peer2 + jsonData.dbName, true)
          for (let i = 0; i < channelsSuscriptions.length; i++)
            // verify existing subscriptions
            if (flag && channelsSuscriptions[i] === jsonData.channelName)
              flag = false
          flag && _this.subscribe(jsonData.channelName) // subscribe to private ch chat
        }
      })
    })
  }

  render() {
    return (
      <div>

        <audio id="audio" src="http://blender.freemovies.co.uk/blenderfiles/car/bell.wav" autoPlay={false} ></audio>
        <div className="container-status">
          <span id="container-arrow" className="container-arrow ">
            {(_this.state.showArrow && window.screen.width <= 720) ?
              <i className="fa fa-arrow-left"
                aria-hidden="true"
                onClick={_this.changeCss}>
              </i>
              : ''
            }
          </span>
          <span className="span-text">
            NODE IPFS:{' '}
            <b>
              {_this.state.ipfs === null
                ? ` Not Instantiated`
                : ` Instantiated`}
            </b>
          </span>
          <span className="span-text">
            ORBITDB:
            <b>
              {_this.state.orbitdb === null
                ? ` Not Instantiated  `
                : `Instantiated  `}
            </b>
          </span>
          <span className="span-text">
            IPFS CONNECTION:{' '}
            <b>
              {_this.state.masterConnected === false
                ? ` Connecting to master ....  `
                : ` Connected!!  `}
            </b>
          </span>
          <span className="span-text status">
            CHAT STATUS:{' '}
            <b>
              {_this.state.isConnected === false
                ? ` Disconnected  `
                : ` Connected!!  `}
            </b>
          </span>
          <span className="container-sound">
            {
              _this.state.sound ?
                <img src={SoundUp}
                  width="20"
                  heigth="20"
                  onClick={_this.soundStatus}>
                </img>
                : <img src={SoundMute}
                  width="20"
                  heigth="20"
                  onClick={_this.soundStatus}>
                </img>
            }
          </span>
        </div>
        <div className="container-flex">
          <div id="container-users" className="container-users">
            <Users
              ipfs={_this.state.ipfs}
              orbitdb={_this.state.orbitdb}
              onlineNodes={_this.state.onlineNodes}
              PUBSUB_CHANNEL={PUBSUB_CHANNEL}
              ipfsId={_this.state.ipfsId}
              requestPersonChat={_this.requestPersonChat}
              updateChatName={_this.updateChatName}
              changeCss={_this.changeCss}
            ></Users>
          </div>
          <div id="container-chat" className="container-chat">
            <Chat
              ipfs={_this.state.ipfs}
              orbitdb={_this.state.orbitdb}
              ipfsId={_this.state.ipfsId}
              output={_this.state.output}
              channelSend={_this.state.channelSend}
              PUBSUB_CHANNEL={PUBSUB_CHANNEL}
              username={_this.state.username}
              AddMessage={_this.AddMessage}
              changeUserName={_this.getUserName}
              chatWith={_this.state.chatWith}
              myPublicKey={_this.state.keysData.pubkey}
              dbIsReady={_this.state.dbIsReady}
              chatPublicKey={_this.state.chatPublicKey}
              updateOutput={_this.updateOutput}
            ></Chat>
          </div>
        </div>
      </div>
    )
  }

  // change css . display users or chat containers for mobile 
  changeCss(goToChat) {

    if (window.screen.width > 720) return; // if non mobile device

    // show users container for mobile device
    _this.setState({
      showArrow: false,
    })
    const usersElement = document.getElementById("container-users");
    usersElement.className = "container-users";
    const chatElement = document.getElementById("container-chat");
    chatElement.className = "container-chat";


    //show chat containers  for mobile device
    if (goToChat === true) {
      _this.setState({
        showArrow: true,
      })

      const usersElement = document.getElementById("container-users");
      usersElement.className = usersElement.className + " hide-container-users";

      const chatElement = document.getElementById("container-chat");
      chatElement.className = chatElement.className + " show-container-chat";

    }


  }
  playSound() {
    if (!_this.state.sound) return
    const sound = document.getElementById("audio");
    sound.play();
  }
  soundStatus() {

    _this.setState({
      sound: !_this.state.sound,
    })

  }
  // Create a new instance of a database.
  async createDb(db_addrs, createNew = false) {
    try {
      _this.setState({
        output: '',
      })

      const access = {
        accessController: {
          write: ['*'],
          overwrite: true,
        },
      }
      db = await _this.state.orbitdb.eventlog(db_addrs, access)

      await db.load()

      await _this.queryGet()
      _this.setState({
        dbIsReady: true,
      })


      db.events.on('replicated', db_addrs => {
        if (_this.state.chatWith === 'All')
          _this.queryGet()
        //console.warn('replicated event')
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Subscribe to an IPFS pubsub channel.
  async subscribe(channelName) {
    if (!_this.state.ipfs) return
    channelsSuscriptions.push(channelName)
    _this.state.ipfs.pubsub.subscribe(channelName, async  data => {
      const jsonData = JSON.parse(data.data.toString())
      //verify message from another user
      if ((data.from !== _this.state.ipfsId)) {
        // decrypt message
        let msgDecrypted = await decrypt(_this.state.keysData.privkey, _this.state.keysData.passphrase, jsonData)
        let msg2 = JSON.parse(msgDecrypted)
        if (_this.state.chatWith === msg2.username) {
          let msg = { nickname: msg2.username, message: msg2.message }
          _this.updateOutput(msg)
          _this.playSound();
          // encrypt message 
          let entry = await encrypt(_this.state.keysData.pubkey, JSON.stringify(msg))
          await _this.AddMessage(entry) // adding msg to orbit DB

        }
      }
    })
    console.warn('subscribed to : ' + channelName)
  }

  updateOutput(msg) {
    let output = _this.state.output +
      msg.nickname + ' : ' +
      msg.message + `\n`;


    _this.setState({
      output: output,
    })
  }

  // Adding messages to  event log orbit db
  async AddMessage(entry) {

    try {
      await db.add(entry)
      _this.queryGet()
    } catch (e) {
      console.error(e)
    }
  }

  // Get the the latest messages from the event log DB.
  async queryGet() {
    let latestMessages
    try {


      latestMessages = db.iterator({ limit: 10 }).collect()


      // console.log(latestMessages)
      // Validate - decrypt private messages. PUBSUB_CHANNEL is public chat

      if (_this.state.channelSend === PUBSUB_CHANNEL) {
        let output = ''
        output +=
          latestMessages
            .map(
              e => e.payload.value.nickname + ' : ' + e.payload.value.message
            )
            .join('\n') + `\n`
        _this.setState({
          output: output,
        })
      } else {
        //Decrytp db value

        _this.getDataDecrypted(latestMessages)
      }
    } catch (e) {
      console.error(e)
    }

  }
  //Decrypt message from  db
  async getDataDecrypted(arrayData) {
    let output = ''
    if (arrayData.length == 0) {
      _this.setState({
        output: output,
      })
      return
    }
    arrayData.map(async (val, i) => {

      //  console.log(val.payload.value)
      let decoded = await decrypt(_this.state.keysData.privkey, _this.state.keysData.passphrase, val.payload.value)
      if (decoded) {

        // console.log(decoded)
        let ObjectDecode = JSON.parse(decoded)

        // console.log(ObjectDecode)
        output += `${ObjectDecode.nickname} : ${ObjectDecode.message} \n`
        if (i >= arrayData.length - 1) {
          _this.setState({
            output: output,
          })
        }
      }
    })
  }
  // Request a private chat session with another user.
  async requestPersonChat(value, reset) {

    const peerClient = value.keyId



    //validate for loaded db
    if (_this.state.dbIsReady === false) return
    _this.setState({
      dbIsReady: false,
    })
    if (reset) {
      _this.createDb(DB_ADDRESS)
      return PUBSUB_CHANNEL
    }

    _this.setState({
      chatPublicKey: value.publicKey,
    })
    setTimeout(() => {
      console.log(_this.state.chatPublicKey)
    }, 1500)

    const myID = _this.state.ipfsId
    const clientId = peerClient.toString()
    const newChannelName = myID + clientId
    const newDbName =
      Math.floor(Math.random() * 10000 + 1000).toString()

    const msg = {
      status: 'requestChat',
      channelName: newChannelName,
      dbName: newDbName,
      peer1: myID,
      peer2: clientId,
      dbId: db.id,

    }
    const msgEncoded = Buffer.from(JSON.stringify(msg))
    _this.state.ipfs.pubsub.publish(PUBSUB_CHANNEL, msgEncoded)

    return newChannelName
  }

  // Switch out randomly-assigned user names with user-selected user names.
  async updateChatName(chatname, channelName) {
    _this.setState({
      chatWith: chatname,
      channelSend: channelName
    })
  }

  // Verify, obtain and make persistent my username
  async getUserName(changeUserName, username) {
    // Edit my username on the database(key-value)
    if (changeUserName === true) {
      if (username === _this.state.username) return
      await db_nicknameControl.set(myNameStoreKey, { username: username })
      _this.setState({
        username: username,
      })
      return
    }
    try {
      //get username from data base
      const userName = await db_nicknameControl.get(myNameStoreKey)
      // Uses username previously saved
      if (userName) {
        _this.setState({
          username: userName.username,
        })
      } else {
        // If there's no username on the database,
        //adds random username assigned
        await db_nicknameControl.set(myNameStoreKey, {
          username: _this.state.username,
        })
      }
    } catch (e) {
      console.error(e)
    }
  }


  //Verify , obtain and make encryption keys
  async getKeysData() {

    // get encrypion keys from local storage 
    const passphrase = localStorage.getItem('passphrase')
    const privkey = localStorage.getItem('privkey')
    const pubkey = localStorage.getItem('pubkey')
    const revocationCertificate = localStorage.getItem('revocationCertificate')
    const ipfsId = localStorage.getItem('ipfsId')
    // set encryption keys to state
    if (privkey && privkey && passphrase && ipfsId === _this.state.ipfsId) {

      _this.setState({
        keysData: {
          passphrase: passphrase,
          privkey: privkey,
          pubkey: pubkey,
          revocationCertificate: revocationCertificate,
        },
      })
    } else {
      localStorage.clear()

      // If there's no encryption keys on the local storage,

      const keysInfo = await keygen()

      _this.setState({
        keysData: keysInfo,
      })
      localStorage.setItem('passphrase', keysInfo.passphrase)
      localStorage.setItem('privkey', keysInfo.privkey)
      localStorage.setItem('pubkey', keysInfo.pubkey)
      localStorage.setItem('revocationCertificate', keysInfo.revocationCertificate)
      localStorage.setItem('ipfsId', _this.state.ipfsId)
    }
  }
}

export default chatapp
