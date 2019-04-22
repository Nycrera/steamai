/* jshint node: true */
/* jshint esversion: 6 */

var Steam = require('steam');
var SteamTotp = require('steam-totp');
var fs = require('fs');

const dialogflow = require('dialogflow');
const uuid = require('uuid');
const CONFIG = readConfig('config.json');

var steamClient = new Steam.SteamClient();
var steamUser = new Steam.SteamUser(steamClient);
var steamFriends = new Steam.SteamFriends(steamClient);
steamClient.connect();

steamClient.on('connected', function () {
    loginToSteam();
});

steamClient.on('error', () => {
    console.log("Error emitted. Server disconnects ? But piii...");
    //loginToSteam();
});

steamClient.on('logOnResponse', function (logonResp) {
    if (logonResp.eresult === Steam.EResult.OK) {
        console.log('Logged in!');
        steamFriends.setPersonaState(Steam.EPersonaState.Online);
        steamFriends.on('friendMsg', (id, msg, type) => {
            if (!msg) return;
            console.log('Got a Message:' + msg + ' | from ' + id);

            // A unique identifier for the given session
            const sessionId = uuid.v4();

            // Create a new session
            const sessionClient = new dialogflow.SessionsClient();
            const sessionPath = sessionClient.sessionPath(CONFIG.dialogFlow_projectId, sessionId);
            // The text query request.
            const request = {
                session: sessionPath,
                queryInput: {
                    text: {
                        // The query to send to the dialogflow agent
                        text: msg,
                        // The language used by the client (en-US)
                        languageCode: 'en-US',
                    },
                },
            };
            sessionClient.detectIntent(request).then((responses) => {
                const result = responses[0].queryResult;
                steamFriends.sendMessage(id, result.fulfillmentText);
            });
        });
    } else {
        console.log("Eresult: " + logonResp.eresult);
    }
});

function loginToSteam() {
    if(CONFIG.totp)
    SteamTotp.getTimeOffset(function (error, offset, latentcy) {
        var totp = SteamTotp.generateAuthCode(CONFIG.privateKey, offset);
        steamUser.logOn({
            account_name: CONFIG.accountName,
            password: CONFIG.password,
            two_factor_code: totp
        });
    });
    else steamUser.logOn({
        account_name: CONFIG.accountName,
        password: CONFIG.password,
    });
}

function readConfig(filename){
    return JSON.parse(fs.readFileSync(filename));
}