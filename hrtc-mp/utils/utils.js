const server = 'https://bzb752uzy5.execute-api.us-west-2.amazonaws.com/Prod'
//const server = 'http://127.0.0.1:3000'

const formatTime = timestamp => {
  var date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours() < 10 ? ('0' + date.getHours()) : date.getHours()
  const minute = date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()
  return month + '月' + day + '日 ' +  hour + ':' + minute
}

const formatTimeLong = timestamp => {
  var date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours() < 10 ? ('0' + date.getHours()) : date.getHours()
  const minute = date.getMinutes() < 10 ? ('0' + date.getMinutes()) : date.getMinutes()
  return year + '年' + month + '月' + day + '日 ' +  hour + ':' + minute
}

const formatDate = timestamp => {
  var date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return year + '年' + month + '月' + day + '日'
}

const formatDateShort = timestamp => {
  var date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return month + '月' + day + '日'
}

function formatPrice (value) {
  if (!value) {
    value = 0
  }
  value = parseFloat(value)
  value = Math.round(value * 100) / 100
  var ss = value.toString().split('.')
  if (ss.length < 2) {
    return '$' + ss[0] + '.00'
  }
  var n = ss[0] || '0'
  var d = ss[1]
  while (d.length < 2) {
    d  = d + '0'
  }
  return '$' + n + '.' + d
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

function generateUUID() { // Public Domain/MIT
  var d = new Date().getTime();//Timestamp
  var d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now()*1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16;//random number between 0 and 16
      if(d > 0){//Use timestamp until depleted
          r = (d + r)%16 | 0;
          d = Math.floor(d/16);
      } else {//Use microseconds since page-load if supported
          r = (d2 + r)%16 | 0;
          d2 = Math.floor(d2/16);
      }
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function generateUID() {
  // I generate the UID from two parts here 
  // to ensure the random number provide enough bits.
  var firstPart = (Math.random() * 46656) | 0;
  var secondPart = (Math.random() * 46656) | 0;
  firstPart = ("000" + firstPart.toString(36)).slice(-3);
  secondPart = ("000" + secondPart.toString(36)).slice(-3);
  return firstPart + secondPart;
}

module.exports = {
  formatTime: formatTime,
  formatTimeLong: formatTimeLong,
  formatDate: formatDate,
  formatDateShort: formatDateShort,
  waitForUser: waitForUser,
  httpGet: httpGet,
  httpPost: httpPost,
  uploadFile: uploadFile,
  downloadFile: downloadFile,
  generateUUID: generateUUID,
  generateUID: generateUID,
  formatPrice: formatPrice,
}
