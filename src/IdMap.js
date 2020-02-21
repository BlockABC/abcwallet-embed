import Utils from './utils'

class IdMap {
  constructor () {
    this.intIds = new Map()
  }

  tryIntifyId (payload) {
    if (!payload.id) {
      payload.id = Utils.genId()
      return
    }
    if (typeof payload.id !== 'number') {
      const newId = Utils.genId()
      this.intIds.set(newId, payload.id)
      payload.id = newId
    }
  }

  tryRestoreId (payload) {
    const id = this.tryPopId(payload.id)
    if (id) {
      payload.id = id
    }
  }

  tryPopId (id) {
    const originId = this.intIds.get(id)
    if (originId) {
      this.intIds.delete(id)
    }
    return originId
  }
}

export default IdMap
