// components/item-form/item-form.js
import { generateUID } from '../../utils/utils'

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
    id: '',
    title: '',
    text: '',
    price: '',
    minBuy: '',
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
        id: this.data.id,
        title: this.data.title,
        text: this.data.text,
        price: this.data.price,
        minBuy: this.data.minBuy,
        images: this.data.images ? this.data.images.slice() : [],
      }
      return item
    },
    isItemDiff (item) {
      if (this.data.id != item.id) {
        return true
      }
      if (this.data.title != item.title) {
        return true
      }
      if (this.data.text != item.text) {
        return true
      }
      if (this.data.price != item.price) {
        return true
      }
      if (this.data.minBuy != item.minBuy) {
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
          id: item.id ? item.id : generateUID(),
          title: item.title,
          text: item.text,
          price: item.price,
          minBuy: item.minBuy,
          images: item.images.slice(),
        })
      }
    },
    'id': function(id) {
      this.updateItem()
    },
    'title': function(title) {
      this.updateItem()
    },
    'text': function(text) {
      this.updateItem()
    },
    'price': function(price) {
      this.updateItem()
    },
    'minBuy': function(minBuy) {
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
