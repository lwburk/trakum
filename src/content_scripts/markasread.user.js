import { MessageRouter } from '../util/MessageRouter'
import { Storage } from '../util/Storage'
import { addCoverageListener } from '../util/ScreenCoverage'
import { addListener } from '../util/Chrome'

const md5 = require('md5')

const queryRunner = (function () {
  const testClass = 'trakum_test'
  let items = null

  return (query) => {
    if (items) items.forEach(item => item.element.classList.remove(testClass))
    items = select(query, testClass)
    return items.length
  }
})()

addListener((message, sender, response) => {
  const { action, payload } = message
  switch (action) {
    case 'TEST_QUERY':
      let count = 0
      try {
        count = queryRunner(payload)
      } catch (e) {
        // ignore
      }
      response({ count })
      break
    default:
      response('unknown request')
      break
  }
})

function select (query, className = 'trakum_new') {
  const result = document.evaluate(query, document, null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
  const items = []
  for (let i = 0; i < result.snapshotLength; i++) {
    const node = result.snapshotItem(i)
    switch (node.nodeType) {
      case Node.ELEMENT_NODE:
        items.push(createItem(node, className))
        break
      default:
        break
    }
  }
  return items
}

function createItem (element, className) {
  element.classList.add(className)
  return {
    id: md5(element.textContent),
    element,
    seen: false
  }
}

function markVisited (el) {
  el.classList.remove('trakum_new')
  el.classList.add('trakum_seen')
}

class Tracker {
  constructor (page) {
    this._page = page
    this._items = select(page.query)
    this._storage = new TrackerStorage(this)
  }

  get visited () {
    return this._items.filter(item => item.seen)
  }

  get new () {
    return this._items.filter(item => !item.seen)
  }

  get created () {
    return this._created || (new Date()).toJSON()
  }

  getCachedItems (cache = {}) {
    return this._items.filter(item => cache[item.id])
  }

  start () {
    this._get(cache => {
      this._update(this.getCachedItems(cache))
      this._mark()
    })
  }

  _mark () {
    switch (this._page.markStrategy) {
      case 100:
        addCoverageListener(1500, this._items, (visible) => {
          this._update(visible, true)
        })
        break
      case 101:
      default:
        this._items.forEach(item => item.seen = true)
        this._save()
        break
    }
  }

  _update (items = [], save = false) {
    items.forEach(item => {
      item.seen = true
      markVisited(item.element)
    })
    updateCount(this.new)
    if (save) this._save()
  }

  _get (callback) {
    this._storage.get(response => {
      this._created = response.created
      callback(response.seen)
    })
  }

  _save () {
    this._storage.save()
  }
}

class TrackerStorage {
  constructor (tracker) {
    this._tracker = tracker
    this._pageKey = '_' + document.location.href
  }

  get (callback) {
    Storage.get(this._pageKey, (response = {}) => {
      const { created, items = [] } = response
      const seen = items.reduce((acc, curr) => {
        acc[curr] = true
        return acc
      }, {})
      callback({ created, seen })
    })
  }

  save () {
    Storage.set(this._pageKey, {
      created: this._tracker.created,
      lastVisited: (new Date()).toJSON(),
      items: this._tracker.visited.map(item => item.id)
    })
  }
}

function updateCount (items) {
  const newIds = items.map(item => item.id)
  MessageRouter.sendMessage('UPDATE_COUNT', newIds)
}

function getMatchPatterns (callback) {
  MessageRouter.sendMessage('GET_MATCHING_MATCH_PATTERNS', window.location, callback)
}

getMatchPatterns((response = []) => response.forEach(page => {
  const tracker = new Tracker(page)
  tracker.start()
}))

// 2020-05-14 - 0.2 - converted to a chrome extension
// 2008-12-12 - 0.1 - released
