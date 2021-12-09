# Trustline Generator

X33 Labs has created an easy test script to generate a number of wallets and trustlines on testnet for projects to test the X33 Labs Airdrop Tool.

To Run Script:

1. Install Node JS and NPM:

        (https://nodejs.org/en/download/)

2. Open TrustlineGenerator.js in VS Code or Notepad and change the setting variables at the top of the file:

        var hotWalletSecret = ""; //Create a new wallet from the testnet faucet: https://xrpl.org/xrp-testnet-faucet.html
        var coldWalletSecret = ""; //Create a new wallet from the testnet faucet: https://xrpl.org/xrp-testnet-faucet.html
        var publicServer = "wss://s.altnet.rippletest.net:51233"; //RPC server
        var fee = "12"; //Fee to pay in Drops
        var currencyCode = "TESTCOIN"; //Currency Code
        var supply = "10000"; //Supply
        var NumberOfWallets = 500; //Number of test wallets to create trustlines for

3. Open a command prompt, powershell or terminal window. Navigate to the script folder and issue the npm install command:

        npm install

3. Start the script:

        node TrustlineGenerator.js
