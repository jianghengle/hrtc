import { httpGet, waitForUser } from '../../utils/utils'

//获取应用实例
const app = getApp()

// components/tabbar/tabbar.js
Component({

  /**
   * Component properties
   */
  properties: {
    selected: 0,
    hideTab: false,
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
        text: "同购"
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
        text: "订单",
        tag: 0,
        hidden: true,
      },
      {
        pagePath: "/pages/me/me",
        iconPath: "/images/tabbar/about.png",
        selectedIconPath: "/images/tabbar/about_cur.png",
        text: "我的"
      },
    ],
    threadsChecker: null,
    lastHideTab: false,
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
      if (!app.globalData.user) {
        return
      }
      var that = this
      httpGet('/thread/get-threads', app).then(resp => {
        var missingChats = 0
        for (var thread of resp.data.threads) {
          var missingCount = (thread.eventOwnerId == app.globalData.user.id) ? (thread.chatCount - thread.eventOwnerCount) : (thread.chatCount - thread.userCount)
          if (missingCount > 0 && thread.orderedItems && thread.orderedItems.length) {
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
      var that = this
      waitForUser(app, function(){
        if (!app.globalData.user.isolated) {
          that.setData({
            'list[2].hidden': false,
          })
        }
        that.checkThreads()
        if (!that.data.threadsChecker) {
          var threadsChecker = setInterval(() => {
            that.checkThreads()
          }, 60000)
          that.setData({threadsChecker: threadsChecker})
        }
      })
    },
    detached: function() {
      if (this.data.threadsChecker) {
        clearInterval(this.data.threadsChecker)
        this.setData({threadsChecker: null})
      }
    },
  },
  observers: {
    'hideTab': function(hideTab) {
      if (this.data.lastHideTab && !hideTab) {
        this.checkThreads()
      }
      this.setData({lastHideTab: hideTab})
    },
  },
})
