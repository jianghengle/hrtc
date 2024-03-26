// pages/threads/threads.js
import { formatDateShort, formatTime, waitForUser, httpGet } from '../../utils/util'

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
        if (!eventIds.includes(thread.eventId)) {
          eventIds.push(thread.eventId)
        }
        if (thread.eventOwnerId == that.data.user.id) {
          if (!ownedEventMap[thread.eventId]) {
            ownedEventMap[thread.eventId] = []
            eventThreadsMap[thread.eventId] = []
          }
          if (!userIds.includes(thread.userId)) {
            userIds.push(thread.userId)
          }
          ownedEventMap[thread.eventId].push(thread)
          eventThreadsMap[thread.eventId].push(thread)
        } else {
          if (!userIds.includes(thread.eventOwnerId)) {
            userIds.push(thread.eventOwnerId)
          }
          eventThreadsMap[thread.eventId] = [thread]
        }
      }
      that.getUsers(userIds)
      that.getEvents(eventIds)
      that.setData({
        eventIds: eventIds,
        ownedEventMap: ownedEventMap,
        eventThreadsMap: eventThreadsMap,
      })
      wx.hideLoading()
    }).catch(err => {
      console.log('Failed to get threads')
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
    wx.navigateTo({
      url: '/pages/thread/thread',
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
