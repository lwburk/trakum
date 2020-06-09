/* global chrome */

import { Trakum } from '../util/Trakum'

const trakum = new Trakum()

chrome.runtime.onMessage.addListener((message, sender, response) => {
  const { action, payload } = message
  switch (action) {
    case 'UPDATE_COUNT':
      setBadgeText(sender.tab.id, payload.length)
      response({})
      break
    case 'GET_MATCH_PATTERNS':
      response(trakum.pageSpecs)
      break
    case 'GET_MATCHING_MATCH_PATTERNS':
      response(trakum.matches(payload))
      break
    case 'ADD_PAGE_SPEC':
      trakum.addPageSpec(payload)
      response(trakum.pageSpecs)
      break
    case 'EDIT_PAGE_SPEC':
      trakum.updatePageSpec(payload)
      response(trakum.pageSpecs)
      break
    case 'DELETE_PAGE_SPEC':
      trakum.deletePageSpec(payload)
      response(trakum.pageSpecs)
      break
    default:
      response('unknown request')
      break
  }
})

function setBadgeText (tabId, val) {
  chrome.browserAction.setBadgeText({
    text: (val > 0 ? String(val) : ''),
    tabId
  })
}
