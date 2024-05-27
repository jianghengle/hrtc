import { formatTime, formatTimeLong, formatDate, waitForUser, httpGet, httpPost, formatPrice } from '../../utils/utils'

const app = getApp()

// pages/event/event.js
Page({

  /**
   * Page initial data
   */
  data: {
    user: null,
    event: null,
    imageMap: {},
    imageKeys: [],
    isOwner: false,
    eventThreads: null,
    userThread: null,
    userMap: {},
    userThreadMap: {},
    itemOrdersMap: {},
    totalOrdersQuantity: 0,
    orderItemModal: {
      opened: false,
      item: null,
      thread: null,
      quantity: 0,
    },
    itemOrdersModal: {
      opened: false,
      item: null,
      orders: [],
      totalQuantity: 0,
    },
    historyOrdersCount: 0,
    historyOrders: [],
    historyOpen: false,
  },

  onShow(options) {
    var that = this
    waitForUser(app, function(){
      that.setData({
        user: app.globalData.user,
        userMap: {...that.data.userMap, [app.globalData.user.id]: app.globalData.user}
      })
      that.getEvent()
      that.getEventThreads()
    })
  },

  getEvent () {
    var that = this
    wx.showLoading({
      title: '加载中',
    })
    var images = []
    httpGet('/event/get-event/' + app.globalData.currentEventId, app).then(resp => {
      var e = resp.data
      e.items.forEach(item => {
        images = images.concat(item.images)
        if (item.price) {
          item.priceLabel = formatPrice(item.price)
        }
      })
      e.pubDate = formatDate(e.openedAt)
      e.tag = app.globalData.eventTypeMap[e.eventType]
      e.viewCount = e.views ? e.views.length : 0
      that.setData({
        event: e,
        isOwner: e.ownerId == app.globalData.user.id,
        userMap: {...that.data.userMap, [e.ownerId]: e.owner}
      })
      for (var i of images) {
        if (!that.data.imageMap[i.key]) {
          httpPost('/s3/get-s3-download-url', {key: i.key}, app).then(resp => {
            var image = resp.data
            that.setData({
              imageMap: {...that.data.imageMap, [image.key]: image.url}
            })
          })
        }
      }
      var imageKeys = images.map(i => i.key)
      that.setData({imageKeys: imageKeys})
      wx.hideLoading()
    }).catch(err => {
      console.log('get event failed', err)
      wx.hideLoading()
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

  getUserThread (threads) {
    for(var thread of threads) {
      if (thread.userId == this.data.user.id) {
        return thread
      }
    }
    return null
  },

  collectUserIds (threads) {
    var userIds = new Set()
    threads.forEach(t => {
      userIds.add(t.userId)
      userIds.add(t.eventOwnerId)
    })
    return userIds
  },

  makeUserThreadMap (threads) {
    var userThreadMap = {}
    threads.forEach(t => {
      userThreadMap[t.userId] = t
    })
    return userThreadMap
  },

  makeItemOrdersMap (threads) {
    var itemOrdersMap = {}
    threads.forEach(t => {
      if (t.orderedItems) {
        t.orderedItems.forEach(i => {
          if (!i.quantity) {
            return
          }
          var order = {...i, userId: t.userId}
          if (!itemOrdersMap[i.itemId]) {
            itemOrdersMap[i.itemId] = {
              totalQuantity: 0,
              orders: [],
            }
          }
          itemOrdersMap[i.itemId].totalQuantity += order.quantity
          itemOrdersMap[i.itemId].orders.push(order)
        })
      }
    })
    return itemOrdersMap
  },

  computeTotalOrdersQuantity(threads) {
    var quantity = 0
    threads.forEach(t => {
      quantity += t.orderedItemsQuantity
    })
    return quantity
  },

  collectHistoryData (threads) {
    var historyOrdersCount = 0
    var historyOrders = []
    for(var thread of threads) {
      if (thread.historyOrders) {
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

  getEventThreads () {
    var that = this
    httpGet('/thread/get-event-threads/' + app.globalData.currentEventId, app).then(resp => {
      var threads = resp.data.threads.map(t => that.makeThreadData(t))
      var userThread = that.getUserThread(threads)
      if (userThread) {
        that.collectHistoryData([userThread])
      } else {
        that.collectHistoryData(threads)
      }
      var userIds = that.collectUserIds(threads)
      that.getUsers(userIds)
      var userThreadMap = that.makeUserThreadMap(threads)
      var itemOrdersMap = that.makeItemOrdersMap(threads)
      var totalOrdersQuantity = that.computeTotalOrdersQuantity(threads)
      that.setData({
        eventThreads: threads,
        userThread: userThread,
        userThreadMap: userThreadMap,
        itemOrdersMap: itemOrdersMap,
        totalOrdersQuantity: totalOrdersQuantity,
      })
    }).catch(err => {
      console.log('get event threads failed', err)
      wx.hideLoading()
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

  openNewThread () {
    app.globalData.currentEvent = this.data.event
    app.globalData.currentThreadId = null
    app.globalData.userMap = this.data.userMap
    wx.navigateTo({
      url: '/pages/thread/thread',
    })
  },

  openThread (e) {
    app.globalData.currentEvent = this.data.event
    app.globalData.currentThreadId = e.currentTarget.dataset.id
    app.globalData.userMap = this.data.userMap
    wx.navigateTo({
      url: '/pages/thread/thread',
    })
  },

  editEvent () {
    wx.navigateTo({
      url: '/pages/edit-event/edit-event',
    })
  },

  openItemOrdersModal (e) {
    var item = e.currentTarget.dataset.item
    var totalQuantity = this.data.itemOrdersMap[item.id].totalQuantity
    var orders = this.data.itemOrdersMap[item.id].orders
    this.setData({
      itemOrdersModal: {
        opened: true,
        item: item,
        orders: orders,
        totalQuantity: totalQuantity,
      }
    })
  },

  hideItemOrdersModal () {
    this.setData({
      itemOrdersModal: {
        opened: false,
        item: null,
        orders: [],
      }
    })
  },

  openOrderItemModal (e) {
    if (this.data.event.status != 'open') {
      return
    }
    var item = e.currentTarget.dataset.item
    var thread = this.data.userThreadMap[this.data.user.id]
    var quantity = 0
    if (thread && thread.orderedItemMap && thread.orderedItemMap[item.id] && thread.orderedItemMap[item.id].quantity) {
      quantity = thread.orderedItemMap[item.id].quantity
    }
    this.setData({
      orderItemModal: {
        opened: true,
        item: item,
        thread: thread,
        quantity: quantity,
      }
    })
  },

  closeOrderItemModal () {
    this.setData({
      orderItemModal: {
        opened: false,
        item: null,
        thread: null,
        quantity: 0,
      }
    })
  },

  decreaseOrderQuantity () {
    var newOrderItemModal = {...this.data.orderItemModal}
    var minBuy = newOrderItemModal.item.minBuy || 1
    minBuy = parseInt(minBuy)
    if (newOrderItemModal.quantity && newOrderItemModal.quantity > 0) {
      newOrderItemModal.quantity = newOrderItemModal.quantity - 1
    } else {
      newOrderItemModal.quantity = 0
    }
    if (newOrderItemModal.quantity < minBuy) {
      newOrderItemModal.quantity = 0
    }
    this.setData({orderItemModal: newOrderItemModal})
  },

  increaseOrderQuantity () {
    var newOrderItemModal = {...this.data.orderItemModal}
    var minBuy = newOrderItemModal.item.minBuy || 1
    minBuy = parseInt(minBuy)
    if (newOrderItemModal.quantity && newOrderItemModal.quantity >= 0) {
      newOrderItemModal.quantity = newOrderItemModal.quantity + 1
      while (newOrderItemModal.quantity < minBuy) {
        newOrderItemModal.quantity = newOrderItemModal.quantity + 1
      }
    } else {
      newOrderItemModal.quantity = minBuy
    }
    this.setData({orderItemModal: newOrderItemModal})
  },

  updateOrder () {
    var threadId = null
    var orderedItemMap = {}
    if (this.data.orderItemModal.thread) {
      threadId = this.data.orderItemModal.thread.id
      orderedItemMap = {...this.data.orderItemModal.thread.orderedItemMap}
    }
    var item = this.data.orderItemModal.item
    orderedItemMap[item.id] = {
      itemId: item.id,
      title: item.title,
      price: item.price,
      quantity: this.data.orderItemModal.quantity,
      timestamp: Date.now(),
    }
    var data = {
      eventId: app.globalData.currentEventId,
      threadId: threadId,
      orderedItems: Object.values(orderedItemMap)
    }
    wx.showLoading({title: '更新中'})
    var that = this
    httpPost('/thread/update-order', data, app).then(resp => {
      that.updateThreads(resp.data)
      wx.hideLoading()
      that.closeOrderItemModal()
    }).catch(err => {
      console.log('update order failed', err)
      wx.hideLoading()
    })
  },

  updateThreads (thread) {
    var newThread = this.makeThreadData(thread)
    var newThreads = this.data.eventThreads.slice()
    var index = newThreads.findIndex(t => t.id == newThread.id)
    if (index == -1) {
      newThreads.push(newThread)
    } else {
      newThreads[index] = newThread
    }
    var userThreadMap = this.makeUserThreadMap(newThreads)
    var itemOrdersMap = this.makeItemOrdersMap(newThreads)
    this.setData({
      eventThreads: newThreads,
      userThread: newThread,
      userThreadMap: userThreadMap,
      itemOrdersMap: itemOrdersMap,
    })
  },

  openOrder (e) {
    app.globalData.currentEvent = this.data.event
    app.globalData.userMap = this.data.userMap
    var userId = e.currentTarget.dataset.userId
    var thread = this.data.userThreadMap[userId]
    app.globalData.currentThreadId = thread.id
    app.globalData.currentThread = thread
    wx.navigateTo({
      url: '/pages/order/order',
    })
  },

  /**
   * Lifecycle function--Called when page is initially rendered
   */
  onReady() {

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
    wx.stopPullDownRefresh()
    this.getEvent()
    this.getEventThreads()
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
    return {
      title: this.data.event.title,
      path: '/pages/event/event?currentEventId=' + app.globalData.currentEventId,
    }
  },

  onShareTimeline() {
    return {
      title: this.data.event.title,
      query: 'currentEventId=' + app.globalData.currentEventId,
    }
  },
})