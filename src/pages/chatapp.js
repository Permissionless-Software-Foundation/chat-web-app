/* eslint-disable */
import React from 'react'
import { Users } from '../components/ipfs/Users'
import { Chat } from '../components/ipfs/Chat'
import styled from 'styled-components'
const IPFS = typeof window !== `undefined` ? require('ipfs') : null
const OrbitDB = typeof window !== `undefined` ? require('orbit-db') : null

//const MASTER_MULTIADDR = `/ip4/138.68.212.34/tcp/4003/ws/ipfs/QmauKY7Sh47ZD49oy9VT1e9djHXmUjXfP6qPn4CnbEcXSn`
const MASTER_MULTIADDR = `/dns4/wss.psfoundation.cash/tcp/443/wss/ipfs/QmauKY7Sh47ZD49oy9VT1e9djHXmUjXfP6qPn4CnbEcXSn`

let DB_ADDRESS = `/orbitdb/zdpuAzAkWaD6niC8AjSt1jb1pVx9fwECFC96dsczSQvTrH1Di/orbitddbchatappipfs987979`

let myDateConnection = new Date()
let PUBSUB_CHANNEL = 'ipfsObitdb-chat'
const DB_NAME_CONTROL_USERNAMES = 'controlUsersName1234885'
let channelsSuscriptions = []
let myNameStoreKey = 'myUsername'
let db_nicknameControl
let db

let _this

const ContainerFlex = styled.div`
  display: flex;
  padding: 1em;
`
const SpanText = styled.span`
  margin: 1em;
`
const ContainerStatus = styled.div`
  width: 100%;
  padding: 1em;
`

const ContainerUsers = styled.div`
  width: 40%;
  text-align: center;
`
const ContainerChat = styled.div`
  width: 60%;
  text-align: center;
`
export class chatapp extends React.Component {
  state = {
    ipfs: null,
    orbitdb: null,
    masterConected: false,
    onlineNodes: [],
    ipfsId: '',
    channelSend: 'ipfsObitdb-chat',
    output: '',
    isConnected: false,
    success: false,
    username: 'Node' + Math.floor(Math.random() * 900 + 100).toString(),
    chatWith: 'All',
    dbIsReady: false,
  }

