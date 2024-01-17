// pages/me/me.js
import { waitForUser, httpPost, uploadFile, downloadFile } from '../../utils/util' 

const app = getApp()
const defaultNickname = '微信用户'

Page({

  /**
   * Page initial data
   */
  data: {
    userId: null,
    nickname: '',
    avatar: null,
    avatarUrl: null,
    avatarChanged: false,
  },

  onChooseAvatar(e) {
    this.setData({
      avatarUrl: e.detail.avatarUrl,
      avatarChanged: true,
    })
  },


  /**
   * Lifecycle function--Called when page load
   */
  onLoad(options) {
    var that = this
    waitForUser(app, function(){
      const nickname = app.globalData.user.nickname
      if (nickname == defaultNickname) {
        wx.showToast({
          title: '请输入昵称',
          icon: 'error',
          duration: 2000
        })
      }
      that.setData({
        userId: app.globalData.user.id,
        nickname: nickname == defaultNickname ? '' : nickname,
        avatar: app.globalData.user.avatar,
        avatarUrl: app.globalData.user.avatarUrl,
      })
    })
  },

  submit() {
    if (!this.data.nickname) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'error',
        duration: 2000
      })
    }
    const data = {
      nickname: this.data.nickname
    }
    if (!this.data.avatarChanged) {
      this.update(data)
    } else {
      var that = this
      wx.showLoading({
        title: '上传中',
      })
      uploadFile(that.data.avatarUrl, app).then(resp => {
        data.avatar = {
          source: 's3',
          bucket: resp.bucket,
          key: resp.key
        }
        wx.hideLoading()
        that.update(data)
      }).catch(err => {
        wx.hideLoading()
        console.log('uploadFile failed')
      })
    }
  },

  update(data) {
    wx.showLoading({
      title: '更新中',
    })
    var that = this
    httpPost('/user/update', data, app).then(resp => {
      wx.hideLoading()
      wx.showToast({
        title: '更新成功',
        icon: 'success',
        duration: 2000
      })
      app.globalData.user.nickname = data.nickname
      app.globalData.user.avatarUrl = that.data.avatarUrl
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: '更新失败',
        icon: 'error',
        duration: 2000
      })
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