//app.js
import { httpPost } from 'utils/util' 

App({
  onLaunch: function(options) {
    console.log('onLaunch', options)
    for (const key in options.query) {
      this.globalData[key] = options.query[key]
    }
    console.log('globalData', this.globalData)
    // 登录
    var that = this
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        const data = {
          code: res.code
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
        this.globalData.StatusBar = e.statusBarHeight;
        let capsule = wx.getMenuButtonBoundingClientRect();
        if (capsule) {
         	this.globalData.Custom = capsule;
        	this.globalData.CustomBar = capsule.bottom + capsule.top - e.statusBarHeight;
        } else {
        	this.globalData.CustomBar = e.statusBarHeight + 50;
        }
      }
    })
  },
  globalData: {
    user: null,
    currentEventId: null,
    currentEventType: null,
    eventTypeMap: {
      'groupBuy': {color: 'blue', text: '团购', addButton: '发起新团购'},
      'chef': {color: 'green', text: '私厨', addButton: '发布新私厨'},
    },
    currentEvent: null,
    missingChats: 0,
  }
})
