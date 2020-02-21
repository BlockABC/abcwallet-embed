/* eslint-disable camelcase,no-case-declarations */
import SafeEventEmitter from 'safe-event-emitter'
import IdMap from 'src/IdMap'
import Utils from './utils'
import Filter from './filter'

function noop () {}

const runOnLoad = fn => {
  if (window.document.body != null) {
    fn()
  }
  else {
    window.document.addEventListener('DOMContentLoaded', fn)
  }
}

class MetamaskProvider extends SafeEventEmitter {
  constructor (config = {}) {
    super(config)
    this.isMetaMask = true
    this.isABCWalletLite = true

    this.ready = false

    this.iframe = null

    this.idMap = new IdMap()
    this.callbacks = new Map()

    this.accounts = []
    this.selectedAddress = null

    this.chainId = '1' // todo
    this.networkVersion = '1'

    // this.rpc = null
    this.filter = null

    this.setConfig(config)

    this.on('networkChanged', function (chainId) {
      this.chainId = chainId
      this.networkVersion = chainId
    })

    this.on('accountsChanged', function (res) {
      this.accounts = res.result
      this.selectedAddress = res.result[0]
    })
  }

  isConnected () {
    return true
  }

  setConfig (config) {
    this.chainId = config.chainId
    // this.rpc = new RPCServer(config.rpcUrl)
    this.filter = new Filter(config.rpcUrl)
  }

  async enable () {
    console.log('enable')
    await this.setupIframe()

    return this._sendAsync({
      method: 'eth_requestAccounts',
      params: [],
    }).then(res => {
      this.accounts = res.result
      this.selectedAddress = res.result[0]
      return this.accounts
    })
  }

  init () {
    window.addEventListener('message', (event) => {
      this.onMessage(event)
    }, false)

    // prevent this being missed
    this.send = this.send.bind(this)
    this.sendAsync = this.sendAsync.bind(this)
  }

  onMessage (event) {
    let data
    try {
      data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
    }
    catch (err) {
      return console.log(event.data)
    }

    if (!data) return

    console.log('sdk receive', data)

    const { ns, method, id, result, error } = data

    if (ns !== 'web3') return

    if (error) {
      this.sendError(id, error)
    }
    else {
      this.sendResponse(id, result)
    }
  }

  setupIframe () {
    if (this.setupIframeTask) {
      return this.setupIframeTask
    }
    const iframe = document.createElement('iframe')
    iframe.src = 'https://abcwallet-lite.com/web3'

    this.iframe = iframe

    runOnLoad(() => {
      document.body.appendChild(iframe)
    })

    this.setupIframeTask = new Promise((resolve, reject) => {
      iframe.onload = () => {
        console.log('iframe setup')
        this.ready = true
        resolve(iframe)
      }

      iframe.onerror = function (event) {
        reject(event.error)
      }
    })

    return this.setupIframeTask
  }

  send (payload, callback) {
    console.log('sdk send', payload)
    if (!callback) {
      return this._sendSync(payload)
    }
    // 如果提供了 callback，说明是异步调用，但是用错了方法，这里兼容下
    else {
      this.sendAsync(payload, callback)
    }
  }

  sendAsync (payload, callback) {
    if (Array.isArray(payload)) {
      Promise.all(payload.map(this._sendAsync.bind(this)))
        .then(data => callback(null, data))
        .catch(error => callback(error, null))
    }
    else {
      this._sendAsync(payload)
        .then(data => callback(null, data))
        .catch(error => callback(error, null))
    }
  }

  _sendAsync (payload) {
    this.idMap.tryIntifyId(payload)
    return new Promise((resolve, reject) => {
      if (!payload.id) {
        payload.id = Utils.genId()
      }

      this.callbacks.set(payload.id, (error, data) => {
        if (error) {
          reject(error)
        }
        else {
          resolve(data)
        }
      })

      switch (payload.method) {
        case 'eth_accounts':
          return this.sendResponse(payload.id, this.accounts)
        case 'eth_coinbase':
          return this.sendResponse(payload.id, (this.accounts && this.accounts[0]) || null)
        case 'net_version':
          return this.sendResponse(payload.id, this.chainId)
        case 'eth_sign':
          return this.eth_sign(payload)
        case 'personal_sign':
          return this.personal_sign(payload)
        case 'personal_ecRecover':
          return this.personal_ecRecover(payload)
        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
          return this.eth_signTypedData(payload)
        case 'eth_sendTransaction':
          return this.eth_sendTransaction(payload)
        case 'eth_requestAccounts':
          return this.eth_requestAccounts(payload)
        case 'eth_newFilter':
          return this.eth_newFilter(payload)
        case 'eth_newBlockFilter':
          return this.eth_newBlockFilter(payload)
        case 'eth_newPendingTransactionFilter':
          return this.eth_newPendingTransactionFilter(payload)
        case 'eth_uninstallFilter':
          return this.eth_uninstallFilter(payload)
        case 'eth_getFilterChanges':
          return this.eth_getFilterChanges(payload)
        case 'eth_getFilterLogs':
          return this.eth_getFilterLogs(payload)
        default:
          // this.callbacks.delete(payload.id)
          // return this.rpc.call(payload).then(resolve).catch(reject)
          return this.callRpc(payload)
      }
    })
  }

