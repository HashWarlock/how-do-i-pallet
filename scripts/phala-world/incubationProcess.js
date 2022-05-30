require('dotenv').config();
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { stringToU8a, u8aToHex } = require('@polkadot/util');

const rootPrivkey = process.env.ROOT_PRIVKEY;
const userPrivkey = process.env.USER_PRIVKEY;
const overlordPrivkey = process.env.OVERLOAD_PRIVKEY;
const ferdiePrivkey = process.env.FERDIE_PRIVKEY;
const charliePrivkey = process.env.CHARLIE_PRIVKEY;
const davidPrivkey = process.env.DAVID_PRIVKEY;
const evePrivkey = process.env.EVE_PRIVKEY;
const endpoint = process.env.ENDPOINT;

async function main() {
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({
        provider: wsProvider,
        types: {
            RaceType: {
                _enum: ['Cyborg', 'AISpectre', 'XGene', 'Pandroid']
            },
            CareerType: {
                _enum: ['HardwareDruid', 'RoboWarrior', 'TradeNegotiator', 'HackerWizard', 'Web3Monk']
            },
            StatusType: {
                _enum: ['ClaimSpirits', 'PurchaseRareOriginOfShells', 'PurchasePrimeOriginOfShells', 'PreorderOriginOfShells']
            },
            OriginOfShellType: {
                _enum: ['Prime', 'Magic', 'Legendary']
            },
            PreorderInfo: {
                owner: "AccountId",
                race: "RaceType",
                career: "CareerType",
                metadata: "BoundedString",
            },
            NftSaleInfo: {
                race_count: "u32",
                race_for_sale_count: "u32",
                race_giveaway_count: "u32",
                race_reserved_count: "u32",
            },
            Purpose: {
                _enum: ['RedeemSpirit', 'BuyPrimeOriginOfShells']
            },
            OverlordMessage: {
                account: "AccountId",
                purpose: "Purpose",
            },
        }
    });

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

    async function getNonce(address) {
        const info = await api.query.system.account(address);
        return info.nonce.toNumber();
    }
    async function waitTxAccepted(account, nonce) {
        await checkUntil(async () => {
            return await getNonce(account) == nonce + 1;
        });
    }

    const keyring = new Keyring({type: 'sr25519'});

    const alice = keyring.addFromUri(rootPrivkey);
    const bob = keyring.addFromUri(userPrivkey);
    const ferdie = keyring.addFromUri(ferdiePrivkey);
    const overlord = keyring.addFromUri(overlordPrivkey);
    const charlie = keyring.addFromUri(charliePrivkey);
    const david = keyring.addFromUri(davidPrivkey);
    const eve = keyring.addFromUri(evePrivkey);
    let nonceOverlord = await getNonce(overlord.address);

    // Enable Incubation process and start hatching for accounts
    {
        // Use Overlord account to start the incubation phase
        console.log(`Enabling the Incubation Process...`);
        await api.tx.pwIncubation.setCanStartIncubationStatus(true)
            .signAndSend(overlord, { nonce: nonceOverlord++ } );
        console.log(`Enabling the Incubation Process...Done`);
    }

    // Start Incubation for all Origin of Shells
    {
        const addresses = [alice, bob, charlie, david, eve, ferdie];
        for (const accountId of addresses) {
            const originOfShellCollectionId = await api.query.pwNftSale.originOfShellCollectionId();
            let nonceOwner = await getNonce(accountId.address);
            let nfts = [];
            if (originOfShellCollectionId.isSome) {
                const spirit = await api.query.uniques.account.entries(accountId.address, originOfShellCollectionId.unwrap());
                spirit
                    .map(([key, _value]) =>
                        [key.args[0].toString(), key.args[1].toNumber(), key.args[2].toNumber()]
                    ).forEach(([acct, collectionId, nftId]) => {
                    nfts.push(nftId);
                    console.log({
                        acct,
                        collectionId,
                        nftId,
                    })
                })
            } else {
                throw new Error(
                    'Origin of Shell Collection ID not configured'
                )
            }
            for (const nft of nfts) {
                console.log(`${accountId.address} starting incubation for NFT ID: ${nft}...`);
                await api.tx.pwIncubation.startIncubation(1, nft).signAndSend(accountId, { nonce: nonceOwner++});
                console.log(`${accountId.address} starting incubation for NFT ID: ${nft}...Done`);
            }
            await waitTxAccepted(accountId.address, nonceOwner - 1);
        }
    }

    let nonceAlice = await getNonce(alice.address);
    let nonceBob = await getNonce(bob.address);
    let nonceCharlie = await getNonce(charlie.address);
    let nonceDavid = await getNonce(david.address);
    let nonceEve = await getNonce(eve.address);
    let nonceFerdie = await getNonce(ferdie.address);

    // Send to food between accounts
    {
        console.log(`Sending food among accounts...`);
        await api.tx.pwIncubation.feedOriginOfShell(1, 0).signAndSend(alice, { nonce: nonceAlice++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 0).signAndSend(bob, { nonce: nonceBob++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 1).signAndSend(charlie, { nonce: nonceCharlie++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 2).signAndSend(david, { nonce: nonceDavid++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 3).signAndSend(eve, { nonce: nonceEve++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 4).signAndSend(ferdie, { nonce: nonceFerdie++ });
        await waitTxAccepted(alice.address, nonceAlice - 1);
        await api.tx.pwIncubation.feedOriginOfShell(1, 5).signAndSend(alice, { nonce: nonceAlice++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 1).signAndSend(bob, { nonce: nonceBob++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 3).signAndSend(charlie, { nonce: nonceCharlie++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 8).signAndSend(david, { nonce: nonceDavid++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 2).signAndSend(eve, { nonce: nonceEve++ });
        await api.tx.pwIncubation.feedOriginOfShell(1, 10).signAndSend(ferdie, { nonce: nonceFerdie++ });
        console.log(`Sending food among accounts...Done`);
    }

    // Update Incubation Times
    {
        console.log(`Update Incubation Times...`);
        const originOfShells = api.createType('Vec<((u32,u32), u64)>', [[[1, 1], 10800], [[1,0], 7200], [[1, 3], 3600], [[1,2], 2400], [[1, 0], 2400], [[1, 4], 1400], [[1, 5], 1400], [[1, 8], 1400], [[1, 10], 1400]]);
        await api.tx.pwIncubation.updateIncubationTime(originOfShells).signAndSend(overlord, { nonce: nonceOverlord++ });
        console.log(`Update Incubation Times...Done`);
    }

}

main().catch(console.error).finally(() => process.exit());
