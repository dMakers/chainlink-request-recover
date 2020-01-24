## Chainlink node requests recover
This set of scripts allows you to recover all the Oracle requests that have not been `fullfilled` by particular node.

1. `npm i`
1. Look thru the `./index.js` and change the `ORACLE_ADDRESS`, `ORACLE_CREATION_BLOCK`, `JOB_ID`, `NODE_ADDRESS` vars. In this particular case we use `CURRENT_ETHEREUM_PRICE` var as `data` for the request fullfilment. It depends on you Job.
1. `node index.js` - it will be running a while and adding found unfulfilled requests to `txs` file.
1. Look thru the `./submit.js` and change `ORACLE_ADDRESS`, `GAS_PRICE` and `PRIVATE_KEY` vars.
1. `node submit.js` - it will try to fullfil all the found request (from `txs`) file.