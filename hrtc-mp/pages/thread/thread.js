// pages/thread/thread.js
import { formatDate, uploadFile, httpGet, httpPost, formatTime } from '../../utils/util' 

const app = getApp()

const recorderManager = wx.getRecorderManager()

Page({

  /**
   * Page initial data
   */
  data: {
    event: null,
    isOwner: false,
    eventOpen: false,
    imageMap: {},
    imageKeys: [],
    inputHeight: 40,
    chats: [],
    userMap: {},
    chatCount: 0,
    threadId: null,
    inputText: '',
    scrollTop: 9999,
    chatImageMap: {},
    chatImageKeys: [],
    recording: false,
    chatPuller: null,
    timestampPuller: null,
    eventOutdated: false,
    keyboardHeight: 0,
  },

  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    this.setData({
      event: JSON.parse(JSON.stringify(app.globalData.currentEvent)),
      isOwner: app.globalData.currentEvent.ownerId == app.globalData.user.id,
      userMap: JSON.parse(JSON.stringify(app.globalData.userMap)),
      threadId: app.globalData.currentThreadId,
    })
    if (app.globalData.currentThreadId) {
      var that = this
      wx.showLoading({
        title: '加载中',
      })
      httpGet('/thread/get-thread/' + app.globalData.currentThreadId, app).then(resp => {
        var thread = resp.data
        var chats = thread.chats
        var chatImageKeys = []
        for(var chat of chats) {
          if (chat.type == 'image') {
            chatImageKeys.push(chat.key)
            httpPost('/s3/get-s3-download-url', {key: chat.key}, app).then(resp => {
              var image = resp.data
              that.setData({
                chatImageMap: {...that.data.chatImageMap, [image.key]: image.url}
              })
            })
          }
        }
        that.addTimeLabels(chats)
        var chatCount = that.data.isOwner ? thread.eventOwnerCount : thread.userCount
        that.setData({
          chats: chats,
          chatCount: chatCount,
          chatImageKeys: chatImageKeys,
        })
        that.scrollToBottom()
        that.startPullingChats()
        wx.hideLoading()
      }).catch(err => {
        console.log('get thread failed', err)
        wx.hideLoading()
      })
    }
    if (app.globalData.currentEvent.ownerId != app.globalData.user.id) {
      this.startPullingTimestamp()
    }
  },

  toggleEvent () {
    if (!this.data.eventOpen) {
      this.getImages()
      this.setData({
        eventOpen: true
      })
    } else {
      this.setData({
        eventOpen: false
      })
    }
  },

  getImages () {
    var e = this.data.event
    var images = []
    var that = this
    for (var item of e.items) {
      images = images.concat(item.images)
    }
    for (var i of images) {
      if (!this.data.imageMap[i.key]) {
        httpPost('/s3/get-s3-download-url', {key: i.key}, app).then(resp => {
          var img = resp.data
          that.setData({
            imageMap: {...that.data.imageMap, [img.key]: img.url}
          })
        })
      }
    }
    var imageKeys = images.map(i => i.key)
    that.setData({imageKeys: imageKeys})
  },

  inputLineChanged (e) {
    var height = (e.detail.lineCount + 1) * 30 + 10
    this.setData({inputHeight: height})
  },

  submitTextChat (e) {
    if (e.detail.value.chatText.trim()) {
      var chat = {
        type: 'text',
        content: e.detail.value.chatText,
        timestamp: Date.now(),
      }
      this.submitChat(chat)
    }
  },

  submitChat (chat) {
    var data = {
      eventId: app.globalData.currentEventId,
      threadId: app.globalData.currentThreadId,
      chat: chat,
    }
    var that = this
    httpPost('/thread/submit-chat', data, app).then(resp => {
      var threadId = resp.data.threadId
      app.globalData.currentThreadId = threadId
      var newData = {threadId: threadId}
      if (chat.type == 'text') {
        newData.inputText = ''
      }
      that.setData(newData)
      that.getNewChats()
    }).catch(err => {
      console.log('submit chat failed')
    })
  },

  inputConfirmed (e) {
    if (e.detail.value.trim()) {
      var chat = {
        type: 'text',
        content: e.detail.value,
        timestamp: Date.now(),
      }
      this.submitChat(chat)
    }
  },

  keyboardHeightChanged (e) {
    var that = this
    this.setData(
      {keyboardHeight: e.detail.height}
    , () => {
      that.scrollToBottom()
    })
  },

  getNewChats () {
    var data = {
      threadId: this.data.threadId,
      chatCount: this.data.chatCount,
    }
    var that = this
    httpPost('/thread/get-new-chats', data, app).then(resp => {
      if (resp.data.chatCount > that.data.chatCount) {
        var chats = resp.data.newChats.slice(that.data.chatCount - resp.data.chatCount)
        var newChatImageKeys = that.data.chatImageKeys.slice()
        for(var chat of chats) {
          if (chat.type == 'image') {
            newChatImageKeys.push(chat.key)
            httpPost('/s3/get-s3-download-url', {key: chat.key}, app).then(resp => {
              var image = resp.data
              that.setData({
                chatImageMap: {...that.data.chatImageMap, [image.key]: image.url}
              })
            })
          }
        }
        var newChats = that.data.chats.concat(chats)
        that.addTimeLabels (newChats)
        that.setData({
          chats: newChats,
          chatImageKeys: newChatImageKeys,
          chatCount: resp.data.chatCount,
        })
        that.scrollToBottom()
      }
    }).catch(err => {
      console.log('get new chats failed')
    })
  },

  addTimeLabels (chats) {
    for (var i=chats.length-1;i>=0;i--) {
      chats[i].timeLabel = formatTime(chats[i].timestamp)
    }
    for (var i=chats.length-1;i>=0;i--) {
      if (i > 0) {
        var preLabel = chats[i-1].timeLabel.split(' ')
        var thisLabel = chats[i].timeLabel.split(' ')
        if (preLabel[0] == thisLabel[0]) {
          chats[i].timeLabel = thisLabel[1]
        }
      }
    }
  },

  scrollToBottom () {
    this.setData({scrollTop: 9999})
  },

  startPullingChats () {
    if (!this.data.chatPuller) {
      var that = this
      var chatPuller = setInterval(() => {
        that.getNewChats()
      }, 5000)
      that.setData({chatPuller: chatPuller})
    }
  },

  stopPullingChats () {
    if (this.data.chatPuller) {
      clearInterval(this.data.chatPuller)
      this.setData({chatPuller: null})
    }
  },

  chooseImage () {
    var that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album','camera'],
      success(res){
        if (res.tempFiles && res.tempFiles.length) {
          var path = res.tempFiles[0].tempFilePath
          wx.showLoading({title: '上传中'})
          uploadFile(path, app).then(resp => {
            var chat = {
              type: 'image',
              source: 's3',
              key: resp.key,
              timestamp: Date.now(),
            }
            that.submitChat(chat)
            var newChatImageKeys = that.data.chatImageKeys.slice()
            newChatImageKeys.push(resp.key)
            that.setData({chatImageKeys: newChatImageKeys})
            httpPost('/s3/get-s3-download-url', {key: resp.key}, app).then(resp => {
              var image = resp.data
              that.setData({
                chatImageMap: {...that.data.chatImageMap, [image.key]: image.url}
              })
            })
            wx.hideLoading()
          }).catch(err => {
            wx.hideLoading()
            console.log('uploadFile failed')
          })
        }
      }
    })
  },

  startRecord () {
    if (this.data.recording) {
      return
    }
    this.setData({recording: true})
    wx.showLoading({title: '录音中'})
    var that = this
    recorderManager.onError((res) => {
      wx.showLoading({title: '录音失败了！'})
      setTimeout(() => {
        that.setData({recording: false})
        wx.hideLoading()
      }, 3000)
    })

    recorderManager.onStop((res) => {
      wx.hideLoading()
      const { tempFilePath, duration } = res
      if (tempFilePath) {
        uploadFile(tempFilePath, app).then(resp => {
          var chat = {
            type: 'audio',
            source: 's3',
            key: resp.key,
            duration: duration,
            timestamp: Date.now(),
          }
          that.submitChat(chat)
          
          wx.hideLoading()
        }).catch(err => {
          wx.hideLoading()
          console.log('uploadFile failed')
        })
      }
    })
    const options = {
      duration: 10000,
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'aac',
      frameSize: 50
    }
    recorderManager.start(options)
  },
  stopRecord: function () {
    if (!this.data.recording) {
      return
    }
    recorderManager.stop()
    this.setData({recording: false})
    wx.hideLoading()
  },

  getEventTimestamp () {
    var that = this
    httpGet('/event/get-event-timestamp/' + that.data.event.id, app).then(resp => {
      var timestamp = resp.data.timestamp
      if (timestamp > that.data.event.updatedAt) {
        that.setData({eventOutdated: true})
      }
    })
  },

  startPullingTimestamp () {
    if (!this.data.timestampPuller) {
      var that = this
      var timestampPuller = setInterval(() => {
        that.getEventTimestamp()
      }, 30000)
      that.setData({timestampPuller: timestampPuller})
    }
  },

  stopPullingTimestamp () {
    if (this.data.timestampPuller) {
      clearInterval(this.data.timestampPuller)
      this.setData({timestampPuller: null})
    }
  },

  getEvent () {
    var that = this
    httpGet('/event/get-event/' + app.globalData.currentEventId, app).then(resp => {
      var e = resp.data
      e.pubDate = formatDate(e.openedAt)
      e.tag = app.globalData.eventTypeMap[e.eventType]
      e.viewCount = e.views ? e.views.length : 0
      that.setData({
        event: e,
        eventOutdated: false,
      })
      if (that.data.eventOpen) {
        that.getImages()
      }
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
    this.stopPullingChats()
    this.stopPullingTimestamp()
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