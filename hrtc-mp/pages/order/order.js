// pages/order/order.js
import { formatTimeLong, formatPrice, httpGet, httpPost, formatTime } from '../../utils/utils' 

const app = getApp()

Page({

  /**
   * Page initial data
   */
  data: {
    event: null,
    isOwner: false,
    eventOpen: false,
    userMap: {},
    imageMap: {},
    imageKeys: [],
    thread: null,
    orderedItems: [],
    totalOrderPrice: {
      value: 0,
      label: '$0.00',
    },
    latestChat: null,
    missingCount: 0,
    noteText: '',
    archiveOrderModal: {
      opened: false,
    },
    historyOrdersCount: 0,
    historyOrders: [],
    historyOpen: false, 
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    var orderedItems = app.globalData.currentThread.orderedItems.map(this.makeOrderedItemData)
    var totalOrderPrice = this.computeTotalOrderPrice(orderedItems) 
    this.setData({
      event: JSON.parse(JSON.stringify(app.globalData.currentEvent)),
      isOwner: app.globalData.currentEvent.ownerId == app.globalData.user.id,
      userMap: JSON.parse(JSON.stringify(app.globalData.userMap)),
      thread: JSON.parse(JSON.stringify(app.globalData.currentThread)),
      orderedItems: orderedItems,
      totalOrderPrice: totalOrderPrice,
      noteText: app.globalData.currentThread.note,
    })
  },

  computeTotalOrderPrice (orderedItems) {
    var sum = 0
    orderedItems.forEach(i => {
      sum += i.totalPriceValue
    })
    return {value: sum, label: formatPrice(sum)}
  },

  makeOrderedItemData (item) {
    var priceValue = parseFloat(item.price)
    var priceLabel = formatPrice(priceValue)
    var totalPriceValue = priceValue * item.quantity
    var totalPriceLabel = formatPrice(totalPriceValue)
    return {...item, priceValue: priceValue, priceLabel: priceLabel, totalPriceValue: totalPriceValue, totalPriceLabel: totalPriceLabel}
  },

  increaseQuantity (e) {
    var index = e.currentTarget.dataset.itemIndex
    var newOrderedItems = this.data.orderedItems.slice()
    var item = newOrderedItems[index]
    var minBuy = item.minBuy || 1
    minBuy = parseInt(minBuy) 
    item.quantity += 1
    while (item.quantity < minBuy) {
      item.quantity += 1
    }
    var newItem = this.makeOrderedItemData(item)
    newOrderedItems[index] = newItem
    var newTotalOrderPrice = this.computeTotalOrderPrice(newOrderedItems)
    this.setData({
      orderedItems: newOrderedItems,
      totalOrderPrice: newTotalOrderPrice
    })
  },

  decreaseQuantity (e) {
    var index = e.currentTarget.dataset.itemIndex
    var newOrderedItems = this.data.orderedItems.slice()
    var item = newOrderedItems[index]
    if (item.quantity > 0) {
      item.quantity -= 1
    }
    console.log('decreaseQuantity', item)
    var minBuy = item.minBuy || 1
    minBuy = parseInt(minBuy) 
    if (item.quantity < minBuy) {
      item.quantity = 0
    }
    var newItem = this.makeOrderedItemData(item)
    newOrderedItems[index] = newItem
    var newTotalOrderPrice = this.computeTotalOrderPrice(newOrderedItems)
    this.setData({
      orderedItems: newOrderedItems,
      totalOrderPrice: newTotalOrderPrice
    })
  },

  updateOrder () {
    var timestamp = Date.now()
    var orderedItems = this.data.orderedItems.map(i => {
      return {
        itemId: i.itemId,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        timestamp: timestamp,
      }
    })
    var data = {
      eventId: this.data.event.id,
      threadId: this.data.thread.id,
      orderedItems: orderedItems
    }
    wx.showLoading({title: '更新中'})
    var that = this
    httpPost('/thread/update-order', data, app).then(resp => {
      that.getThread()
      wx.hideLoading()
    }).catch(err => {
      console.log('update order failed', err)
      wx.hideLoading()
    })
  },

  updateNote () {
    var data = {threadId: this.data.thread.id, note: this.data.noteText}
    httpPost('/thread/update-note', data, app)
  },

  toggleEvent () {
    if (!this.data.eventOpen) {
      this.getImages()
      this.setData({
        eventOpen: true
      })
    } else {
      this.setData({
        eventOpen: false
      })
    }
  },

  getImages () {
    var e = this.data.event
    var images = []
    var that = this
    for (var item of e.items) {
      images = images.concat(item.images)
    }
    for (var i of images) {
      if (!this.data.imageMap[i.key]) {
        httpPost('/s3/get-s3-download-url', {key: i.key}, app).then(resp => {
          var img = resp.data
          that.setData({
            imageMap: {...that.data.imageMap, [img.key]: img.url}
          })
        })
      }
    }
    var imageKeys = images.map(i => i.key)
    that.setData({imageKeys: imageKeys})
  },

  openThread () {
    app.globalData.currentThreadId = this.data.thread.id
    wx.navigateTo({
      url: '/pages/thread/thread',
    })
  },

  getThread () {
    var that = this
    httpGet('/thread/get-thread-simple/' + app.globalData.currentThreadId, app).then(resp => {
      var thread = that.makeThreadData(resp.data)
      var orderedItems = thread.orderedItems.map(that.makeOrderedItemData)
      var totalOrderPrice = that.computeTotalOrderPrice(orderedItems) 
      var userMissingCount = thread.chatCount - thread.userCount
      var eventOwnerMissingCount = thread.chatCount - thread.eventOwnerCount
      var latestChat = thread.latestChat
      latestChat.timeLabel = formatTime(latestChat.timestamp)
      that.setData({
        thread: thread,
        orderedItems: orderedItems,
        totalOrderPrice: totalOrderPrice,
        missingCount: that.data.isOwner ? eventOwnerMissingCount : userMissingCount,
        latestChat: thread.latestChat,
        noteText: thread.note,
      })
      that.collectHistoryData(thread)
    })
  },

  makeThreadData (thread) {
    var t = {...thread}
    t.latestChat.timeLabel = formatTime(t.latestChat.timestamp)
    t.missingCount = t.eventOwnerId == app.globalData.user.id ? (t.chatCount - t.eventOwnerCount) : (t.chatCount - t.userCount);
    if (!t.orderedItems) {
      t.orderedItems = []
      t.orderedItemsQuantity = 0
    } else {
      var orderedItemsQuantity = 0
      t.orderedItems.forEach(i => {
        i.priceLabel = formatPrice(i.price)
        orderedItemsQuantity += i.quantity
      })
      t.orderedItemsQuantity = orderedItemsQuantity
    }
    var orderedItemMap = {}
    if (t.orderedItems) {
      t.orderedItems.forEach(i => {
        orderedItemMap[i.itemId] = i
      })
    }
    t.orderedItemMap = orderedItemMap
    return t
  },

  collectHistoryData (thread) {
    var historyOrdersCount = 0
    var historyOrders = []
    if (thread.historyOrders) {
      historyOrdersCount = thread.historyOrders.length
      for(var order of thread.historyOrders) {
        var items = order.items.map(this.makeOrderedItemData)
        order.items = items
        order.totalPrice = this.computeTotalOrderPrice(items)
        order.timeLabel = formatTimeLong(order.timestamp)
        order.userId = thread.userId
        order.eventOwnerId = thread.eventOwnerId
        historyOrders.unshift(order)
      }
    }
    this.setData({
      historyOrdersCount: historyOrdersCount,
      historyOrders: historyOrders,
    })
  },

  openArchiveOrderModal () {
    this.setData({
      archiveOrderModal: {
        opened: true,
      }
    })
  },

  closeArchiveOrderModal () {
    this.setData({
      archiveOrderModal: {
        opened: false,
      }
    })
  },

  archiveOrder () {
    var data = {
      eventId: this.data.event.id,
      threadId: this.data.thread.id,
    }
    wx.showLoading({title: '归档中'})
    var that = this
    httpPost('/thread/archive-order', data, app).then(resp => {
      wx.hideLoading()
      that.getThread()
      that.closeArchiveOrderModal()
    }).catch(err => {
      console.log('archive order failed', err)
      wx.hideLoading()
    })
  },

  toggleHistory () {
    this.setData({historyOpen: !this.data.historyOpen})
  },

  openHistoryOrder (e) {
    var index = e.currentTarget.dataset.index
    app.globalData.currentHistoryOrder = this.data.historyOrders[index]
    wx.navigateTo({
      url: '/pages/history-order/history-order',
    })
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
    this.getThread()
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

  /**
   * Called when user click on the top right corner to share
   */
  onShareAppMessage() {

  }
})