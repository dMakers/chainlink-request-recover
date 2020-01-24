const Web3 = require('web3')
const fetch = require('node-fetch')
const fs = require('fs')

const ORACLE_ADDRESS = '0x64fe692be4b42f4ac9d4617ab824e088350c11c2'
const ORACLE_ABI = require('./oracle.abi.json')
const ORACLE_CREATION_BLOCK = '0x8233E0'
const JOB_ID = "0x3865666231363034383733373438626639376336333362396337376538373130"
const NODE_ADDRESS = '0x1b36e154c15a1568e3a23fa0c702807b19b988f2'
const CURRENT_ETHEREUM_PRICE = '0x00000000000000000000000000000000000000000000000000000003c752e340'

const web3 = new Web3('https://mainnet.infura.io')
const oracle = new web3.eth.Contract(ORACLE_ABI, ORACLE_ADDRESS)

async function getOracleRequestEvents(fromBlock, toBlock) {
    const body = {
        "jsonrpc": "2.0",
        "method": "eth_getLogs",
        "params": [
            {
                fromBlock,
                toBlock,
                "topics": [
                    "0xd8d7ecc4800d25fa53ce0372f13a416d98907a7ef3d8d3bdd79cf4fe75529c65",
                    JOB_ID
                ]
            }
        ],
        "id": 74
    }
    const response = await fetch('https://ethereum-rpc2.trustwalletapp.com', {
        body: JSON.stringify(body),
        method: 'POST',
        headers: {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9,ru;q=0.8",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache"
        }
    })

    const { result } = await response.json()
    // console.log('result', result[0])
    const events = []
    result.forEach(event => {
        const data = web3.eth.abi.decodeLog([{type:'bytes32',name:'jobId',indexed:true},{type:'address',name:'requester'},{type:'bytes32',name:'requestId',},{type:'uint256',name:'payment',},{type:'address',name:'callbackAddr',},{type:'bytes4',name:'callbackFunctionId',},{type:'uint256',name:'cancelExpiration',},{type:'uint256',name:'dataVersion',},{type:'bytes',name:'data',}],
            event.data,
            event.topics);
        data.transactionHash = event.transactionHash
        data.blockNumber = event.blockNumber
        events.push(data)
    })
    return events
}

async function getChainlinkFulfilled(fromBlock, toBlock, requestId) {
    const body = {
        "jsonrpc": "2.0",
        "method": "eth_getLogs",
        "params": [
            {
                fromBlock,
                toBlock,
                "topics": [
                    "0x7cc135e0cebb02c3480ae5d74d377283180a2601f8f644edf7987b009316c63a",
                    requestId
                ]
            }
        ],
        "id": 74
    }
    const response = await fetch('https://ethereum-rpc2.trustwalletapp.com', {
        body: JSON.stringify(body),
        method: 'POST',
        headers: {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9,ru;q=0.8",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache"
        }
    })

    const { result } = await response.json()
    // console.log('result', result[0])
    const events = []
    result.forEach(event => {
        // index_topic_1 bytes32 specId, address requester, bytes32 requestId, uint256 payment, address callbackAddr, bytes4 callbackFunctionId, uint256 cancelExpiration, uint256 dataVersion, bytes data
        const data = web3.eth.abi.decodeLog([{type:'bytes32',name:'jobId',indexed:true}],
            event.data,
            event.topics);
        data.transactionHash = event.transactionHash
        data.blockNumber = event.blockNumber
        events.push(data)
    })
    return events
}

async function main() {
    const step = 20000
    let from
    let to
    const txsToSend = []
    for(let i = Number(ORACLE_CREATION_BLOCK); i < 9338464; i += step) {
        console.log(`Start processing step blocks from ${i}`)
        from = '0x' + i.toString(16)
        to = '0x' + (Number(from) + step).toString(16)
        const requestEvents = await getOracleRequestEvents(from, to)
        console.log(`We got ${requestEvents.length} request events. Start processing...`)
        for(let requestEvent of requestEvents) {
            const fullfilEvent = await getChainlinkFulfilled(from, to, requestEvent.requestId)
            if (fullfilEvent.length === 0) {
                console.log('Request without fillfilment found! Blocknumber is ' + Number(requestEvent.blockNumber))
                const { requestId, payment, callbackAddr, callbackFunctionId, cancelExpiration } = requestEvent
                const data = CURRENT_ETHEREUM_PRICE
                const tx = [requestId, payment, callbackAddr, callbackFunctionId, cancelExpiration, data]
                const succesfullFulfill = await oracle.methods.fulfillOracleRequest(...tx).call({
                    from: NODE_ADDRESS
                })
                if (succesfullFulfill) {
                    txsToSend.push(tx)
                    await fs.appendFile('txs', JSON.stringify(tx) + ',\n', () => {})
                } else {
                    console.log('Something wrong with this request, we cannot fullfull it', requestEvent)
                }
            } 
        }
    }
    
}

main()