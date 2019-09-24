# Web Chat Workflow
This directory attempts to capture the high-level working of this web-based chat application.
This application uses different facets of IPFS. It uses OrbitDB to create peer-to-peer databases for storing group chat messages. It also uses IPFS pubsub directly, to establish direct peer-to-peer chats.

![./chat-workflow.jpg]('Chat Workflow')

## Connecting to IPFS
The first thing the page does when it loads is to create an instance of IPFS and [OrbitDB](https://github.com/orbitdb). This instance of IPFS reaches out to the PSF bootstrap node using encrypted websockets, and also tries to establish redundent connections to other publically available secure websocket servers hosted by IPFS.

There are multiple databases created to manage the chat. The first database created is the `DB_NAME_CONTROL_USERNAMES` database to store and manage user names. Each user in the chat represents an IPFS node. These nodes are randomly assigned a name. But if that node has specified a user name to use, it will be detected and displayed. This database is used to store the connection between computer-generated IPFS node ids and the user name that users have assigned to themself.

After the user name database has been handled, the app creates a local instance of the group-chat database. This is a local copy of the database hosted by the PSF bootstrap node. Once that DB has been replicated, previous chat messages will appear in the app. This is a database that is globally writable, allowing any node to write to it, and thus share messages in the group chat.

A `PUBSUB_CHANNEL` or 'master channel' is created for sharing group chats.
`What's the difference between the pubsub master channel and the main OrbitDB?`

## Encryption
*Describe how the encryption works. In particular focus on how the passwords get passed from one node to the next. Discuss potential attack vectors in detail.*
