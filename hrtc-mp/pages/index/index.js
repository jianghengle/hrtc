//index.js
import { waitForUser } from '../../utils/util' 

//获取应用实例
const app = getApp()

Page({
  data: {
    
  },
  onLoad() {
    waitForUser(app, function(){
      console.log('index waitForUser done')
    })
  },
})
