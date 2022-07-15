require('dotenv').config();
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { stringToU8a, u8aToHex } = require('@polkadot/util');

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
        return await getNonce(khalaApi, account) == nonce + 1;
    });
}

// Transfer balance to an account
async function transferPha(khalaApi, sender, senderNonce, recipients, amount) {
    return new Promise(async (resolve) => {
        console.log(`Starting transfers...`);
        for (const recipient of recipients) {
            const index = recipients.indexOf(recipient);
            console.log(`[${index}]: Transferring... ${amount.toString()} PHA from ${sender.address} to ${recipient.address}`);
            await khalaApi.tx.balances.transfer(recipient, amount).signAndSend(sender, senderNonce++)
            console.log(`[${index}]: Transferring...DONE`);
        }
        await waitTxAccepted(khalaApi, sender.address, senderNonce - 1);
    });
}

// Set Overlord Account with Sudo account
async function setOverlordAccount(khalaApi, sender, senderNonce, newOverlord) {
    return new Promise(async (resolve) => {
        console.log("Setting new overlord...");
        await khalaApi.tx.sudo.sudo(
            khalaApi.tx.pwNftSale.setOverlord(newOverlord.address)
        ).signAndSend(sender, {nonce: senderNonce++});
        await waitTxAccepted(khalaApi, sender.address, senderNonce - 1);
    });
}

// Initialize Phala World Clock, create Spirits, Origin Shell & Shell Collections & set NFT inventory with Overlord account
async function initPhalaWorld(khalaApi, overlord, nonceOverlord) {
    return new Promise(async (resolve) => {
        console.log("Initialize Phala World Clock...");
        await khalaApi.tx.pwNftSale.initializeWorldClock()
            .signAndSend(overlord, {nonce: nonceOverlord++});
        await waitTxAccepted(khalaApi, overlord.address, nonceOverlord - 1);
        console.log("Initialize Phala World Clock...Done");
        console.log("Create Spirits, Origin of Shells & Shells Collections...");
        // mint spirits NFTs with overlord
        // collection 0: spirits
        await khalaApi.tx.pwNftSale.pwCreateCollection(
            'Phala World Spirits Collection',
            null,
            'PWSPRT'
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // set the spirits collection id
        await khalaApi.tx.pwNftSale.setSpiritCollectionId(
            0
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // collection 1: origin of shells
        await khalaApi.tx.pwNftSale.pwCreateCollection(
            'Phala World Origin of Shells Collection',
            null,
            'PWOAS'
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // set the origin of shell collection id
        await khalaApi.tx.pwNftSale.setOriginOfShellCollectionId(
            1
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // collection 2: shells
        await khalaApi.tx.pwNftSale.pwCreateCollection(
            'Phala World Shells Collection',
            null,
            'PWSHL'
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // set the origin of shell collection id
        await khalaApi.tx.pwIncubation.setShellCollectionId(
            2
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        console.log("Create Spirits and Origin of Shell Collections...Done");
        console.log("Initialize Origin of Shell NFT sale inventory...");
        // set the initial inventory numbers that will be used until the preorder phase
        await khalaApi.tx.pwNftSale.initRarityTypeCounts()
            .signAndSend(overlord, {nonce: nonceOverlord++});
        await waitTxAccepted(khalaApi, overlord.address, nonceOverlord - 1);
        console.log("Initialize Origin of Shell NFT sale inventory...Done");
    });
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
    let nonceAlice = await getNonce(alice.address);
    let nonceBob = await getNonce(bob.address);
    let nonceCharlie = await getNonce(charlie.address);
    let nonceDavid = await getNonce(david.address);
    let nonceEve = await getNonce(eve.address);
    let nonceFerdie = await getNonce(ferdie.address);
    let nonceOverlord = await getNonce(overlord.address);
    const userAccounts = [overlord, bob, charlie, david, eve, ferdie];

    // Send PHA to Account from Alice
    await transferPha(api, alice, nonceAlice, userAccounts, token(20_000));

    // Set Overlord account
    await setOverlordAccount(api, alice, nonceAlice, overlord);

    // Initialize Phala World
    await initPhalaWorld(api, overlord, nonceOverlord);
}