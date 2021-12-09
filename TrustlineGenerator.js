// Copyright (c) 2021 X33 Labs

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


var hotWalletSecret = ""; //Create a new wallet from the testnet faucet: https://xrpl.org/xrp-testnet-faucet.html
var coldWalletSecret = ""; //Create a new wallet from the testnet faucet: https://xrpl.org/xrp-testnet-faucet.html
var publicServer = "wss://s.altnet.rippletest.net:51233"; //RPC server
var fee = "12"; //Fee to pay in Drops
var currencyCode = "TESTCOIN"; //Currency Code
var supply = "10000"; //Supply
var NumberOfWallets = 500; //Number of test wallets to create trustlines for

if (typeof module !== "undefined") {
    var xrpl = require('xrpl')
}

// Connect ---------------------------------------------------------------------
async function main() {
    const client = new xrpl.Client(publicServer)

    //Format CurrencyCode 
    currencyCode = xrpl.convertStringToHex(currencyCode)
    currencyCode = addZeros(currencyCode)

    console.log("Connecting to Network...")
    await client.connect()

    // Get credentials from the Testnet Faucet -----------------------------------
    console.log("Getting Wallet info from Seeds")
    const hot_wallet = xrpl.Wallet.fromSeed(hotWalletSecret);
    const cold_wallet = xrpl.Wallet.fromSeed(coldWalletSecret);
    console.log(`Got hot address ${hot_wallet.address} and cold address ${cold_wallet.address}.`)

    // Configure issuer (cold address) settings ----------------------------------
    const cold_settings_tx = {
        "TransactionType": "AccountSet",
        "Account": cold_wallet.address,
        "SetFlag": xrpl.AccountSetAsfFlags.asfDefaultRipple,
        "Flags": (xrpl.AccountSetTfFlags.tfDisallowXRP),
        "Fee": fee
    }

    const cst_prepared = await client.autofill(cold_settings_tx)
    const cst_signed = cold_wallet.sign(cst_prepared)
    console.log("Sending cold address AccountSet transaction...")
    const cst_result = await client.submitAndWait(cst_signed.tx_blob)
    if (cst_result.result.meta.TransactionResult == "tesSUCCESS") {
        console.log(`Transaction succeeded`)
    } else {
        throw `Error sending transaction: ${cst_result}`
    }


    // Create trust line from hot to cold address --------------------------------
    const currency_code = currencyCode
    const trust_set_tx = {
        "TransactionType": "TrustSet",
        "Account": hot_wallet.address,
        "LimitAmount": {
            "currency": currency_code,
            "issuer": cold_wallet.address,
            "value": supply
        },
        "Flags": 131072,
        "Fee": fee
    }

    const ts_prepared = await client.autofill(trust_set_tx)
    const ts_signed = hot_wallet.sign(ts_prepared)
    console.log("Creating trust line from hot address to issuer...")
    const ts_result = await client.submitAndWait(ts_signed.tx_blob)
    if (ts_result.result.meta.TransactionResult == "tesSUCCESS") {
        console.log(`Transaction succeeded`)
    } else {
        throw `Error sending transaction: ${ts_result.result.meta.TransactionResult}`
    }


    // Send token ----------------------------------------------------------------
    const issue_quantity = supply
    const send_token_tx = {
        "TransactionType": "Payment",
        "Account": cold_wallet.address,
        "Amount": {
            "currency": currency_code,
            "value": issue_quantity,
            "issuer": cold_wallet.address
        },
        "Destination": hot_wallet.address,
        "Fee": fee
    }

    const pay_prepared = await client.autofill(send_token_tx)
    const pay_signed = cold_wallet.sign(pay_prepared)
    console.log(`Sending ${issue_quantity} ${currency_code} to ${hot_wallet.address}...`)
    const pay_result = await client.submitAndWait(pay_signed.tx_blob)
    if (pay_result.result.meta.TransactionResult == "tesSUCCESS") {
        console.log(`Transaction succeeded`)
    } else {
        throw `Error sending transaction: ${pay_result.result.meta.TransactionResult}`
    }

    //Use Hot Wallet to fund other accounts initially
    var masterWallet = hot_wallet;

    var totalWalletsCreated = 0

    for (var i = 0; i < NumberOfWallets; i++) {

        //Check Activating Wallet
        const acctInfo = await client.request({
            command: "account_info",
            account: masterWallet.address
        })

        if ((acctInfo.result.account_data.Balance / 1000000) < 30) {
            //Create new funded wallet since last wallet was too low in XRP
            fund_result = await client.fundWallet()
            masterWallet = fund_result.wallet
            console.log(fund_result)
        }

        const newWallet = xrpl.Wallet.generate()
        // Prepare transaction -------------------------------------------------------
        const prepared = await client.autofill({
            "TransactionType": "Payment",
            "Account": masterWallet.address,
            "Amount": xrpl.xrpToDrops("12"),
            "Destination": newWallet.address
        })
        const max_ledger = prepared.LastLedgerSequence

        // Sign prepared instructions ------------------------------------------------
        const signed = masterWallet.sign(prepared)

        // Submit Transaction
        console.log("Activating New Wallet:")
        const tx = await client.submitAndWait(signed.tx_blob)
        // Check transaction results -------------------------------------------------
        console.log("Transaction result:", tx.result.meta.TransactionResult)
        if (tx.result.meta.TransactionResult == "tesSUCCESS") {
            totalWalletsCreated++;
            console.log("Account # " + totalWalletsCreated + " Created.")
        }

        // Create trust line from hot to cold address --------------------------------
        const currency_code = currencyCode
        const trust_set_tx = {
            "TransactionType": "TrustSet",
            "Account": newWallet.address,
            "LimitAmount": {
                "currency": currency_code,
                "issuer": cold_wallet.address,
                "value": supply
            },
            "Flags": 131072,
            "Fee": fee
        }

        const ts_prepared = await client.autofill(trust_set_tx)
        // Sign Transaction
        const ts_signed = newWallet.sign(ts_prepared)
        console.log("Creating trust line from New Wallet to issuer...")
        const ts_result = await client.submitAndWait(ts_signed.tx_blob)
        if (ts_result.result.meta.TransactionResult == "tesSUCCESS") {
            console.log(`Transaction succeeded`)
        } else {
            throw `Error sending transaction: ${ts_result.result.meta.TransactionResult}`
        }

    }

    console.lot("Successful Script Completion. Total Wallets Created: " + totalWalletsCreated)

    client.disconnect()
} // End of main()

function addZeros(str) {
    while (str.length < 40) {
        str = str + "0";
    }
    return str;
}

main()