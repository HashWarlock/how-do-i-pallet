require('dotenv').config();
const BN = require('bn.js');
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

const alicePrivkey = process.env.ROOT_PRIVKEY;
const bobPrivkey = process.env.USER_PRIVKEY;
const overlordPrivkey = process.env.OVERLORD_PRIVKEY;
const ferdiePrivkey = process.env.FERDIE_PRIVKEY;
const charliePrivkey = process.env.CHARLIE_PRIVKEY;
const davidPrivkey = process.env.DAVID_PRIVKEY;
const evePrivkey = process.env.EVE_PRIVKEY;
const endpoint = process.env.ENDPOINT;

const bnUnit = new BN(1e12);
function token(n) {
    return new BN(n).mul(bnUnit);
}

async function checkUntil(async_fn, timeout) {
    const t0 = new Date().getTime();
    while (true) {
        if (await async_fn()) {
            return true;
        }
        const t = new Date().getTime();
        if (t - t0 >= timeout) {
            return false;
        }
        await sleep(100);
    }
}

async function getNonce(khalaApi, address) {
    const info = await khalaApi.query.system.account(address);
    return info.nonce.toNumber();
}

async function waitTxAccepted(khalaApi, account, nonce) {
    await checkUntil(async () => {
        return await getNonce(khalaApi, account) === nonce + 1;
    });
}

// Create Whitelist for account and sign with Overlord
async function createWhitelistMessage(khalaApi, type, overlord, account) {
    const whitelistMessage = khalaApi.createType(type, {'account': account.address, 'purpose': 'BuyPrimeOriginOfShells'});
    console.log(`${whitelistMessage}`);
    return overlord.sign(whitelistMessage.toU8a());
}

// Set StatusType
async function setStatusType(khalaApi, overlord, statusType, status) {
    let nonceOverlord = await getNonce(khalaApi, overlord.address);
    return new Promise(async (resolve) => {
        console.log(`Setting ${statusType} to ${status}...`);
        const unsub = await khalaApi.tx.pwNftSale.setStatusType(status, statusType
        ).signAndSend(overlord, {nonce: nonceOverlord++}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
                resolve();
            }
        });
        await waitTxAccepted(khalaApi, overlord.address, nonceOverlord - 1);
    });
}

// Start rare origin of shells purchases
async function usersPurchaseWhitelistOriginOfShells(khalaApi, recipientsInfo) {
    return new Promise(async (resolve) => {
        console.log(`Starting Whitelist Origin of Shells purchases...`);
        for (const recipient of recipientsInfo) {
            const index = recipientsInfo.indexOf(recipient);
            const account = recipient.account;
            const whitelistMessage = recipient.whitelistMessage;
            const race = recipient.race;
            const career = recipient.career;
            console.log(`[${index}]: Purchasing Prime Origin of Shell for owner: ${account.address}, whitelistMessage: ${whitelistMessage}, race: ${race}, career: ${career}`);
            const unsub = await khalaApi.tx.pwNftSale.buyPrimeOriginOfShell(whitelistMessage, race, career).signAndSend(account, (result) => {
                if (result.status.isInBlock) {
                    console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
                } else if (result.status.isFinalized) {
                    console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                    unsub();
                    resolve();
                }
            });
            console.log(`[${index}]: Rare Origin of Shells purchases...DONE`);
        }
    });
}

async function main() {
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({
        provider: wsProvider,
        types: {
            Purpose: {
                _enum: [
                    'RedeemSpirit',
                    'BuyPrimeOriginOfShells',
                ],
            },
            OverlordMessage: {
                account: 'AccountId',
                purpose: 'Purpose',
            }
        }
    });

    const keyring = new Keyring({type: 'sr25519'});

    const alice = keyring.addFromUri(alicePrivkey);
    const bob = keyring.addFromUri(bobPrivkey);
    const ferdie = keyring.addFromUri(ferdiePrivkey);
    const overlord = keyring.addFromUri(overlordPrivkey);
    const charlie = keyring.addFromUri(charliePrivkey);
    const david = keyring.addFromUri(davidPrivkey);
    const eve = keyring.addFromUri(evePrivkey);

    // Get Whitelist Message signed by Overlord for Alice, Ferdie & Eve
    const aliceWlMessage = await createWhitelistMessage(api, 'OverlordMessage', overlord, alice);
    const ferdieWlMessage = await createWhitelistMessage(api, 'OverlordMessage', overlord, ferdie);
    const eveWlMessage = await createWhitelistMessage(api, 'OverlordMessage', overlord, eve);
    const userAccountsWhitelistOriginOfShellInfo = [
        {'account': alice, 'whitelistMessage': aliceWlMessage, 'race': 'AISpectre', 'career': 'HardwareDruid'},
        {'account': ferdie, 'whitelistMessage': ferdieWlMessage, 'race': 'Cyborg', 'career': 'Web3Monk'},
        {'account': eve, 'whitelistMessage': eveWlMessage, 'race': 'XGene', 'career': 'RoboWarrior'}
    ];
    // Enable Whitelist purchases
    await setStatusType(api, overlord, 'PurchasePrimeOriginOfShells', true);
    // Purchase Prime Origin of Shell
    await usersPurchaseWhitelistOriginOfShells(api, userAccountsWhitelistOriginOfShellInfo);
}

main().catch(console.error).finally(() => process.exit());