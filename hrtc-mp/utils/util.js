const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const waitForUser = (app, callback) => {
  wx.showLoading({
    title: '加载中',
  })
  if (app.globalData.user) {
    wx.hideLoading()
    callback()
  } else {
    setTimeout(function () {
      waitForUser(app, callback)
    }, 1000)
  }
}

const server = 'http://127.0.0.1:3000'

const httpGet = (path, app) => {
  return new Promise((resolve, reject) => {
    const req = {
      url: server + path,
      success(res) {
        if (res.statusCode == 200) {
          resolve(res)
        } else {
          reject(res)
        }
      },
      fail: reject,
      header: {
        'content-type': 'application/json',
      },
    }
    if (app && app.globalData.user && app.globalData.user.token) {
      req.header['Authorization'] = app.globalData.user.token
    }
    wx.request(req)
  })
}

const httpPost = (path, data, app) => {
  return new Promise((resolve, reject) => {
    const req = {
      url: server + path,
      method: 'POST',
      data: data,
      success(res) {
        if (res.statusCode == 200) {
          resolve(res)
        } else {
          reject(res)
        }
      },
      fail: reject,
      header: {
        'content-type': 'application/json',
      },
    }
    if (app && app.globalData.user && app.globalData.user.token) {
      req.header['Authorization'] = app.globalData.user.token
    }
    wx.request(req)
  })
}

const uploadFile = (tempPath, app) => {
  return new Promise((resolve, reject) => {
    const filename = tempPath.split('/').pop()
    httpPost('/s3/get-s3-upload-url', {
      filename: filename
    }, app).then(resp => {
      wx.uploadFile({
        url: resp.data.url,
        filePath: tempPath,
        name: 'file',
        formData: resp.data.fields,
        success (res){
          resolve(resp.data)
        },
        fail (e) {
          console.log('wx.uploadFile fail', e)
          reject(e)
        },
      })
    }).catch(err => {
      reject(err)
    })
  })
}

const downloadFile = (key, app) => {
  return new Promise((resolve, reject) => {
    httpPost('/s3/get-s3-download-url', {
      key: key
    }, app).then(resp => {
      wx.downloadFile({
        url: resp.data.url,
        success (res) {
          if (res.statusCode === 200) {
            resolve(res.tempFilePath)
          } else {
            reject(res.statusCode)
          }
        }
      })
    }).catch(err => {
      reject(err)
    })
  })
}

module.exports = {
  formatTime: formatTime,
  waitForUser: waitForUser,
  httpGet: httpGet,
  httpPost: httpPost,
  uploadFile: uploadFile,
  downloadFile: downloadFile,
}
