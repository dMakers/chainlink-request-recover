require('dotenv').config()
const Web3 = require('web3')
const fetch = require('node-fetch')
const fs = require('fs')
const ORACLE_ABI = require('./oracle.abi.json')
const Web3Utils = require('web3-utils')

const {
  ORACLE_ADDRESS,
  START_BLOCK,
  JOB_ID,
  NODE_ADDRESS,
  FAKE_RESPONSE,
  RPC_URL,
  BLOCK_INTERVAL
} = process.env

const web3 = new Web3(RPC_URL)
const oracle = new web3.eth.Contract(ORACLE_ABI, ORACLE_ADDRESS)

async function getOracleRequestEvents(fromBlock, toBlock) {
  const body = {
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [{
      fromBlock,
      toBlock,
      "topics": [
        "0xd8d7ecc4800d25fa53ce0372f13a416d98907a7ef3d8d3bdd79cf4fe75529c65",
        Web3Utils.toHex(JOB_ID)
      ]
    }],
    "id": 74
  }
  const response = await fetch(RPC_URL, {
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
  const step = Number(BLOCK_INTERVAL)
  let from
  let to
  for(let i = Number(START_BLOCK); i < 9338464; i += step) {
    from = Web3Utils.toHex(i)
    to = '0x' + (Number(from) + step).toString(16)
    console.log(`Start processing blocks from ${i} to ${Number(to)}`)
    const requestEvents = await getOracleRequestEvents(from, to)
    console.log(`We got ${requestEvents.length} request events. Start processing...`)
    for(let requestEvent of requestEvents) {
      const fullfilEvent = await getChainlinkFulfilled(from, to, requestEvent.requestId)
      if (fullfilEvent.length === 0) {
        console.log('Request without fulfillment found! Blocknumber is ' + Number(requestEvent.blockNumber))
        const { requestId, payment, callbackAddr, callbackFunctionId, cancelExpiration } = requestEvent
        const data = FAKE_RESPONSE
        const tx = [requestId, payment, callbackAddr, callbackFunctionId, cancelExpiration, data]
        const succesfullFulfill = await oracle.methods.fulfillOracleRequest(...tx).call({
          from: NODE_ADDRESS
        })
        if (succesfullFulfill) {
          await fs.appendFile('unfulfilled_requests', JSON.stringify(tx) + ',\n', () => {})
        } else {
          console.log('Something wrong with this request, we cannot fulfill it', requestEvent)
        }
      }
    }
  }
}

main()
