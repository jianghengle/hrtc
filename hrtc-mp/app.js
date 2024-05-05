//app.js
import { httpPost } from 'utils/util' 

App({
  onLaunch: function(options) {
    for (const key in options.query) {
      this.globalData[key] = options.query[key]
    }
    this.init()
  },
  onShow: function(options) {
    for (const key in options.query) {
      this.globalData[key] = options.query[key]
    }
    this.init(options.query)
  },

  init (query) {
    var that = this
    if (!that.globalData.initialized) {
      that.globalData.initialized = true

      // 登录
      wx.login({
        success: res => {
          // 发送 res.code 到后台换取 openId, sessionKey, unionId
          const data = {
            code: res.code,
            query: query,
          }
          httpPost('/user/wx-login', data).then(resp => {
            var user = resp.data
            that.globalData.user = user
          }).catch(err => {
            console.log('wx-login failed', err)
          })
        }
      })

      // 获取系统状态栏信息
      wx.getSystemInfo({
        success: e => {
          that.globalData.StatusBar = e.statusBarHeight;
          let capsule = wx.getMenuButtonBoundingClientRect();
          if (capsule) {
            that.globalData.Custom = capsule;
            that.globalData.CustomBar = capsule.bottom + capsule.top - e.statusBarHeight;
          } else {
            that.globalData.CustomBar = e.statusBarHeight + 50;
          }
        }
      })
    }
  },

  globalData: {
    initialized: false,
    user: null,
    currentEventId: null,
    currentEventType: null,
    eventTypeMap: {
      'groupBuy': {color: 'blue', text: '同购', addButton: '发起新团购'},
      'chef': {color: 'green', text: '私厨', addButton: '发布新私厨'},
    },
    currentEvent: null,
    missingChats: 0,
  }
})
