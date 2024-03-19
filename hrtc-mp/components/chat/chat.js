// components/chat/chat.js
import { downloadFile } from '../../utils/util'

const app = getApp()

Component({

  /**
   * Component properties
   */
  properties: {
    chat: null,
    userMap: {},
    chatImageMap: {},
    chatImageKeys: [],
  },

  /**
   * Component initial data
   */
  data: {
    eventOwnerId: null,
    audioDuration: null,
    audioUrl: null,
    playingAudio: false,
  },

  /**
   * Component methods
   */
  methods: {
    previewImage () {
      var that = this
      var src = this.properties.chatImageMap[this.properties.chat.key]
      var urls = this.properties.chatImageKeys.map(k => that.properties.chatImageMap[k])
      wx.previewImage({
        current: src,
        urls: urls,
      })
    },
    toggleAudio () {
      var that = this
      wx.onBackgroundAudioStop(() => {
        that.setData({playingAudio: false})
      })
      if (that.data.playingAudio) {
        wx.pauseBackgroundAudio()
        that.setData({playingAudio: false})
      } else {
        if (that.data.audioUrl) {
          wx.playBackgroundAudio({dataUrl: that.data.audioUrl})
          that.setData({playingAudio: true})
        } else {
          wx.showLoading({title: '下载中'})
          downloadFile(that.properties.chat.key, app).then(tempUrl => {
            wx.playBackgroundAudio({
              dataUrl: tempUrl
            })
            that.setData({
              audioUrl: tempUrl,
              playingAudio: true,
            })
            wx.hideLoading()
          }).catch(err => {
            wx.hideLoading()
          })
        }
      }
    },
  },

  lifetimes: {
    attached: function() {
      this.setData({
        isEventOwner: app.globalData.currentEvent.ownerId == app.globalData.user.id,
        isChatOwner: this.properties.chat.userId == app.globalData.user.id,
        isChatOwnerEventOwner: this.properties.chat.userId == app.globalData.currentEvent.ownerId,
      })
      if (this.properties.chat.type == 'audio') {
        this.setData({audioDuration: Math.round(this.properties.chat.duration / 1000)})
      }
    },
  },

  observers: {
    'chat': function(chat) {
      this.setData({
        isChatOwner: this.properties.chat.userId == app.globalData.user.id,
        isChatOwnerEventOwner: this.properties.chat.userId == app.globalData.currentEvent.ownerId,
      })
    },
  },
})