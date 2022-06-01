require('dotenv').config();
const BN = require('bn.js');
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');

const rootPrivkey = process.env.ROOT_PRIVKEY;
const userPrivkey = process.env.USER_PRIVKEY;
const overlordPrivkey = process.env.OVERLOAD_PRIVKEY;
const endpoint = process.env.ENDPOINT;

const bnUnit = new BN(1e12);
function token(n) {
    return new BN(n).mul(bnUnit);
}

async function main() {
    const wsProvider = new WsProvider(endpoint);
    const api = await ApiPromise.create({
        provider: wsProvider,
        types: {
            RaceType: {
                _enum: ['Cybord', 'AISpectre', 'XGene', 'Pandroid']
            },
            CareerType: {
                _enum: ['HardwareDruid', 'RoboWarrior', 'TradeNegotiator', 'HackerWizard', 'Web3Monk']
            },
            StatusType: {
                _enum: ['ClaimSpirits', 'PurchaseRareOriginOfShells', 'PurchasePrimeOriginOfShells', 'PreorderOriginOfShells']
            }
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

    const keyring = new Keyring({ type: 'sr25519' });
    // status types
    const claimSpirits = api.createType('StatusType', 'ClaimSpirits');
    const root = keyring.addFromUri(rootPrivkey);
    const user = keyring.addFromUri(userPrivkey);
    const overlord = keyring.addFromUri(overlordPrivkey);
    let nonceRoot = await getNonce(root.address);
    let nonceOverlord = await getNonce(overlord.address);

    // prep
    {
        console.log("Add funds to overlord account...");
        await api.tx.balances.transfer(overlord.address, token(1_000_000)).signAndSend(root, {nonce: nonceRoot++});
        await waitTxAccepted(root.address, nonceRoot - 1);
        console.log("Add funds to overlord account...Done.");
        console.log("Setting new overlord...");
        await api.tx.sudo.sudo(
            api.tx.pwNftSale.setOverlord(overlord.address)
        ).signAndSend(root, {nonce: nonceRoot++});
        await sleep(6000);
        await waitTxAccepted(root.address, nonceRoot - 1);
        console.log("Setting new overlord...Done.");
        console.log("Initialize Phala World Clock...");
        await api.tx.pwNftSale.initializeWorldClock()
            .signAndSend(overlord, {nonce: nonceOverlord++});
        await waitTxAccepted(overlord.address, nonceOverlord - 1);
        console.log("Initialize Phala World Clock...Done");
        console.log("Create Spirits, Origin of Shells & Shells Collections...");
        // mint spirits NFTs with overlord
        // collection 0: spirits
        await api.tx.pwNftSale.pwCreateCollection(
            'Phala World Spirits Collection',
            null,
            'PWSPRT'
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // set the spirits collection id
        await api.tx.pwNftSale.setSpiritCollectionId(
            0
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // collection 1: origin of shells
        await api.tx.pwNftSale.pwCreateCollection(
            'Phala World Origin of Shells Collection',
            null,
            'PWOAS'
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // set the origin of shell collection id
        await api.tx.pwNftSale.setOriginOfShellCollectionId(
            1
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // collection 2: shells
        await api.tx.pwNftSale.pwCreateCollection(
            'Phala World Shells Collection',
            null,
            'PWSHL'
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        // set the origin of shell collection id
        await api.tx.pwIncubation.setShellCollectionId(
            2
        ).signAndSend(overlord, {nonce: nonceOverlord++});
        console.log("Create Spirits and Origin of Shell Collections...Done");
        console.log("Initialize Origin of Shell NFT sale inventory...");
        // set the initial inventory numbers that will be used until the preorder phase
        await api.tx.pwNftSale.initRarityTypeCounts()
            .signAndSend(overlord, {nonce: nonceOverlord++});
        console.log("Initialize Origin of Shell NFT sale inventory...Done");
        console.log("Set ClaimSpirits status to true...");
        // available states:
        // ClaimSpirits,
        // PurchaseRareOriginOfShells,
        // PurchasePrimeOriginOfShells,
        // PreorderOriginOfShells,
        await api.tx.pwNftSale.setStatusType(true, 'ClaimSpirits')
            .signAndSend(overlord, {nonce: nonceOverlord++});
        await waitTxAccepted(overlord.address, nonceOverlord - 1);
        console.log("Set ClaimSpirits Status to true...Done");
    }
}

main().catch(console.error).finally(() => process.exit());