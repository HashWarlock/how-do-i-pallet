require('dotenv').config();
require("@polkadot/api-augment");
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

function waitExtrinsicFinished(khalaApi, extrinsic, account) {
    return new Promise(async (resolve, reject) => {
        const unsub = await extrinsic.signAndSend(account, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
            }

            if (result.status.isInBlock || result.status.isFinalized) {
                const failures = result.events.filter(({event}) => {
                    return khalaApi.events.system?.ExtrinsicFailed?.is(event)
                })
                const errors = failures.map(
                    ({
                    event: {
                        data: [error],
                    },
                    }) => {
                        if (error?.isModule?.valueOf()) {
                            // https://polkadot.js.org/docs/api/cookbook/tx#how-do-i-get-the-decoded-enum-for-an-extrinsicfailed-event
                            const decoded = khalaApi.registry.findMetaError(error.asModule)
                            const {docs, method, section} = decoded
                            return new Error(`Extrinsic Failed: ${section}.${method}: ${docs.join(' ')}`)
                        } else {
                            return new Error(error?.toString() ?? String.toString.call(error))
                        }
                    }
                )
                if (errors.length > 0) {
                    reject(errors[0])
                } else {
                    resolve()
                }
                unsub();
            }
        });
    })
}

// Add Spirit Metadata
async function addOriginOfShellsMetadata(khalaApi, overlord, originOfShellsMetadataArr) {
    let nonceOverlord = await getNonce(khalaApi, overlord.address);
    return new Promise(async (resolve) => {
        console.log(`Adding Origin of Shells metadata: ${originOfShellsMetadataArr}...`);
        const unsub = await khalaApi.tx.pwNftSale.setOriginOfShellsMetadata(originOfShellsMetadataArr).signAndSend(overlord, {nonce: nonceOverlord++}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
                resolve();
            }
        });
        console.log(`Adding Origin of Shells metadata...DONE`);

        await waitTxAccepted(khalaApi, overlord.address, nonceOverlord - 1);
    });
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
async function usersPurchaseRareOriginOfShells(khalaApi, root, recipientsInfo) {
    let nonceRoot = await getNonce(khalaApi, root.address);
    console.log(`Starting Rare Origin of Shells purchases...`);
    for (const recipient of recipientsInfo) {
        const index = recipientsInfo.indexOf(recipient);
        const account = recipient.account;
        const rarity = recipient.rarity;
        const race = recipient.race;
        const career = recipient.career;
        const amount = recipient.amount;
        console.log(`[${index}]: Purchasing Rare Origin of Shell for owner: ${account.address}, rarity: ${rarity}, race: ${race}, career: ${career}, amount: ${amount}`);
        await khalaApi.tx.balances.transfer(account.address, token(amount)).signAndSend(root, {nonce: nonceRoot++});
        await waitTxAccepted(khalaApi, root.address, nonceRoot - 1);
        await waitExtrinsicFinished(khalaApi, khalaApi.tx.pwNftSale.buyRareOriginOfShell(rarity, race, career), account);
        console.log(`[${index}]: Rare Origin of Shells purchases...DONE`);
    }
}

async function main() {
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({
        provider: wsProvider,
    });

    const keyring = new Keyring({type: 'sr25519'});

    const alice = keyring.addFromUri(alicePrivkey);
    const bob = keyring.addFromUri(bobPrivkey);
    const ferdie = keyring.addFromUri(ferdiePrivkey);
    const overlord = keyring.addFromUri(overlordPrivkey);
    const charlie = keyring.addFromUri(charliePrivkey);
    const david = keyring.addFromUri(davidPrivkey);
    const eve = keyring.addFromUri(evePrivkey);
    const userAccountsRareOriginOfShellInfo = [
        {'account': bob, 'rarity': 'Legendary', 'race': 'Cyborg', 'career': 'HackerWizard', 'amount': 15_001},
        {'account': charlie, 'rarity': 'Magic', 'race': 'Pandroid', 'career': 'RoboWarrior', 'amount': 10_001},
        {'account': david, 'rarity': 'Magic', 'race': 'XGene', 'career': 'TradeNegotiator', 'amount': 10_001}
    ];

    // Add Metadata for Origin of Shell Races
    const originOfShellsMetadataArr = [['Cyborg', 'ar://BS-NUyJWDKJ-CwTYLWZz6TpG0CbWVKUAXvdPQu-KimI'], ['AISpectre', 'ar://KR3ZIIcc_Q6_47sibLOJ5YoFwJZqT6C7aJkkUYbUWbU'], ['Pandroid', 'ar://BS-NUyJWDKJ-CwTYLWZz6TpG0CbWVKUAXvdPQu-KimI'], ['XGene', 'ar://IzOXT_pER7487_RBpzGNOKNBGnDouN1mOcPXojE_Das']];
    await addOriginOfShellsMetadata(api, overlord, originOfShellsMetadataArr);
    // Start Rare Origin of Shell purchases
    await setStatusType(api, overlord, 'PurchaseRareOriginOfShells', true);
    // Purchase Rare Origin of Shell
    await usersPurchaseRareOriginOfShells(api, overlord, userAccountsRareOriginOfShellInfo);
}

main().catch(console.error).finally(() => process.exit());