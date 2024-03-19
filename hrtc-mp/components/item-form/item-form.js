// components/item-form/item-form.js
import { uploadFile } from '../../utils/util'

const app = getApp()

Component({

  /**
   * Component properties
   */
  properties: {
    item: null,
    index: null,
    imageMap: {},
  },

  /**
   * Component initial data
   */
  data: {
    title: '',
    text: '',
    images: null,
  },

  /**
   * Component methods
   */
  methods: {
    updateItem () {
      var newItem = this.makeItem()
      this.triggerEvent('itemchanged', {index: this.properties.index, item: newItem})
    },
    makeItem () {
      var item = {
        title: this.data.title,
        text: this.data.text,
        images: this.data.images ? this.data.images.slice() : [],
      }
      return item
    },
    isItemDiff (item) {
      if (this.data.title != item.title) {
        return true
      }
      if (this.data.text != item.text) {
        return true
      }
      if (JSON.stringify(this.data.images) != JSON.stringify(item.images)) {
        return true
      }
      return false
    },
    openMenu (e) {
      this.triggerEvent('openmenu', {index: this.properties.index})
    },
    deleteImage (e) {
      var newImages = this.data.images.slice()
      newImages.splice(e.detail.index, 1)
      this.setData({images: newImages})
    },
    chooseImage () {
      var that = this
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album','camera'],
        success(res){
          if (res.tempFiles && res.tempFiles.length) {
            var path = res.tempFiles[0].tempFilePath
            wx.showLoading({title: '上传中'})
            uploadFile(path, app).then(resp => {
              var newImages = that.data.images.slice()
              newImages.push({
                key: resp.key,
                source: 's3',
              })
              that.setData({images: newImages})
              wx.hideLoading()
            }).catch(err => {
              wx.hideLoading()
              console.log('uploadFile failed')
            })
          }
        }
      })
    },
    
  },

  observers: {
    'item': function(item) {
      if (item && this.isItemDiff(item)) {
        this.setData({
          title: item.title,
          text: item.text,
          images: item.images.slice(),
        })
      }
    },
    'title': function(title) {
      this.updateItem()
    },
    'text': function(text) {
      this.updateItem()
    },
    'images': function(images) {
      this.updateItem()
    },
  },
})
