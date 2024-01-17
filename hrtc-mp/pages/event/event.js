import { formatDate, waitForUser, httpGet, httpPost } from '../../utils/util' 

const app = getApp()

// pages/event/event.js
Page({

  /**
   * Page initial data
   */
  data: {
    event: null,
    imageMap: {},
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    var that = this
    waitForUser(app, function(){
      that.getEvent()      
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
      e.tag = app.globalData.tagMap[e.eventType]
      e.viewCount = e.views ? e.views.length : 0
      that.setData({
        event: e
      })
      var imagePromises = images.map(i => {
        return httpPost('/s3/get-s3-download-url', {key: i.key}, app).then(resp => {
          var image = resp.data
          that.setData({
            imageMap: {...that.data.imageMap, [image.key]: image.url}
          })
        })
      })
      Promise.all(imagePromises)
      wx.hideLoading()
    }).catch(err => {
      console.log('get event failed', err)
      wx.hideLoading()
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

  /**
   * Called when user click on the top right corner to share
   */
  onShareAppMessage() {

  }
})