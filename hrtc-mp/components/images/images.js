// components/images/images.js
Component({

  /**
   * Component properties
   */
  properties: {
    allImageKeys: null,
    initialImages: null,
    editable: false,
    imageMap: {},
  },

  /**
   * Component initial data
   */
  data: {
    images: null,
  },

  /**
   * Component methods
   */
  methods: {
    previewImage (e) {
      if (this.properties.editable) {
        return
      }
      var that = this
      var src = e.currentTarget.dataset.src
      var urls = this.properties.allImageKeys.map(k => that.properties.imageMap[k])
      wx.previewImage({
        current: src,
        urls: urls,
      })
    },
    deleteImage (e) {
      this.triggerEvent('deleteimage', {index: e.currentTarget.dataset.index})
    },
    chooseImage () {
      this.triggerEvent('chooseimage')
    },
  },
  lifetimes: {
    attached: function() {
      if (this.properties.initialImages) {
        this.setData({images: this.properties.initialImages.slice()})
      }
    },
    detached: function() {
      this.setData({images: null})
    },
  },

  observers: {
    'initialImages': function(initialImages) {
      if (initialImages && JSON.stringify(this.data.images) != JSON.stringify(initialImages)) {
        this.setData({images: initialImages})
      }
    },
  }
})
