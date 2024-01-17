//index.js
import { formatDate, waitForUser, httpGet, httpPost } from '../../utils/util'

//获取应用实例
const app = getApp()

Page({
  data: {
    events: null,
    userMap: {},
    imageMap: {},
  },
  onLoad() {
    var that = this
    waitForUser(app, function(){
      that.getEvents()
    })
  },
  getEvents() {
    var that = this
    wx.showLoading({
      title: '加载中',
    })
    httpGet('/event/get-all-events', app).then(resp => {
      var ownerIds = []
      var imageKeys = []
      var events = resp.data.events.map(e => {
        ownerIds.push(e.ownerId)
        var images = []
        for (var item of e.items) {
          if (item.images) {
            images = images.concat(item.images)
          }
        }
        e.images = images.map(i => i.key)
        for (var imageKey of e.images) {
          imageKeys.push(imageKey)
        }
        e.viewCount = e.views ? e.views.length : 0
        e.pubDate = formatDate(e.openedAt)
        e.tag = app.globalData.tagMap[e.eventType]
        return e
      })
      that.setData({
        events: events
      })

      var userPromises = ownerIds.map(userId => {
        return httpGet('/user/get-user-info/' + userId, app).then(resp => {
          var user = resp.data
          that.setData({
            userMap: {...that.data.userMap, [user.id]: user}
          })
        })
      })
      Promise.all(userPromises)
      var imagePromises = imageKeys.map(key => {
        return httpPost('/s3/get-s3-download-url', {key: key}, app).then(resp => {
          var image = resp.data
          that.setData({
            imageMap: {...that.data.imageMap, [image.key]: image.url}
          })
        })
      })
      Promise.all(imagePromises)
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
})
