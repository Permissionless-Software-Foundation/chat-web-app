# Web Chat Workflow
This directory attempts to capture the high-level working of this web-based chat application.
This application uses different facets of IPFS. It uses OrbitDB to create peer-to-peer databases for storing group chat messages. It also uses IPFS pubsub directly, to establish direct peer-to-peer chats.

![Chat Workflow](./chat-workflow.jpg)

**Client node:**

- Stablish a connection with the bootstrap server and replicate the main database
- Subscribes to main Pubsub channel
- Can make peer to peer connections
- Instances a key-value database to register an username

**Bootstrap Server:**

- Receive connections from other nodes via IPFS connection swarm
- Receive querys from other nodes to create private chat channels
- Instance the database for public messages and the control database for private chats

**Main OrbitDB:**

Event log database used to store public chats, this database will be replicated by all nodes that stablish a connection and will receive all the public messages that have been stored

*Entry example:*

`entry = {`
`nickname: nickname/username that emits the message`
 `message: text message 
}`

**Control OrbitDB:**

Event log database used to store the encrypted information about all the different private chat channels

*Entry example:*

`entry = {`

`peer1: Node that emits the petition` 
`peer2: Node that receives the petition` 
`channelName: name for the pubsub channel between peer1 and peer2`
 `dbName: name for the private OrbitDB between 
 peer1 and peer2`
 `dbID: ID for replicate private OrbitDB between 
 peer1 and peer2`
 `exist: true`
 `pass: password to encrypt / decrypt this room 
 database 
}`

*This entry is encrypted before being stored in the database*

**Username OrbitDB:**

Stores a username for each client node

*Entry example:*

`db.set(myNameStoreKey, {username: username } )`

**Main Pubsub channel:**

Main channel for communication between the bootstrap server and the different client nodes. In this channel will be possible to have different functions controlled by states:

| **STATE**   |**FUNCTION**|
|-------------|------------|
|"online"     |     1      |
|"message"    |     2      |
|"requestChat"|     3      |

*1 = state emitted automatically by a client node each second to verify its connection to the chat. Used to create a list of online nodes*

*2 = state that indicates that the information sended will be a message*

*3 = requestChat" state that indicates that a client node made a petition for a private chat with other client node*

**Database for private chat:**

For each private chat a new event log database is used to store encrypted messages exclusively for two nodes

*Entry example:*

`entry = {`
             `nickname: nickname / username that emits the message`
             `message: text message 
}`

*This entry is encrypted before being stored in the database*

## Connecting to IPFS
The first thing the page does when it loads is to create an instance of IPFS and [OrbitDB](https://github.com/orbitdb). This instance of IPFS reaches out to the PSF bootstrap node using encrypted websockets, and also tries to establish redundent connections to other publically available secure websocket servers hosted by IPFS.

There are multiple databases created to manage the chat. The first database created is the `DB_NAME_CONTROL_USERNAMES` database to store and manage user names. Each user in the chat represents an IPFS node. These nodes are randomly assigned a name. But if that node has specified a user name to use, it will be detected and displayed. This database is used to store the connection between computer-generated IPFS node ids and the user name that users have assigned to themself.

After the user name database has been handled, the app creates a local instance of the group-chat database. This is a local copy of the database hosted by the PSF bootstrap node. Once that DB has been replicated, previous chat messages will appear in the app. This is a database that is globally writable, allowing any node to write to it, and thus share messages in the group chat.

A `PUBSUB_CHANNEL` or 'master channel' is created for sharing group chats.
`What's the difference between the pubsub master channel and the main OrbitDB?`

## Group Chat
The bootstrap server instances a main event log database to store the messages. Each client node that stablish a connection via IPFS will replicate this database.

All the nodes will be automatically subscribed to the main pubsub channel, which will be the communication medium to send the messages, once a client emits a message, it will be added to the database and will be replicated in the whole network.

## Person-to-person Chat

- 1- The node 1 emits a petition to create a private chat with node 2. This petition is made using the main pubsub channel

- 2 - The bootstrap server verifies in the OrbitDB control database if these pair of nodes already have a private chat or create one otherwise. The information to connect a private chat will be encrypted and stored in the database. 

- 3,4 - The bootstrap server sends the information to all the corresponding nodes, so this nodes can connect to the private chat

- 5,6 - The node 1 and node 2 receive the information from the bootstrap server, in this information is the pubsub channel name for the private chat, database name corresponding to this chat, and the encription key

*Note: each client node at the beginning will automatically create an unique and own pubsub channel exclusively to receive the information of the private chats, this pubsub channel is conformed by each node ID*


## Encryption

- **Flow and functioning:**

The bootstrap node will require in console an encryption password. This password will be used exclusively to encrypt / decrypt the information in each private chat, this information is located in the OrbitDB control database 

Each private chat has its own database and its own pubsub channel that will manage enceypted data. To encrypt / decrypt this messages a password will be needed, this password is randomly generated by the bootstrap server 

Each client node at the beginning will subscribe to its own pubsub channel. The bootstrap server will send the encription key and the rest of the information of its private chats using this channel. The purpose of this is that each client node will be the only one subscribed to its own channel and be the only one able to listen the information of its own  private chats

Each unique pubsub channel that possess each client node is composed by the node ID, this tells the bootstrap server to where has to send the encription key

- **Attack vectors:**

There are two ways to get the encription keys of each private chat

1. Getting it from the OrbitDB control database, which will be encrypted with a password that it is introduced by console when starting the bootstrap server

2. By subscribing to the unique channel of one of the nodes of a private chat. Given that each node has its own unique pubsub channel conformed by the node ID, knowing the ID of one of the nodes I can subscribe to its channel, and wait that this node makes a petition for a private chat. The bootstrap server by sending the information and the encription key to this channel could be sending this information to others.

*A possible solution will be to verify how many people are subscribed to the unique pubsub channel before sending that information, and if there is more than one node subscribed to that channel don't send the information and the encription key, and alert of a possible threat*
