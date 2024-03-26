// pages/me/me.js
import { waitForUser, httpGet, httpPost, uploadFile, formatDate } from '../../utils/util' 

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
    location: {},
    events: null,
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
          title: '请完善资料',
          icon: 'error',
          duration: 2000
        })
      }
      that.setData({
        userId: app.globalData.user.id,
        nickname: nickname == defaultNickname ? '' : nickname,
        avatar: app.globalData.user.avatar,
        avatarUrl: app.globalData.user.avatarUrl,
        location: app.globalData.user.location,
      })
      if (nickname == defaultNickname) {
        that.checkAndGetLocation()
      }
    })
  },

  checkAndGetLocation() {
    var that = this
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.userFuzzyLocation']) {
          wx.authorize({
            scope: 'scope.userFuzzyLocation',
            success () {
              that.getFuzzyLocation()
            }
          })
        } else {
          that.getFuzzyLocation()
        }
      }
    })
  },

  getFuzzyLocation() {
    var that = this
    wx.getFuzzyLocation({
      type: 'wgs84',
      success (res) {
        that.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        })
      }
    })
  },

  mapCenterChanged (event) {
    console.log('mapCenterChanged', event)
    if (event.causedBy == 'drag' && event.type == 'end') {
      var center = event.detail.centerLocation
      this.setData({location: center})
    }
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
      nickname: this.data.nickname,
      location: this.data.location,
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
      app.globalData.user.location = that.data.location
      app.globalData.user.nicknameNotSet = false
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: '更新失败',
        icon: 'error',
        duration: 2000
      })
    })
  },

  openPosts () {
    wx.navigateTo({
      url: '/pages/posts/posts',
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

})