  callRpc (payload) {
    this.postMessage(payload.method, payload.id, payload)
  }

  eth_sign (payload) {
    this.postMessage('eth_sign', payload.id, { data: payload.params[1] })
  }

  personal_sign (payload) {
    this.postMessage('personal_sign', payload.id, { data: payload.params[0] })
  }

  personal_ecRecover (payload) {
    this.postMessage('personal_ecRecover', payload.id, { signature: payload.params[1], message: payload.params[0] })
  }

  eth_signTypedData (payload) {
    this.postMessage('eth_signTypedData', payload.id, { data: payload.params[1] })
  }

  eth_sendTransaction (payload) {
    this.postMessage('eth_sendTransaction', payload.id, payload.params[0])
  }

  eth_requestAccounts (payload) {
    this.postMessage('eth_requestAccounts', payload.id, {})
  }

  eth_newFilter (payload) {
    this.filter.newFilter(payload)
      .then(filterId => this.sendResponse(payload.id, filterId))
      .catch(error => this.sendError(payload.id, error))
  }

  eth_newBlockFilter (payload) {
    this.filter.newBlockFilter()
      .then(filterId => this.sendResponse(payload.id, filterId))
      .catch(error => this.sendError(payload.id, error))
  }

  eth_newPendingTransactionFilter (payload) {
    this.filter.newPendingTransactionFilter()
      .then(filterId => this.sendResponse(payload.id, filterId))
      .catch(error => this.sendError(payload.id, error))
  }

  eth_uninstallFilter (payload) {
    this.filter.uninstallFilter(payload.params[0])
      .then(filterId => this.sendResponse(payload.id, filterId))
      .catch(error => this.sendError(payload.id, error))
  }

  eth_getFilterChanges (payload) {
    this.filter.getFilterChanges(payload.params[0])
      .then(data => this.sendResponse(payload.id, data))
      .catch(error => this.sendError(payload.id, error))
  }

  eth_getFilterLogs (payload) {
    this.filter.getFilterLogs(payload.params[0])
      .then(data => this.sendResponse(payload.id, data))
      .catch(error => this.sendError(payload.id, error))
  }

  sendError (id, error) {
    if (error.code === 1) {
      this.iframe.height = 700
      this.iframe.width = 400
      this.iframe.src = 'https://abcwallet-lite.com'
    }
    console.error('sdk receive error', id, error, error.code)
    const callback = this.callbacks.get(id)
    if (callback) {
      let callbackError

      if (error instanceof Error) {
        callbackError = error
      }
      else {
        callbackError = new Error(error.message || error)
        callbackError = error.code
      }

      callback(callbackError, null)
      this.callbacks.delete(id)
    }
  }

  postMessage (method, id, data) {
    if (this.ready || method === 'eth_requestAccounts') {
      this._postMessage({
        'ns': 'web3',
        'method': method,
        'id': id,
        'data': data,
      })
    }
    else {
      // don't forget to verify in the app
      this.sendError(id, new Error('provider is not ready'))
    }
  }

  _sendSync (payload) {
    let result = null

    switch (payload.method) {
      case 'eth_accounts':
        result = this.accounts
        break

      case 'eth_coinbase':
        result = this.accounts.length > 0 ? this.accounts[0] : null
        break

      case 'eth_uninstallFilter':
        this.sendAsync(payload, noop)
        result = true
        break

      case 'net_version':
        result = this.chainId
        break

      default:
        const link = 'https://github.com/MetaMask/faq/blob/master/DEVELOPERS.md#dizzy-all-async---think-of-metamask-as-a-light-client'
        const message = `Web3 provider does not support synchronous methods like ${payload.method} without a callback. See ${link} for details.`

        throw new Error(message)
    }

    return {
      id: payload.id,
      jsonrpc: payload.jsonrpc,
      result
    }
  }

  sendResponse (id, result) {
    const originId = this.idMap.tryPopId(id) || id
    const callback = this.callbacks.get(id)
    const data = { jsonrpc: '2.0', id: originId }
    if (typeof result === 'object' && result.jsonrpc && result.result) {
      data.result = result.result
    }
    else {
      data.result = result
    }
    if (callback) {
      callback(null, data)
      this.callbacks.delete(id)
    }
  }

  _postMessage ({ ns, method, id, data }) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      ns: ns,
      method,
      id,
      data
    }), '*')
  }
}

export default MetamaskProvider
