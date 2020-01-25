## Oracle request finder for chainlink node operator
As a chainlink node operator, you may have missed a few job requests. This tool helps you to find those unfullfilled requests, so you can execute them.

# How to run
Prepare `.env` file

| ENV_VAR | Description |
| --- | --- |
| ORACLE_ADDRESS | Oracle contract address |
| START_BLOCK | When to start collecting events |
| JOB_ID | Job id to look up |
| NODE_ADDRESS | Whitelisted key on your Oracle address for validation |
| FAKE_RESPONSE | Node operator response for unfullfiled job |
| RPC_URL | Ethereum HTTP node RPC url |
| BLOCK_INTERVAL | How many blocks to query in for loop |
| PRIVATE_KEY | Private key (without 0x) to send a request to your Oracle contract - only needed if you wish to execute it |
| GAS_PRICE | Gas price to use for sending txs in gwei |

1. `npm i`
2. `npm run find-missing-requests` - starts searching for missing requests and writes it to `unfulfilled_requests` file
3. `npm run fulfill-requests` - it will try to fulfill found requests from `unfulfilled_requests` file.


Example:
```
Start processing blocks from 9229786 to 9249786
We got 445 request events. Start processing...
Request without fillfilment found! Blocknumber is 9247478
Start processing blocks from 9249786 to 9269786
```
