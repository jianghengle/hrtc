// pages/threads/threads.js
import { formatDateShort, formatTime, formatTimeLong, formatPrice, waitForUser, httpGet } from '../../utils/utils'

//获取应用实例
const app = getApp()

Page({

  /**
   * Page initial data
   */
  data: {
    user: null,
    eventIds: null,
    ownedEventMap: null,
    eventThreadsMap: null,
    userMap: {},
    eventMap: {},
    hideTab: false,
    historyOrdersCount: 0,
    historyOrders: [],
    historyOpen: false,
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {

  },

  /**
   * Lifecycle function--Called when page is initially rendered
   */
  onReady() {

  },

  /**
   * Lifecycle function--Called when page show
   */
  onShow() {
    this.setData({hideTab: false})
    var that = this
    waitForUser(app, function(){
      that.setData({
        user: app.globalData.user,
        userMap: {[app.globalData.user.id]: app.globalData.user},
      })
      that.getThreads()
    })
  },

  getThreads() {
    var that = this
    wx.showLoading({
      title: '加载中',
    })
    httpGet('/thread/get-threads', app).then(resp => {
      var threads = resp.data.threads.sort((a, b) => b.updatedAt - a.updatedAt)
      var eventIds = []
      var userIds = []
      var ownedEventMap = {}
      var eventThreadsMap = {}
      for (var thread of threads) {
        thread.latestChat.timeLabel = formatTime(thread.latestChat.timestamp)
        thread.missingCount = (thread.eventOwnerId == that.data.user.id) ? (thread.chatCount - thread.eventOwnerCount) : (thread.chatCount - thread.userCount)
        if (thread.eventOwnerId == that.data.user.id) {
          if (!ownedEventMap[thread.eventId]) {
            ownedEventMap[thread.eventId] = []
            eventThreadsMap[thread.eventId] = []
          }
          if (!userIds.includes(thread.userId)) {
            userIds.push(thread.userId)
          }
          ownedEventMap[thread.eventId].push(thread)
          if (thread.orderedItems && thread.orderedItems.length) {
            eventThreadsMap[thread.eventId].push(thread)
            if (!eventIds.includes(thread.eventId)) {
              eventIds.push(thread.eventId)
            }
          }
        } else {
          if (!userIds.includes(thread.eventOwnerId)) {
            userIds.push(thread.eventOwnerId)
          }
          if (thread.orderedItems && thread.orderedItems.length) {
            eventThreadsMap[thread.eventId] = [thread]
            if (!eventIds.includes(thread.eventId)) {
              eventIds.push(thread.eventId)
            }
          }
        }
      }
      that.getUsers(userIds)
      that.getEvents(eventIds)
      that.setData({
        eventIds: eventIds,
        ownedEventMap: ownedEventMap,
        eventThreadsMap: eventThreadsMap,
      })
      that.collectHistoryData(threads)
      wx.hideLoading()
    }).catch(err => {
      console.log('Failed to get threads', err)
      wx.hideLoading()
    })
  },

  collectHistoryData (threads) {
    var historyOrdersCount = 0
    var historyOrders = []
    for(var thread of threads) {
      if ((thread.userId == this.data.user.id || thread.eventOwnerId == this.data.user.id) && thread.historyOrders) {
        for(var order of thread.historyOrders) {
          var items = order.items.map(this.makeOrderedItemData)
          order.items = items
          order.totalPrice = this.computeTotalOrderPrice(items)
          order.timeLabel = formatTimeLong(order.timestamp)
          order.userId = thread.userId
          order.eventOwnerId = thread.eventOwnerId
          historyOrders.push(order)
        }
        historyOrdersCount += thread.historyOrders.length
      }
    }
    historyOrders.sort((a, b) => b.timestamp - a.timestamp)
    this.setData({
      historyOrdersCount: historyOrdersCount,
      historyOrders: historyOrders,
    })
  },

  makeOrderedItemData (item) {
    var priceValue = parseFloat(item.price)
    var priceLabel = formatPrice(priceValue)
    var totalPriceValue = priceValue * item.quantity
    var totalPriceLabel = formatPrice(totalPriceValue)
    return {...item, priceValue: priceValue, priceLabel: priceLabel, totalPriceValue: totalPriceValue, totalPriceLabel: totalPriceLabel}
  },

  computeTotalOrderPrice (orderedItems) {
    var sum = 0
    orderedItems.forEach(i => {
      sum += i.totalPriceValue
    })
    return {value: sum, label: formatPrice(sum)}
  },

  toggleHistory () {
    this.setData({historyOpen: !this.data.historyOpen})
  },

  openHistoryOrder (e) {
    var index = e.currentTarget.dataset.index
    app.globalData.currentHistoryOrder = this.data.historyOrders[index]
    app.globalData.userMap = this.data.userMap
    wx.navigateTo({
      url: '/pages/history-order/history-order',
    })
  },

  getUsers (userIds) {
    var that = this
    for (var userId of userIds) {
      if (!that.data.userMap[userId]) {
        httpGet('/user/get-user-info/' + userId, app).then(resp => {
          var user = resp.data
          that.setData({
            userMap: {...that.data.userMap, [user.id]: user}
          })
        })
      }
    }
  },

  getEvents (eventIds) {
    var that = this
    for (var eventId of eventIds) {
      if (!that.data.eventMap[eventId]) {
        httpGet('/event/get-event/' + eventId, app).then(resp => {
          var event = resp.data
          event.pubDate = formatDateShort(event.openedAt)
          that.setData({
            eventMap: {...that.data.eventMap, [event.id]: event}
          })
        })
      }
    }
  },

  openThread (e) {
    var thread = e.currentTarget.dataset.thread;
    app.globalData.currentEvent = this.data.eventMap[thread.eventId]
    app.globalData.currentThreadId = thread.id
    app.globalData.userMap = this.data.userMap
    this.setData({hideTab: true})
    wx.navigateTo({
      url: '/pages/thread/thread',
    })
  },

  openOrder (e) {
    var thread = e.currentTarget.dataset.thread;
    app.globalData.currentEvent = this.data.eventMap[thread.eventId]
    app.globalData.userMap = this.data.userMap
    app.globalData.currentThreadId = thread.id
    app.globalData.currentThread = thread
    this.setData({hideTab: true})
    wx.navigateTo({
      url: '/pages/order/order',
    })
  },

  openEvent (e) {
    var eventId = e.currentTarget.dataset.eventId
    app.globalData.currentEventId = eventId
    wx.navigateTo({
      url: '/pages/event/event',
    })
  },

  /**
   * Lifecycle function--Called when page hide
   */
  onHide() {

  },

  /**
   * Lifecycle function--Called when page unload
   */
  onUnload() {

  },

  /**
   * Page event handler function--Called when user drop down
   */
  onPullDownRefresh() {

  },

  /**
   * Called when page reach bottom
   */
  onReachBottom() {

  },

})