  constructor(props) {
    super(props)
    _this = this
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
        },
      },
    })

    ipfs.on('ready', async () => {
      console.log('ipfs ready')

      if (typeof window !== 'undefined') window.ipfs = ipfs

      //Create OrbitDB instance
      const optionsDb = {
        directory: './orbitdbipfs/chatapp/store',
      }
      const orbitdb = await OrbitDB.createInstance(ipfs, optionsDb)
      console.log('orbitdb ready')

      //store ipfs and orbitdb in state
      let ipfsId = await ipfs.id()
      _this.setState({
        ipfs: ipfs,
        orbitdb: orbitdb,
        ipfsId: ipfsId.id,
      })

      // Connect to the chat server.
      // Multiple connections will blacklist the server.
      await _this.state.ipfs.swarm.connect(MASTER_MULTIADDR)
      console.log(`Connected to master node.`)

      //Instantiated db key value to store my username
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
      _this.getUserName()

      _this.createDb(DB_ADDRESS) // create db

      //subscribe to master channel
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

          if (_this.state.onlineNodes != onlineUsers) {
            _this.setState({
              onlineNodes: [...onlineUsers],
            })
          }
        }
        //recived status online to master to control my status
        if (jsonData.status === 'online' && jsonData.username === 'system') {
          if (_this.state.isConnected === false) {
            _this.setState({
              isConnected: true,
            })
            myDateConnection = new Date()
          }
        }
      })

      //send status online to master to control online users
      setInterval(() => {
        const msg = { status: 'online', username: _this.state.username }
        const msgEncoded = Buffer.from(JSON.stringify(msg))
        _this.state.ipfs.pubsub.publish(PUBSUB_CHANNEL, msgEncoded, err => {
          if (err) {
            return console.error(`failed to publish to ${PUBSUB_CHANNEL}`, err)
          }
        })
        // verify my connection status
        if ((new Date() - myDateConnection) / 1500 > 5) {
          _this.setState({
            isConnected: false,
          })
          //  console.log("Disconneted")
        }
      }, 1000)

      // subscribe to my own channel
      channelsSuscriptions.push(ipfsId.id)
      _this.state.ipfs.pubsub.subscribe(ipfsId.id, data => {
        const jsonData = JSON.parse(data.data.toString())
        if (jsonData.peer1 === ipfsId.id) {
          _this.setState({
            channelSend: jsonData.channelName,
          })
          let flag = true
          _this.createDb(jsonData.dbName, true)
          for (let i = 0; i < channelsSuscriptions.length; i++)
            // verify existing subscriptions
            if (flag && channelsSuscriptions[i] === jsonData.channelName)
              flag = false
          flag && _this.subscribe(jsonData.channelName)
        }
      })
    })
  }

  render() {
    return (
      <div>
        <ContainerStatus>
          <SpanText>
            NODE IPFS:{' '}
            <b>
              {_this.state.ipfs === null
                ? ` Not Instantiated`
                : ` Instantiated`}
            </b>
          </SpanText>
          <SpanText>
            ORBITDB:
            <b>
              {_this.state.orbitdb === null
                ? ` Not Instantiated  `
                : `Instantiated  `}
            </b>
          </SpanText>
          <SpanText>
            IPFS CONNECTION:{' '}
            <b>
              {_this.state.masterConected === false
                ? ` Connecting to master ....  `
                : ` Connected!!  `}
            </b>
          </SpanText>
          <SpanText>
            CHAT STATUS:{' '}
            <b>
              {_this.state.isConnected === false
                ? ` Disconnected  `
                : ` Connected!!  `}
            </b>
          </SpanText>
        </ContainerStatus>
        <ContainerFlex>
          <ContainerUsers>
            <Users
              ipfs={_this.state.ipfs}
              orbitdb={_this.state.orbitdb}
              onlineNodes={_this.state.onlineNodes}
              PUBSUB_CHANNEL={PUBSUB_CHANNEL}
              ipfsId={_this.state.ipfsId}
              requestPersonChat={_this.requestPersonChat}
              updateChatName={_this.updateChatName}
            ></Users>
          </ContainerUsers>
          <ContainerChat>
            {_this.state.dbIsReady ? (
              <Chat
                ipfs={_this.state.ipfs}
                orbitdb={_this.state.orbitdb}
                ipfsId={_this.state.ipfsId}
                output={_this.state.output}
                channelSend={_this.state.channelSend}
                PUBSUB_CHANNEL={PUBSUB_CHANNEL}
                username={_this.state.username}
                query={_this.query}
                changeUserName={_this.getUserName}
                chatWith={_this.state.chatWith}
              ></Chat>
            ) : (
              <p>Loading Chat...</p>
            )}
          </ContainerChat>
        </ContainerFlex>
      </div>
    )
  }

  // Create a new instance of a database.
  async createDb(db_addrs, createNew = false) {
    try {
      const access = {
        accessController: {
          write: ['*'],
          overwrite: true,
        },
      }
      db = await _this.state.orbitdb.eventlog(db_addrs, access)

      await db.load()

      _this.setState({
        dbIsReady: true,
      })

      _this.queryGet()

      db.events.on('replicated', db_addrs => {
        _this.queryGet()
        console.warn('replicated event')
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Subscribe to an IPFS pubsub channel.
  async subscribe(channelName) {
    if (_this.state.ipfs) return
    channelsSuscriptions.push(channelName)
    _this.state.ipfs.pubsub.subscribe(channelName, data => {
      const jsonData = JSON.parse(data.data.toString())
      if (jsonData.status === 'message') {
        _this.query(jsonData.username, jsonData.message)
      }
    })
    console.warn('subscribed to : ' + channelName)
  }

  // Is this function querying data or adding data?
  // It is working with a key-value DB, right?
  async query(nickname, message) {
    try {
      const entry = { nickname: nickname, message: message }
      //encryt  entry here
      await db.add(entry)
      _this.queryGet()
    } catch (e) {
      console.error(e)
    }
  }

  // Get the the latest messages from the event log DB.
  async queryGet() {
    try {
      let latestMessages = db.iterator({ limit: 10 }).collect()
      let output = ''
      //desencryt  here e.payload.value
      output +=
        latestMessages
          .map(e => e.payload.value.nickname + ' : ' + e.payload.value.message)
          .join('\n') + `\n`
      _this.setState({
        output: output,
      })
    } catch (e) {
      console.error(e)
    }
  }

  // Request a priavate chat session with another user.
  async requestPersonChat(peerClient, reset) {
    if (_this.state.dbIsReady === false) return
    _this.setState({
      dbIsReady: false,
    })
    if (reset) {
      _this.createDb(DB_ADDRESS)
      return PUBSUB_CHANNEL
    }
    const myID = _this.state.ipfsId
    const clientId = peerClient.toString()
    const newChannelName = myID + clientId
    const newDbName = newChannelName + '1232772'
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
  async updateChatName(chatname) {
    _this.setState({
      chatWith: chatname,
    })
  }

  // Get the user names of other nodes connected to the chat app.
  async getUserName(changeUserName, username) {
    if (changeUserName === true) {
      if (username === _this.state.username) return
      await db_nicknameControl.set(myNameStoreKey, { username: username })
      _this.setState({
        username: username,
      })
      return
    }
    try {
      const userName = await db_nicknameControl.get(myNameStoreKey)
      if (userName) {
        _this.setState({
          username: userName.username,
        })
      } else {
        await db_nicknameControl.set(myNameStoreKey, {
          username: _this.state.username,
        })
      }
    } catch (e) {
      console.error(e)
    }
  }
}

export default chatapp
