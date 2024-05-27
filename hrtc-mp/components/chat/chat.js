// components/chat/chat.js
import { httpPost } from '../../utils/utils'

const app = getApp()
const audioManager = wx.getBackgroundAudioManager()

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
    playAudio () {
      var that = this
      if (that.data.audioUrl) {
        audioManager.title = '播放 ' + that.data.audioDuration + '秒'
        audioManager.src = that.data.audioUrl
      } else {
        wx.showLoading({title: '下载中'})
        httpPost('/s3/get-s3-download-url', {
          key: that.properties.chat.key
        }, app).then(resp => {
          that.setData({
            audioUrl: resp.data.url
          })
          audioManager.title = '播放音频' + that.data.audioDuration + '秒'
          audioManager.src = resp.data.url
          wx.hideLoading()
        }).catch(err => {
          console.log('failed to download audio')
          wx.hideLoading()
        })
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
        this.setData({
          audioDuration: Math.round(this.properties.chat.duration / 1000),
        })
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
