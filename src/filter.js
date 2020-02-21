import Utils from './utils'

class FilterMgr {
  constructor (rpc) {
    this.rpc = rpc
    this.filters = new Map()
    this.blockNumbers = new Map()
    this.timers = new Map()
    this.timeoutInterval = 5 * 60 * 1000
  }

  newFilter (payload) {
    const filter = {
      type: 'log',
      options: this._normalizeFilter(payload.params[0])
    }
    const filterId = this._installFilter(filter)
    return this._getBlockNumber().then(blockNumber => {
      this.blockNumbers.set(filterId, blockNumber)
      return Utils.intToHex(filterId)
    })
  }

  newBlockFilter () {
    const filter = { type: 'block', options: 'latest' }
    const filterId = this._installFilter(filter)
    return this._getBlockNumber().then(blockNumber => {
      this.blockNumbers.set(filterId, blockNumber)
      return Utils.intToHex(filterId)
    })
  }

  newPendingTransactionFilter () {
    const filter = { type: 'tx', options: 'pending' }
    const filterId = this._installFilter(filter)
    return this._getBlockNumber().then(blockNumber => {
      this.blockNumbers.set(filterId, blockNumber)
      return Utils.intToHex(filterId)
    })
  }

  _installFilter (filter) {
    const count = this.filters.keys.length
    const filterId = count + 1
    filter.id = filterId
    this.filters.set(filterId, filter)
    this._setupTimer(filterId)
    return filterId
  }

  uninstallFilter (filterId) {
    const id = Utils.hexToInt(filterId)
    console.log('uninstall filter ', this.filters.get(id))
    this.filters.delete(id)
    this.blockNumbers.delete(id)
    this._clearTimer(id)
    return Promise.resolve(true)
  }

  getFilterChanges (filterId) {
    const id = Utils.hexToInt(filterId)
    const filter = this.filters.get(id)
    if (!filter) {
      return Promise.reject(new Error('getFilterChanges: no filter found'))
    }
    switch (filter.type) {
      case 'log':
        return this._getLogFilterChanges(filter.id)
      case 'block':
        return this._getBlockFilterChanges(filter.id)
      case 'tx':
        return this._getTxFilterChanges(filter.id)
      default:
        return Promise.reject(new Error('unsupport filter type'))
    }
  }

  _getLogFilterChanges (filterId) {
    const filter = this.filters.get(filterId).options
    const fromBlock = this.blockNumbers.get(filterId)
    if (!filter || !fromBlock) {
      return Promise.reject(new Error('_getLogFilterChanges: no filter found'))
    }
    return this._getBlockNumber().then(blockNumber => {
      const toBlock = (filter.toBlock === 'latest' ? blockNumber : filter.toBlock)
      const from = Utils.hexToInt(fromBlock)
      const to = Utils.hexToInt(toBlock)
      if (from > to) {
        return []
      }
      return this.rpc.getFilterLogs(Object.assign({}, filter, {
        fromBlock: fromBlock,
        toBlock: toBlock
      }))
    })
  }

  _getBlockFilterChanges (filterId) {
    return this._getBlocksForFilter(filterId)
      .then(blocks => blocks.map(block => block.hash))
  }

  _getTxFilterChanges (filterId) {
    return this._getBlocksForFilter(filterId)
      .then(blocks => Utils.flatMap(blocks, block => block.transactions))
  }

  _getBlocksForFilter (filterId) {
    const fromBlock = this.blockNumbers.get(filterId)
    if (!fromBlock) {
      return Promise.reject(new Error('no filter found'))
    }
    return this._getBlockNumber().then(toBlock => {
      const from = Utils.hexToInt(fromBlock)
      const to = Utils.hexToInt(toBlock)
      if (to > from) {
        this.blockNumbers.set(filterId, toBlock)
      }
      return this._getBlocksInRange(from, to)
    })
  }

  _getBlocksInRange (fromBlock, toBlock) {
    if (fromBlock >= toBlock) {
      return Promise.resolve([])
    }
    return Promise.all(
      Utils.intRange(fromBlock, toBlock)
        .map(Utils.intToHex)
        .map(this._getBlockByNumber.bind(this))
    )
  }

  _getBlockNumber () {
    return this.rpc.getBlockNumber()
  }

  _getBlockByNumber (number) {
    return this.rpc.getBlockByNumber(number)
  }

  getFilterLogs (filterId) {
    const filter = this.filters.get(Utils.hexToInt(filterId))
    if (!filter) {
      return Promise.reject(new Error('no filter found'))
    }
    return this.rpc.getFilterLogs(this._normalizeParams(filter.options))
  }

  _normalizeParams (filter) {
    const params = {
      fromBlock: this._normalizeParamBlock(filter.fromBlock),
      toBlock: this._normalizeParamBlock(filter.toBlock),
      topics: filter.topics
    }
    if (filter.addresses) {
      params.address = filter.addresses
    }
    return params
  }

  _normalizeFilter (params) {
    return {
      fromBlock: this._normalizeFilterBlock(params.fromBlock),
      toBlock: this._normalizeFilterBlock(params.toBlock),
      addresses: undefined === params.address ? null : Array.isArray(params.address) ? params.address : [params.address],
      topics: params.topics || []
    }
  }

  _normalizeFilterBlock (blockNumber) {
    if (undefined === blockNumber || blockNumber === 'latest' || blockNumber === 'pending') {
      return 'latest'
    }
    if (blockNumber === 'earliest') {
      return 0
    }
    if (blockNumber.startsWith('0x')) {
      return Utils.hexToInt(blockNumber)
    }
    throw new Error('Invalid block option: ' + blockNumber)
  }

  _normalizeParamBlock (blockNumber) {
    return blockNumber === 'latest' ? blockNumber : Utils.intToHex(blockNumber)
  }

  _clearTimer (filterId) {
    const oldTimer = this.timers.get(filterId)
    if (oldTimer) {
      clearTimeout(oldTimer)
    }
  }

  _setupTimer (filterId) {
    this._clearTimer(filterId)
    const newTimer = setTimeout(() => {
      console.log('filter timeout ', filterId)
      this.filters.delete(filterId)
      this.blockNumbers.delete(filterId)
    }, this.timeoutInterval)
    this.timers.set(filterId, newTimer)
  }
}

export default FilterMgr
