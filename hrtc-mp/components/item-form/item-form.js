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
    newImageMap: {},
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
      this.triggerEvent('itemchooseimage', {index: this.properties.index})
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
    'newImageMap': function(newImageMap) {
      if (newImageMap[this.properties.index]) {
        var newImage = newImageMap[this.properties.index]
        var newImages = this.data.images.slice()
        newImages.push(newImage)
        this.setData({images: newImages})
        this.triggerEvent('itemnewimageadded', {index: this.properties.index})
      }
    },
  },
})
