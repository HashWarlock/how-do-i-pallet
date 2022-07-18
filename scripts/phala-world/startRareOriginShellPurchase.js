require('dotenv').config();
const BN = require('bn.js');
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

const alicePrivkey = process.env.ROOT_PRIVKEY;
const bobPrivkey = process.env.USER_PRIVKEY;
const overlordPrivkey = process.env.OVERLOAD_PRIVKEY;
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
async function usersPurchaseRareOriginOfShells(khalaApi, recipientsInfo) {
    return new Promise(async (resolve) => {
        console.log(`Starting Rare Origin of Shells purchases...`);
        for (const recipient of recipientsInfo) {
            const index = recipientsInfo.indexOf(recipient);
            const account = recipient.account;
            const rarity = recipient.rarity;
            const race = recipient.race;
            const career = recipient.career;
            console.log(`[${index}]: Purchasing Rare Origin of Shell for owner: ${account.address}, rarity: ${rarity}, race: ${race}, career: ${career}`);
            const unsub = await khalaApi.tx.pwNftSale.buyRareOriginOfShell(rarity, race, career).signAndSend(account, (result) => {
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
    });

    const keyring = new Keyring({type: 'sr25519'});

    const alice = keyring.addFromUri('//Alice');
    const bob = keyring.addFromUri('//Bob');
    const ferdie = keyring.addFromUri('//Ferdie');
    const overlord = keyring.addFromUri('merge almost index garbage agent bracket layer skirt boss fly credit deal');
    const charlie = keyring.addFromUri('//Charlie');
    const david = keyring.addFromUri('//Dave');
    const eve = keyring.addFromUri('//Eve');
    const userAccountsRareOriginOfShellInfo = [
        {'account': bob, 'rarity': 'Legendary', 'race': 'Cyborg', 'career': 'HackerWizard'},
        {'account': charlie, 'rarity': 'Magic', 'race': 'Pandroid', 'career': 'RoboWarrior'},
        {'account': david, 'rarity': 'Magic', 'race': 'XGene', 'career': 'TradeNegotiator'}
    ];

    // Add Metadata for Origin of Shell Races
    const originOfShellsMetadataArr = [['Cyborg', 'ar://BS-NUyJWDKJ-CwTYLWZz6TpG0CbWVKUAXvdPQu-KimI'], ['AISpectre', 'ar://KR3ZIIcc_Q6_47sibLOJ5YoFwJZqT6C7aJkkUYbUWbU'], ['Pandroid', 'ar://BS-NUyJWDKJ-CwTYLWZz6TpG0CbWVKUAXvdPQu-KimI'], ['XGene', 'ar://IzOXT_pER7487_RBpzGNOKNBGnDouN1mOcPXojE_Das']];
    await addOriginOfShellsMetadata(api, overlord, originOfShellsMetadataArr);
    // Start Spirit Claims
    await setStatusType(api, overlord, 'PurchaseRareOriginOfShells', true);
    // Claim Spirits
    await usersPurchaseRareOriginOfShells(api, userAccountsRareOriginOfShellInfo);
}

main().catch(console.error).finally(() => process.exit());