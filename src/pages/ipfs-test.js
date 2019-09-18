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
    })
  }

  render() {
    return (
      <div>
        <p>This is an IPFS test page. Open your browser console.</p>
      </div>
    )
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
export default chatapp
