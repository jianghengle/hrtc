import { httpGet } from '../../utils/util'

//获取应用实例
const app = getApp()

// components/tabbar/tabbar.js
Component({

  /**
   * Component properties
   */
  properties: {
    selected: 0,
  },

  /**
   * Component initial data
   */
  data: {
    list: [
      {
        pagePath: "/pages/index/index",
        iconPath: "/images/tabbar/plugin.png",
        selectedIconPath: "/images/tabbar/plugin_cur.png",
        text: "团购"
      },
      {
        pagePath: "/pages/chefs/chefs",
        iconPath: "/images/tabbar/basics.png",
        selectedIconPath: "/images/tabbar/basics_cur.png",
        text: "私厨"
      },
      {
        pagePath: "/pages/threads/threads",
        iconPath: "/images/tabbar/component.png",
        selectedIconPath: "/images/tabbar/component_cur.png",
        text: "对话",
        tag: 0,
      },
      {
        pagePath: "/pages/me/me",
        iconPath: "/images/tabbar/about.png",
        selectedIconPath: "/images/tabbar/about_cur.png",
        text: "我的"
      },
    ],
    threadsChecker: null,
  },

  /**
   * Component methods
   */
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset
      const url = data.path
      wx.redirectTo({
        url: url,
      })
    },
    checkThreads () {
      console.log('check threads')
      if (!app.globalData.user) {
        return
      }
      var that = this
      httpGet('/thread/get-threads', app).then(resp => {
        var missingChats = 0
        for (var thread of resp.data.threads) {
          var missingCount = (thread.eventOwnerId == app.globalData.user.id) ? (thread.chatCount - thread.eventOwnerCount) : (thread.chatCount - thread.userCount)
          if (missingCount > 0) {
            missingChats += missingCount
          }
        }
        that.setData({
          'list[2].tag': missingChats,
        })
        app.globalData.missingChats = missingChats
      }).catch(err => {
        console.log('Failed to get threads to check')
      })
    },
  },

  lifetimes: {
    attached: function() {
      this.setData({
        'list[2].tag': app.globalData.missingChats,
      })
      if (!this.data.threadsChecker) {
        var that = this
        var threadsChecker = setInterval(() => {
          that.checkThreads()
        }, 60000)
        that.setData({threadsChecker: threadsChecker})
      }
    },
    detached: function() {
      console.log('tab detached')
      if (this.data.threadsChecker) {
        clearInterval(this.data.threadsChecker)
        this.setData({threadsChecker: null})
      }
    },
  },
})
