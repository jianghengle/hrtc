import { formatTime, formatDate, waitForUser, httpGet, httpPost } from '../../utils/util' 

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
    userMap: {},
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
      for (var item of e.items) {
        images = images.concat(item.images)
      }
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

  getEventThreads () {
    var that = this
    httpGet('/thread/get-event-threads/' + app.globalData.currentEventId, app).then(resp => {
      var userIds = new Set()
      var threads = resp.data.threads.map(t => {
        t.latestChat.timeLabel = formatTime(t.latestChat.timestamp)
        t.missingCount = t.eventOwnerId == app.globalData.user.id ? (t.chatCount - t.eventOwnerCount) : (t.chatCount - t.userCount);
        userIds.add(t.userId)
        userIds.add(t.eventOwnerId)
        return t
      })
      that.getUsers(userIds)
      that.setData({eventThreads: threads})
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