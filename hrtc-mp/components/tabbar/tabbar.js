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
        iconPath: "/images/tabbar/basics.png",
        selectedIconPath: "/images/tabbar/basics_cur.png",
        text: "附近"
      },
      {
        pagePath: "/pages/me/me",
        iconPath: "/images/tabbar/about.png",
        selectedIconPath: "/images/tabbar/about_cur.png",
        text: "我的"
      },
    ]
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
    }
  }
})