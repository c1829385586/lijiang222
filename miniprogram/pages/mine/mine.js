Page({
  data: { userInfo: {}, isMerchant: false, memberLevel: '普通会员', memberPoints: 0 },
  onShow() {
    const app = getApp()
    this.setData({
      userInfo: app.globalData.userInfo || {},
      isMerchant: !!app.globalData.isMerchantLogin
    })
    this.loadMemberInfo()
  },
  async loadMemberInfo() {
    try {
      const app = getApp()
      if (!app.globalData.openid) return
      const db = wx.cloud.database()
      const userRes = await db.collection('users').where({ openid: app.globalData.openid }).get()
      if (userRes.data.length > 0) {
        const user = userRes.data[0]
        const levelMap = { 0: '普通会员', 1: '银卡会员', 2: '金卡会员', 3: '铂金会员' }
        this.setData({
          memberLevel: levelMap[user.memberLevel || 0] || '普通会员',
          memberPoints: user.points || 0
        })
      }
    } catch (e) {
      // 静默处理
    }
  },
  goOrders(e) { wx.switchTab({ url: '/pages/order/order?status=' + (e.currentTarget.dataset.status || 'all') }) },
  goAddress() { wx.navigateTo({ url: '/pages/address/address' }) },
  goCart() { wx.navigateTo({ url: '/pages/cart/cart' }) },
  goMyReviews() { wx.navigateTo({ url: '/pages/order/order?status=completed' }) },
  contactService() { wx.makePhoneCall({ phoneNumber: '4000000000' }) },
  goAbout() { wx.showModal({ title: '本地生活', content: '多商家本地生活平台\n酒店·美食·游玩·特产', showCancel: false }) },
  goMerchantCenter() {
    const app = getApp()
    if (app.globalData.isMerchantLogin) {
      wx.navigateTo({ url: '/pages/merchant-dashboard/merchant-dashboard' })
    } else {
      wx.navigateTo({ url: '/pages/merchant-login/merchant-login' })
    }
  },
  goMember() {
    wx.showToast({ title: '会员中心即将上线', icon: 'none' })
  }
})
