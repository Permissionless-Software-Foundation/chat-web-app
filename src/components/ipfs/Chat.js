import React from 'react';
import PropTypes from 'prop-types'
import { Buffer } from 'ipfs'
const { encrypt } = require('../encryption')

let _this

export class Chat extends React.Component {


  constructor(props) {
    super(props);
    _this = this
    this.state = {
      ipfs: this.props.ipfs,
      orbitdb: this.props.orbitdb,
      ipfsId: null,
      _message: {
        nickname: "",
        message: "",
        status: "message"
      },
      chatWith: 'All',
      dbIsReady: false,
      passEncryption: ''

    };


  }

  render() {
    return (
      <div className="chat-container">
        {_this.state.dbIsReady ?
          <h4 className="chat-name">Chat With : <b>{_this.state.chatWith}</b></h4> :
          <h4 className="chat-name"> <b>Loading Chat..</b></h4>}

        <textarea id="chatArea"
          name="chatArea"
          rows="10"
          cols="50"
          readOnly
          value={_this.props.output}>
        </textarea>
        <br></br>
        <br></br>
        <div className="container-send">
          <input
            className="input-nickname"
            disabled={!_this.state.dbIsReady}
            type="text" id="nickname"
            name="nickname"
            placeholder="nickname">
          </input>
          <input
            className="input-message"
            disabled={!_this.state.dbIsReady}
            id="msg"
            name="msg"
            type="text"
            placeholder="type message"
            onKeyPress={(ev) => {
              if (ev.key === 'Enter') {
                _this.handleUpdateMsg()
                ev.preventDefault();
              }
            }}></input>
          <button
            className="btn-send"
            disabled={!_this.state.dbIsReady}
            onClick={this.handleUpdateMsg}>Send.</button>
        </div>
      </div>
    );
  }



  handleUpdateMsg(event) {

    const msgValue = document.getElementById("msg").value
    const nicknameValue = document.getElementById("nickname").value
    _this.setState(prevState => ({
      ...prevState,
      message: {
        nickname: nicknameValue,
        msg: msgValue,
        channel: _this.props.channelSend
      }
    }))
    _this.sendMessg(nicknameValue, msgValue, _this.props.channelSend, false);
    document.getElementById("msg").value = ""
    _this.props.changeUserName(true, nicknameValue)
  }
  async sendMessg(nickname, message, channel, useLocalChannel) {
    if (!_this.state.ipfs) return;
    let ch = channel
    if (useLocalChannel) ch = _this.props.channelSend
    let userName = nickname
    // eslint-disable-next-line
    const id = _this.state.ipfsId
    let msgText = {
      username: userName,
      message: message,
      status: "message"
    }
    let entry = { nickname: nickname, message: message }
    // Only encrypt private  chat
    if (_this.props.channelSend !== _this.props.PUBSUB_CHANNEL) {
      msgText = await encrypt(JSON.stringify(msgText), _this.state.passEncryption)
      entry = await encrypt(JSON.stringify(entry), _this.state.passEncryption)
    }

    const msgEncoded = Buffer.from(JSON.stringify(msgText))
    _this.state.ipfs.pubsub.publish(ch, msgEncoded)
    _this.props.AddMessage(entry);
  }
  componentDidMount() {
    const usernameElement = document.getElementById("nickname")
    usernameElement.value = this.props.username
  }
  componentDidUpdate(prevProps) {
    // update props  change in component update

    if (this.props !== prevProps) {
      this.setState({
        ipfs: this.props.ipfs,
        orbitdb: this.props.orbitdb,
        ipfsId: this.props.ipfsId,
        _message: {
          nickname: this.props.username,
          message: "",
          status: "message"
        },
        chatWith: this.props.chatWith,
        passEncryption: this.props.passEncryption
      })
      if (this.props.username !== prevProps.username) {
        const usernameElement = document.getElementById("nickname")
        usernameElement.value = this.props.username
      }
      if (this.props.dbIsReady !== prevProps.dbIsReady) {
        this.setState({
          dbIsReady: this.props.dbIsReady
        })
      }
    }
  }
}

Chat.propTypes = {
  ipfs: PropTypes.object,
  orbitdb: PropTypes.object,
  ipfsId: PropTypes.string,
  output: PropTypes.string,
  channelSend: PropTypes.string,
  PUBSUB_CHANNEL: PropTypes.string,
  AddMessage: PropTypes.func,
  changeUserName: PropTypes.func,
  username: PropTypes.string,
  chatWith: PropTypes.string,
  dbIsReady: PropTypes.bool,
  passEncryption: PropTypes.string

}
export default Chat;