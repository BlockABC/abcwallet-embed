import Web3Provider from './web3-provider'
import Web3 from 'web3'

export default class Index {
  constructor () {
    this.initialized = false
    this.isLoggedIn = false

    this.ethereum = null // proxied provider
    this.provider = null // provider
    this.web3 = null // new Web3(provider)

    this.Web3 = Web3
  }

  async init () {
    if (this.initialized) throw new Error('Don\'t initialize repeatedly')

    await this._setupWeb3()

    this.initialized = true
  }

  login () {
    if (!this.initialized) throw new Error('Please initialize first')
    if (this.isLoggedIn) throw new Error('User has logged in')

    return this.ethereum.enable()
  }

  async _setupWeb3 () {
    const web3Provider = new Web3Provider({
      rpcUrl: 'https://eth.abcwallet.com/api/eth_v1/rpc_relay',
      chainId: '1'
    })

    this.Web3.givenProvider = web3Provider

    // Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
    // `sendAsync` method on the prototype, causing `this` reference issues with drizzle
    const proxiedWeb3Provider = new Proxy(web3Provider, {
      // straight up lie that we deleted the property so that it doesnt
      // throw an error in strict mode
      deleteProperty: () => true
    })

    this.ethereum = proxiedWeb3Provider

    this.provider = web3Provider
    this.web3 = new Web3(web3Provider)
    this.web3.setProvider = function () {
      console.log('Ao, can not overwirte provider with web3.setProvider')
    }

    await web3Provider.setupIframe()

    // todo: 暂时没用上这些变量
    web3Provider.init({
      ethereum: this.ethereum,
      web3: this.web3
    })
  }

  logout () {

  }
}
