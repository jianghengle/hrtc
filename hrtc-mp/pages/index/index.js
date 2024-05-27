//index.js
import { waitForUser } from '../../utils/utils'

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
        eventType: 'groupBuy',
      })
    })
  },
  onShareAppMessage() {
    return {
      title: 'GroupGo',
      path: '/pages/index/index',
    }
  },
  onShareTimeline(){
    return {
      title: 'GroupGo',
    }
  },
})
