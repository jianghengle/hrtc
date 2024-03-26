// pages/edit-event/edit-event.js
import { formatDate, waitForUser, httpGet, httpPost } from '../../utils/util' 

const app = getApp()

Page({

  /**
   * Page initial data
   */
  data: {
    event: null,
    imageMap: {},
    imageKeys: [],
    eventTypeInfo: null,
    nickName: {
      value: 'test',
    },
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    var that = this
    waitForUser(app, function(){
      if (app.globalData.currentEventId) {
        that.getEvent()
      } else {
        that.makeNewEvent()
      }
    })
  },

  makeNewEvent () {
    var eventType = app.globalData.currentEventType
    var eventTypeInfo = app.globalData.eventTypeMap[eventType]
    var event = {
      title: '新' + eventTypeInfo.text,
      description: '',
      eventType: eventType,
      items: [],
      status: 'open',
    }
    this.setData({
      event: event,
      eventTypeInfo: eventTypeInfo
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
        eventTypeInfo: app.globalData.eventTypeMap[e.eventType]
      })
      var imagePromises = images.map(i => {
        return httpPost('/s3/get-s3-download-url', {key: i.key}, app).then(resp => {
          var image = resp.data
          that.setData({
            imageMap: {...that.data.imageMap, [image.key]: image.url}
          })
        })
      })
      var imageKeys = images.map(i => i.key)
      that.setData({imageKeys: imageKeys})
      Promise.all(imagePromises)
      wx.hideLoading()
    }).catch(err => {
      console.log('get event failed', err)
      wx.hideLoading()
    })
  },

  imageAdded (e) {
    var that = this
    httpPost('/s3/get-s3-download-url', {key: e.detail.key}, app).then(resp => {
      var image = resp.data
      that.setData({
        imageMap: {...that.data.imageMap, [image.key]: image.url}
      })
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