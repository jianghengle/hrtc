// components/events/events.js
import { formatDate, waitForUser, httpGet, httpPost } from '../../utils/util'

//获取应用实例
const app = getApp()

function getLatLngCells(loc) {
  var lats = getClosetInts(loc.latitude)
  var lngs = getClosetInts(loc.longitude)
  var cells = []
  for(var lat of lats) {
    for(var lng of lngs) {
      cells.push([lat, lng])
    }
  }
  return cells
}

function getClosetInts(num) {
  var rounded = Math.round(num)
  return [rounded - 1, rounded]
}

Component({

  /**
   * Component properties
   */
  properties: {
    eventType: null,
    user: null,
  },

  /**
   * Component initial data
   */
  data: {
    events: null,
    userMap: {},
    imageMap: {},
    eventTypeInfo: null,
  },

  /**
   * Component methods
   */
  methods: {
    getEvents() {
      var that = this
      wx.showLoading({
        title: '加载中',
      })
      var cells = getLatLngCells(app.globalData.user.location)
      var promises = []
      var events = []
      for (var cell of cells) {
        var key = '' + cell[0] + '_' + cell[1] + '_open' 
        var promise = httpGet('/event/get_events_by_location_status/' + key, app).then(resp => {
          events = events.concat(resp.data.events)
        })
        promises.push(promise)
      }
      Promise.all(promises).then(resp => {
        var ownerIds = []
        var imageKeys = []
        var filterEvents = events.filter(e => e.eventType == that.properties.eventType)
                                 .sort((a,b) => b.openedAt - a.openedAt)
        for(var e of filterEvents) {
          ownerIds.push(e.ownerId)
          var images = []
          for (var item of e.items) {
            if (item.images && images.length < 10) {
              images = images.concat(item.images)
            }
          }
          e.images = images.map(i => i.key)
          for (var imageKey of e.images) {
            imageKeys.push(imageKey)
          }
          e.viewCount = e.views ? e.views.length : 0
          e.pubDate = formatDate(e.openedAt)
          e.tag = app.globalData.eventTypeMap[e.eventType]
        }
        that.setData({
          events: filterEvents
        })
        var userPromises = Array.from(new Set(ownerIds)).map(userId => {
          return httpGet('/user/get-user-info/' + userId, app).then(resp => {
            var user = resp.data
            that.setData({
              userMap: {...that.data.userMap, [user.id]: user}
            })
          })
        })
        Promise.all(userPromises)
        var imagePromises = Array.from(new Set(imageKeys)).map(key => {
          return httpPost('/s3/get-s3-download-url', {key: key}, app).then(resp => {
            var image = resp.data
            if (!that.data.imageMap[image.key]) {
              that.setData({
                imageMap: {...that.data.imageMap, [image.key]: image.url}
              })
            }
          })
        })
        Promise.all(imagePromises)
        wx.hideLoading()
      }).catch(err => {
        console.log('some get events failed', err)
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
      app.globalData.currentEventType = this.properties.eventType
      wx.navigateTo({
        url: '/pages/edit-event/edit-event',
      })
    },
  },
  lifetimes: {
    attached: function() {
      if (this.properties.eventType) {
        this.getEvents()
      }
    },
    detached: function() {
      this.setData({
        events: null,
        userMap: {},
        imageMap: {},
      })
    },
  },
  observers: {
    'eventType': function(eventType) {
      if (eventType) {
        this.getEvents()
        this.setData({
          eventTypeInfo: app.globalData.eventTypeMap[eventType]
        })
      }
    },
  },
})
