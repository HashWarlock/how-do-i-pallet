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
    let nonceAlice = await getNonce(alice.address);
    let nonceBob = await getNonce(bob.address);
    let nonceCharlie = await getNonce(charlie.address);
    let nonceDavid = await getNonce(david.address);
    let nonceEve = await getNonce(eve.address);
    let nonceFerdie = await getNonce(ferdie.address);
    let nonceOverlord = await getNonce(overlord.address);

    // Claim Spirits
    {
        console.log(`Claiming Spirits...`);
        const purpose = api.createType('Purpose', 'RedeemSpirit');
        const overlordMessage = api.createType('OverlordMessage', {'account': ferdie.address, 'purpose': purpose});
        const metadataSig = overlord.sign(overlordMessage.toU8a());
        await api.tx.pwNftSale.claimSpirit().signAndSend(alice, { nonce: nonceAlice++ });
        await api.tx.pwNftSale.claimSpirit().signAndSend(bob, { nonce: nonceBob++ });
        await api.tx.pwNftSale.claimSpirit().signAndSend(charlie, { nonce: nonceCharlie++ });
        await api.tx.pwNftSale.claimSpirit().signAndSend(david, { nonce: nonceDavid++ });
        await api.tx.pwNftSale.claimSpirit().signAndSend(eve, { nonce: nonceEve++ });
        await api.tx.pwNftSale.redeemSpirit(metadataSig).signAndSend(ferdie, { nonce: nonceFerdie++ });
        await waitTxAccepted(alice.address, nonceAlice - 1);
        console.log(`Claiming Spirits Done.`);
    }

    // Buy Rare Origin of Shell NFTs (alice, bob, charlie, david)
    {
        console.log(`Purchase Rare Origin of Shells...`);
        await api.tx.pwNftSale.setStatusType(true, 'PurchaseRareOriginOfShells')
            .signAndSend(overlord, { nonce: nonceOverlord++ } );
        await waitTxAccepted(overlord.address, nonceOverlord - 1);
        await api.tx.pwNftSale.buyRareOriginOfShell('Legendary', 'Cyborg', 'HackerWizard')
            .signAndSend(bob, { nonce: nonceBob++ });
        await api.tx.pwNftSale.buyRareOriginOfShell('Legendary', 'AISpectre', 'Web3Monk')
            .signAndSend(alice, { nonce: nonceAlice++ });
        await api.tx.pwNftSale.buyRareOriginOfShell('Magic', 'Pandroid', 'RoboWarrior')
            .signAndSend(charlie, { nonce: nonceCharlie++ });
        await api.tx.pwNftSale.buyRareOriginOfShell('Magic', 'XGene', 'TradeNegotiator')
            .signAndSend(david, { nonce: nonceDavid++ });
        await waitTxAccepted(david.address, nonceDavid - 1);
        console.log(`Purchase Rare Origin of Shells Done.`);
    }

    // Buy Prime Origin of Shell NFTs Whitelist (eve & ferdie)
    {
        console.log(`Purchase Prime Origin of Shells Whitelist...`);
        await api.tx.pwNftSale.setStatusType(true, 'PurchasePrimeOriginOfShells')
            .signAndSend(overlord, { nonce: nonceOverlord++ });
        const purpose = api.createType('Purpose', 'BuyPrimeOriginOfShells');
        const ferdieWlMessage = api.createType('OverlordMessage', {'account': ferdie.address, 'purpose': purpose});
        const eveWlMessage = api.createType('OverlordMessage', {'account': eve.address, 'purpose': purpose});
        const ferdieWlSig = overlord.sign(ferdieWlMessage.toU8a());
        const eveWlSig = overlord.sign(eveWlMessage.toU8a());
        await api.tx.pwNftSale.buyPrimeOriginOfShell(ferdieWlSig, 'Cyborg', 'HackerWizard')
            .signAndSend(ferdie, { nonce: nonceFerdie++ });
        await api.tx.pwNftSale.buyPrimeOriginOfShell(eveWlSig, 'XGene', 'Web3Monk')
            .signAndSend(eve, { nonce: nonceEve++ });
        await waitTxAccepted(overlord.address, nonceOverlord - 1);
        console.log(`Purchase Prime Origin of Shells Whitelist Done`);
    }

    // Enable Preorders of Prime Origin of Shell NFTs
    {
        console.log(`Preorder Prime Origin of Shells Non-Whitelist...`);
        await api.tx.pwNftSale.setStatusType(true, 'PreorderOriginOfShells')
           .signAndSend(overlord, { nonce: nonceOverlord++ });
        await api.tx.pwNftSale.preorderOriginOfShell('Pandroid', 'HackerWizard')
           .signAndSend(ferdie, { nonce: nonceFerdie++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('AISpectre', 'Web3Monk')
            .signAndSend(alice, { nonce: nonceAlice++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('Pandroid', 'RoboWarrior')
            .signAndSend(bob, { nonce: nonceBob++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('Cyborg', 'Web3Monk')
            .signAndSend(charlie, { nonce: nonceCharlie++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('Cyborg', 'HardwareDruid')
            .signAndSend(david, { nonce: nonceDavid++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('XGene', 'TradeNegotiator')
            .signAndSend(eve, { nonce: nonceEve++ } );
        // Wait Tx Accepted
        await waitTxAccepted(ferdie.address, nonceFerdie - 1);
        await api.tx.pwNftSale.preorderOriginOfShell('XGene', 'HackerWizard')
            .signAndSend(ferdie, { nonce: nonceFerdie++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('AISpectre', 'HackerWizard')
            .signAndSend(alice, { nonce: nonceAlice++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('XGene', 'RoboWarrior')
            .signAndSend(bob, { nonce: nonceBob++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('Pandroid', 'HardwareDruid')
            .signAndSend(charlie, { nonce: nonceCharlie++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('AISpectre', 'TradeNegotiator')
            .signAndSend(david, { nonce: nonceDavid++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('Pandroid', 'Web3Monk')
            .signAndSend(eve, { nonce: nonceEve++ } );
        // Wait for TX accepted
        await waitTxAccepted(ferdie.address, nonceFerdie - 1);
        await api.tx.pwNftSale.preorderOriginOfShell('Cyborg', 'HackerWizard')
            .signAndSend(ferdie, { nonce: nonceFerdie++ } );
        await api.tx.pwNftSale.preorderOriginOfShell('Pandroid', 'TradeNegotiator')
            .signAndSend(eve, { nonce: nonceEve++ } );
        console.log(`Preorder Prime Origin of Shells Non-Whitelist Done`);
    }

}

main().catch(console.error).finally(() => process.exit());
