// components/event-form/event-form.js
import { httpPost, uploadFile } from '../../utils/util'

const app = getApp()

Component({

  /**
   * Component properties
   */
  properties: {
    event: null,
    imageMap: {},
  },

  /**
   * Component initial data
   */
  data: {
    title: '',
    description: '',
    open: false,
    items: [],
    actionSheetActions: [
      { text: '向上移动', value: 'moveUp' },
      { text: '向下移动', value: 'moveDown' },
      { text: '删除', type: 'warn', value: 'delete' }
    ],
    actionSheetFlowIndex: -1,
    showActionsheet: false,
    newImageMap: {},
  },

  /**
   * Component methods
   */
  methods: {
    itemChanged (e) {
      var newItems = this.data.items.slice()
      newItems[e.detail.index] = e.detail.item
      this.setData({items: newItems})
      for (var image of e.detail.item.images) {
        if (!this.properties.imageMap[image.key]) {
          this.triggerEvent('imageadded', image)
        }
      }
    },
    submit () {
      var data = this.makeEvent()
      if (this.properties.event.id) {
        data.id = this.properties.event.id
        this.updateEvent(data)
      } else {
        this.createEvent(data)
      }
    },
    updateEvent (data) {
      wx.showLoading({
        title: '更新中',
      })
      var that = this
      httpPost('/event/update-event', data, app).then(resp => {
        wx.hideLoading()
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 2000
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      }).catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '更新失败',
          icon: 'error',
          duration: 2000
        })
      })
    },
    createEvent (data) {
      wx.showLoading({
        title: '创建中',
      })
      var that = this
      httpPost('/event/create-event', data, app).then(resp => {
        wx.hideLoading()
        wx.showToast({
          title: '创建成功',
          icon: 'success',
          duration: 2000
        })
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      }).catch(err => {
        wx.hideLoading()
        wx.showToast({
          title: '创建失败',
          icon: 'error',
          duration: 2000
        })
      })
    },
    makeEvent () {
      var event = {
        eventType: this.properties.event.eventType,
        title: this.data.title,
        description: this.data.description,
        status: this.data.open ? 'open' : 'closed',
        items: this.data.items.slice(),
      }
      return event
    },
    addItem () {
      var newItems = this.data.items.slice()
      newItems.push({
        title: '',
        text: '',
        images: [],
      })
      this.setData({items: newItems})
    },
    openMenu (e) {
      this.setData({
        actionSheetFlowIndex: e.detail.index,
        showActionsheet: true,
      })
    },
    closeActionSheet () {
      this.setData({
        actionSheetFlowIndex: null,
        showActionsheet: false
      })
    },
    actionClick (e) {
      if (e.detail.value == 'moveUp') {
        this.moveUpItem()
      } else if (e.detail.value == 'moveDown') {
        this.moveDownItem()
      } else if (e.detail.value == 'delete') {
        this.deleteItem()
      }
      this.closeActionSheet()
    },
    moveUpItem () {
      var index = this.data.actionSheetFlowIndex
      if (index > 0) {
        var newItems = this.data.items.slice()
        var item = newItems[index]
        newItems.splice(index, 1)
        newItems.splice(index - 1, 0, item)
        this.setData({items: newItems})
      }
    },
    moveDownItem () {
      var index = this.data.actionSheetFlowIndex
      if (index < this.data.items.length - 1) {
        var newItems = this.data.items.slice()
        var item = newItems[index]
        newItems.splice(index, 1)
        newItems.splice(index + 1, 0, item)
        this.setData({items: newItems})
      }
    },
    deleteItem () {
      var index = this.data.actionSheetFlowIndex
      var newItems = this.data.items.slice()
      newItems.splice(index, 1)
      this.setData({items: newItems})
    },
    itemChooseImage (e) {
      var index = e.detail.index
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
              that.setData({
                newImageMap: {
                  [index]: {key: resp.key, source: 's3'}
                }
              })
              wx.hideLoading()
            }).catch(err => {
              wx.hideLoading()
              console.log('uploadFile failed')
            })
          }
        }
      })
    },
    itemNewImageAdded (e) {
      this.setData({newImageMap: {}})
    },
  },
  observers: {
    'event': function(event) {
      if (event) {
        this.setData({
          title: event.title,
          description: event.description,
          open: event.status == 'open',
          items: event.items || [],
        })
      }
    },
  },
})
