// pages/posts/posts.js
import { formatDate, waitForUser, httpGet, httpPost } from '../../utils/util'

//获取应用实例
const app = getApp()

Page({

  /**
   * Page initial data
   */
  data: {
    events: null,
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {

  },

  getEvents() {
    var that = this
    wx.showLoading({
      title: '加载中',
    })
    httpGet('/event/get_owned_events', app).then(resp => {
      var events = resp.data.events
      for(var e of events) {
        e.viewCount = e.views ? e.views.length : 0
        e.updateDate = formatDate(e.updatedAt)
        e.tag = app.globalData.eventTypeMap[e.eventType]
      }
      events.sort((a, b) => b.updatedAt - a.updatedAt)
      that.setData({events: events})
      wx.hideLoading()
    }).catch(err => {
      console.log('get events failed', err)
      wx.hideLoading()
    })
  },
  openEvent (e) {
    var eventId = e.currentTarget.dataset.eventId
    app.globalData.currentEventId = eventId
    wx.navigateTo({
      url: '/pages/event/event',
    })
  },
  editEvent (e) {
    var eventId = e.currentTarget.dataset.eventId
    app.globalData.currentEventId = eventId
    wx.navigateTo({
      url: '/pages/edit-event/edit-event',
    })
  },
  addEvent (e) {
    var eventType = e.currentTarget.dataset.eventType
    app.globalData.currentEventType = eventType
    app.globalData.currentEventId = null
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
   * Lifecycle function--Called when page show
   */
  onShow() {
    console.log('onShow')
    var that = this
    waitForUser(app, function(){
      that.getEvents()
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
