require('dotenv').config();
const sleep = require('p-sleep');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { stringToU8a, u8aToHex } = require('@polkadot/util');

const rootPrivkey = process.env.ROOT_PRIVKEY;
const userPrivkey = process.env.USER_PRIVKEY;
const overlordPrivkey = process.env.OVERLOAD_PRIVKEY;
const ferdiePrivkey = process.env.FERDIE_PRIVKEY;
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
        }
    });
    const keyring = new Keyring({type: 'sr25519'});
    // status types
    const claimSpirits = api.createType('StatusType', 'ClaimSpirits');
    const root = keyring.addFromUri(rootPrivkey);
    const user = keyring.addFromUri(userPrivkey);
    const ferdie = keyring.addFromUri(ferdiePrivkey);
    const overlord = keyring.addFromUri(overlordPrivkey);

    {
        const purpose = api.createType('Purpose', 'RedeemSpirit');
        const overlordMessage = api.createType('OverlordMessage', {'account': ferdie.address, 'purpose': purpose});
        const metadataSig = overlord.sign(overlordMessage.toU8a());
    }

    // Create Whitelist for user account
    {

        const purpose = api.createType('Purpose', 'BuyPrimeOriginOfShells');
        const overlordMessage = api.createType('OverlordMessage', {'account': ferdie.address, 'purpose': purpose});
        const overlordSig = overlord.sign(overlordMessage.toU8a());
    }
}

main().catch(console.error).finally(() => process.exit());
