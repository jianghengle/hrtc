// pages/chefs/chefs.js
import { waitForUser, checkUser } from '../../utils/util'

//获取应用实例
const app = getApp()

Page({
  data: {
    user: null,
    eventType: null,
  },
  onShow() {
    var that = this
    waitForUser(app, function(){
      checkUser(app.globalData.user)
      that.setData({
        user: app.globalData.user,
        eventType: 'chef',
      })
    })
  },
  onShareAppMessage() {
    return {
      title: '华人同城',
      path: '/pages/chefs/chefs',
    }
  },
  onShareTimeline(){
    return {
      title: '华人同城',
    }
  },
})
