const Web3 = require('web3')
const { numberToHex, toHex, toWei } = require('web3-utils')
const fs = require('fs')

const ORACLE_ADDRESS = '0x64fe692be4b42f4ac9d4617ab824e088350c11c2'
const ORACLE_ABI = require('./oracle.abi.json')
const PRIVATE_KEY = '' // CHANGE IT
const GAS_PRICE = '3.2' // in Gwei

const web3 = new Web3('https://mainnet.infura.io', null, { transactionConfirmationBlocks: 1 })
const account = web3.eth.accounts.privateKeyToAccount('0x' + PRIVATE_KEY)
web3.eth.accounts.wallet.add('0x' + PRIVATE_KEY)
web3.eth.defaultAccount = account.address
const oracle = new web3.eth.Contract(ORACLE_ABI, ORACLE_ADDRESS)

async function main() {
    const txs = JSON.parse(fs.readFileSync('txs'))
    // console.log('txs', txs)
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
                gas: numberToHex(500000),
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
                console.log(`A new successfully sent tx ${result}`)
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
        }
    }
}

main()