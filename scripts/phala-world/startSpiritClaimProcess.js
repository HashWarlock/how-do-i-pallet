require('dotenv').config();
require("@polkadot/api-augment");
const BN = require('bn.js');
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api')

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
async function addSpiritMetadata(khalaApi, overlord, metadata) {
    let nonceOverlord = await getNonce(khalaApi, overlord.address);
    return new Promise(async (resolve) => {
        console.log(`Adding Spirit metadata: ${metadata}...`);
        const unsub = await khalaApi.tx.pwNftSale.setSpiritsMetadata(metadata).signAndSend(overlord, {nonce: nonceOverlord++}, (result) => {
            if (result.status.isInBlock) {
                console.log(`Transaction included at blockHash ${result.status.asInBlock}`);
            } else if (result.status.isFinalized) {
                console.log(`Transaction finalized at blockHash ${result.status.asFinalized}`);
                unsub();
                resolve();
            }
        });
        console.log(`Adding Spirit metadata...DONE`);

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

// Start claiming spirits
async function usersClaimSpirits(khalaApi, root, recipients) {
    console.log(`Starting Spirit Claims...`);
    let nonceRoot = await getNonce(khalaApi, root.address);
    for (const recipient of recipients) {
        const index = recipients.indexOf(recipient);
        console.log(`[${index}]: Claiming Spirit for ${recipient.address}`);
        await khalaApi.tx.balances.transfer(recipient.address, token(11)).signAndSend(root, {nonce: nonceRoot++});
        await waitTxAccepted(khalaApi, root.address, nonceRoot - 1);
        await waitExtrinsicFinished(khalaApi, khalaApi.tx.pwNftSale.claimSpirit(), recipient);
        console.log(`[${index}]: Spirit Claims...DONE`);
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
    const userAccounts = [alice, bob, charlie, david, eve, ferdie];

    // Add Metadata for Spirit NFTs
    await addSpiritMetadata(api, overlord, "ar://Q6N5cKjuLzihuiyVlpU-ANUM5ffKLwYYACKFN4mbNuw");
    // Start Spirit Claims
    await setStatusType(api, overlord, 'ClaimSpirits', true);
    // Claim Spirits
    await usersClaimSpirits(api, overlord, userAccounts);
}

main().catch(console.error).finally(() => process.exit());