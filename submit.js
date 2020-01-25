require('dotenv').config()
const Web3 = require('web3')
const { numberToHex, toHex, toWei } = require('web3-utils')
const fs = require('fs')
const ORACLE_ABI = require('./oracle.abi.json')

const {
  ORACLE_ADDRESS,
  PRIVATE_KEY,
  GAS_PRICE,
  RPC_URL
} = process.env

const web3 = new Web3(RPC_URL, null, { transactionConfirmationBlocks: 1 })
const account = web3.eth.accounts.privateKeyToAccount('0x' + PRIVATE_KEY)
web3.eth.accounts.wallet.add('0x' + PRIVATE_KEY)
web3.eth.defaultAccount = account.address
const oracle = new web3.eth.Contract(ORACLE_ABI, ORACLE_ADDRESS)

async function main() {
  const file = '[' + fs.readFileSync('unfulfilled_requests').slice(0, -2) + ']'
  const txs = JSON.parse(file)
  let nonce = await web3.eth.getTransactionCount(account.address)
  console.log('nonce', nonce)
  for(let i = 0; i < txs.length; i++) {
    const args = txs[i]
    const data = oracle.methods.fulfillOracleRequest(...args).encodeABI()
    try {
      const gas = await oracle.methods.fulfillOracleRequest(...args).estimateGas()
      const tx = {
        from: web3.eth.defaultAccount,
        value: '0x00',
        gas: numberToHex(500000), // please make sure its above `MINIMUM_CONSUMER_GAS_LIMIT` in your Oracle.sol
        gasPrice: toHex(toWei(GAS_PRICE, 'gwei')),
        to: oracle._address,
        netId: 1,
        data,
        nonce
      }
      let signedTx = await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY)
      let result
      if (i % 50 === 0) {
        result = await web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        console.log(`A new successfully sent tx ${result.transactionHash}`)
      } else {
        result = web3.eth.sendSignedTransaction(signedTx.rawTransaction)
        result.once('transactionHash', function(txHash){
          console.log(`A new successfully sent tx ${txHash}`)
        }).on('error', async function(e){
          console.log('error', e.message)
        })
      }
      nonce++
    } catch(e) {
      console.error('skipping tx ', txs[i], e)
    }
  }
}

main()
