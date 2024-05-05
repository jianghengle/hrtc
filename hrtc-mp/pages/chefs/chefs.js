// pages/chefs/chefs.js
import { waitForUser } from '../../utils/util'

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
      that.setData({
        user: app.globalData.user,
        eventType: 'chef',
      })
    })
  },
  onShareAppMessage() {
    return {
      title: 'GroupGo',
      path: '/pages/chefs/chefs',
    }
  },
  onShareTimeline(){
    return {
      title: 'GroupGo',
    }
  },
})
