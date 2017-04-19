
const WebSocket = require('ws');
const Unirest = require('unirest');

const WebsocketBuilder = (hostNameUrl) => {
  const getAuthToken = (accountUsername, accountPassword) => {
    const userNamePasswordForAuth = `${accountUsername}:${accountPassword}`;
    const userNamePasswordBase64 = new Buffer(userNamePasswordForAuth).toString('base64');

    const uri = `${hostNameUrl}/auth_token`;
    console.log(uri);
    return new Promise((resolve, reject) => {
      Unirest.get(uri)
      .headers({'Authorization': `Basic ${userNamePasswordBase64}`})
      .end((response) => {
        if (response.code == 200) {
          console.log(`TOKEN: ${response.body.token}`);
          resolve(response.body.token);
        } else {
          console.error(uri + " Bad response code: " + response.code);
          reject();
        }
      });
    });
  };

  const listenToAccount = (accountName, token) => {
    const wsHostNameUrl = hostNameUrl.replace('http', 'ws');
    const wsUri = `${wsHostNameUrl}/websocket?token=${token}`;
    const wsAccount = new WebSocket(wsUri);
    const configId = Math.random();
    wsAccount.on('open', () => {
      wsAccount.send(
        JSON.stringify({
          "jsonrpc": "2.0",
          "id": configId, //random id?
          "method": "subscribe_account",
          "params": {
            "eventType": "*",
            "accounts": [`${hostNameUrl}/accounts/${accountName}`]
          }
        })
      );
    });

    return new Promise((resolve, reject) => {
      wsAccount.on('message', (data, flags) => {
        const matchedConfigId = JSON.parse(data).id == configId;
        if (matchedConfigId)
          resolve(wsAccount);
      });
    });
  };

  return {
    listen: (name, password) =>
      getAuthToken(name, password)
        .then(token => listenToAccount(name, token))
  };
}

module.exports = WebsocketBuilder;
