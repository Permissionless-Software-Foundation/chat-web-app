/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types'

let _this
export class Users extends React.Component {


    constructor(props) {
        super(props);
        _this = this
        this.state = {
            ipfs: this.props.ipfs,
            orbitdb: this.props.orbitdb,
            ipfsId: null,
            dbId: null,
            onlineNodes: [],
            PUBSUB_CHANNEL: '',
            channel: '',
            chatWith: 'All',
        };


    }

    render() {
        return (
            <div className="user-container">
                <h4 className="onlines-data">Onlines Nodes :  <b>{_this.state.onlineNodes ? _this.state.onlineNodes.length : '0'}</b></h4>
                <h4 className="onlines-name" key="keyMaster" id={_this.props.PUBSUB_CHANNEL} onClick={() => this.subscribeToOtherChannel(_this.props.PUBSUB_CHANNEL)} ><b>ALL</b></h4>
                {_this.state.onlineNodes && _this.state.onlineNodes.map((val, i) => <h4 className="onlines-name" key={val.username + i} id={val.keiId} onClick={() => this.subscribeToOtherChannel(val)} >{val.username ? val.username : val} </h4>)}
            </div>
        );
    }


    async subscribeToOtherChannel(value) {

        _this.props.changeCss(true);

        let channelName;

        let chatName = ''

        if (value === _this.props.PUBSUB_CHANNEL) {
            // Go to  group chat
            if (_this.state.chatWith === 'All') return
            chatName = 'All'
            channelName = await _this.props.requestPersonChat(value, true)

        } else if (_this.state.ipfsId != value.keyId) {
            // Go to private chat
            if (_this.state.chatWith === value.username) return
            chatName = value.username

            channelName = await _this.props.requestPersonChat(value)
        }


        _this.setState(prevState => ({
            chatWith: chatName,
            channel: channelName
        }))
        _this.props.updateChatName(chatName, channelName)


    }
    componentDidMount() {

    }
    componentDidUpdate(prevProps) {
        // update props  change in component update

        if (this.props !== prevProps) {
            this.setState({
                ipfs: this.props.ipfs,
                orbitdb: this.props.orbitdb,
                onlineNodes: this.props.onlineNodes,
                ipfsId: this.props.ipfsId,
                onlineNodes: this.props.onlineNodes
            })




        }
    }


}

Users.propTypes = {
    ipfs: PropTypes.object,
    orbitdb: PropTypes.object,
    onlineNodes: PropTypes.array,
    PUBSUB_CHANNEL: PropTypes.string,
    ipfsId: PropTypes.string,
    requestPersonChat: PropTypes.func,
    updateChatName: PropTypes.func,
    changeCss: PropTypes.func

}
export default Users;
