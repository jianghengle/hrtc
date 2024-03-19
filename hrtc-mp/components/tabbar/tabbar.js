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
        text: "对话"
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