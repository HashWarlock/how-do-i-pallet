require('dotenv').config();
require("@polkadot/api-augment");
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { setStatusType, token, waitExtrinsicFinished, waitTxAccepted, getNonce } = require('./pwUtils');

const alicePrivkey = process.env.ROOT_PRIVKEY;
const bobPrivkey = process.env.USER_PRIVKEY;
const overlordPrivkey = process.env.OVERLORD_PRIVKEY;
const ferdiePrivkey = process.env.FERDIE_PRIVKEY;
const charliePrivkey = process.env.CHARLIE_PRIVKEY;
const davidPrivkey = process.env.DAVID_PRIVKEY;
const evePrivkey = process.env.EVE_PRIVKEY;
const endpoint = process.env.ENDPOINT;

// Mint chosen preorders
async function mintOriginOfShellsChosenPreorders(khalaApi, overlord, chosenPreorders) {
    let nonceOverlord = await getNonce(khalaApi, overlord.address);
    console.log(`Starting mint of chosen Preorders Origin of Shells...`);
    await waitExtrinsicFinished(khalaApi.tx.pwNftSale.mintChosenPreorders(chosenPreorders), overlord);
    console.log(`Mint of chosen Preorders Origin of Shells...DONE`);
}

// Refund not chosen preorders
async function refundNotChosenPreorders(khalaApi, overlord, notChosenPreorders) {
    let nonceOverlord = await getNonce(khalaApi, overlord.address);
    console.log(`Starting refund of not chosen Preorders...`);
    await waitExtrinsicFinished(khalaApi.tx.pwNftSale.refundNotChosenPreorders(notChosenPreorders), overlord);
    console.log(`Refund of not chosen Preorders...DONE`);
}

// Preorder on last day of sale
async function userPreorderOriginOfShell(khalaApi, account, race, career) {
    console.log(`Starting Preorder Origin of Shell account: ${account}, race: ${race}, career: ${career}...`);
    await waitExtrinsicFinished(khalaApi, khalaApi.tx.pwNftSale.preorderOriginOfShell(race, career), account);
    console.log(`Preorder Origin of Shell...DONE`);
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

    // Disable the first phase of preorders
    await setStatusType(api, overlord, 'PreorderOriginOfShells', false);

    // NOTE: need the script for randomly selecting chosen preorders to produce an array of u32 Preorder IDs
    // Preorder IDs chosen to mint Origin of Shell
    const chosenPreorders = [0, 1, 2, 3, 4, 5];
    // Preorder IDs not chosen & will be refunded
    const notChosenPreorders = [6, 7, 8, 9, 10];
    // Mint Origin of Shell preorders chosen
    await mintOriginOfShellsChosenPreorders(api, chosenPreorders);
    // Refund Origin of Shell preorders not chosen
    await refundNotChosenPreorders(api, notChosenPreorders);
    // Enable Last Day of Sale
    await setStatusType(api, overlord, 'LastDayOfSale', true);
    // Preorder Prime Origin of Shell now unlimited
    await userPreorderOriginOfShell(api, alice, 'Cyborg', 'HackerWizard');
    // Repeat the first 4 steps for the unlimited preorders on the last day of sale
    // Preorder IDs chosen to mint Origin of Shell
    const lastDayOfSaleChosenPreorders = [0, 1, 2, 3, 4, 5];
    // Preorder IDs not chosen & will be refunded
    const lastDayOfSaleNotChosenPreorders = [6, 7, 8, 9, 10];
    // Mint Origin of Shell preorders chosen
    await mintOriginOfShellsChosenPreorders(api, lastDayOfSaleChosenPreorders);
    // Refund Origin of Shell preorders not chosen
    await refundNotChosenPreorders(api, lastDayOfSaleNotChosenPreorders);
}

main().catch(console.error).finally(() => process.exit());