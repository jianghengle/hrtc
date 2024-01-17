//app.js
import { httpPost } from 'utils/util' 

App({
  onLaunch: function() {
    // 登录
    var that = this
    wx.login({
      success: res => {
        console.log('wx login')
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        const data = {
          code: res.code
        }
        httpPost('/user/wx-login', data).then(resp => {
          console.log('success', resp.data)
          var user = resp.data
          that.globalData.user = user
          if (user.nicknameNotSet) {
            wx.redirectTo({
              url: '/pages/me/me',
            })
          }
        }).catch(err => {
          console.log('fail', err)
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
    tagMap: {
      'groupBuy': {color: 'blue', text: '团购'},
      'chef': {color: 'red', text: '私厨'},
      'other': {color: 'green', text: '其他'},
    },
  }
})