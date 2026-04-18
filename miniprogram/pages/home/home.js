// pages/home/home.js
const db = wx.cloud.database()

Page({
  data: {
    banners: [],
    categories: [
      { icon: '/images/cat/hotel.png', name: '酒店民宿', page: '/pages/hotel/hotel', tab: true },
      { icon: '/images/cat/food.png', name: '美食推荐', page: '/pages/food/food', tab: true },
      { icon: '/images/cat/travel.png', name: '周边游玩', page: '/pages/travel/travel' },
      { icon: '/images/cat/product.png', name: '特产零食', page: '/pages/product/product' },
      { icon: '/images/cat/hot.png', name: '热门打卡', page: '/pages/search/search?type=hot' },
      { icon: '/images/cat/map.png', name: '地图探索', page: '/pages/map-explore/map-explore' },
      { icon: '/images/cat/coupon.png', name: '优惠券', page: '/pages/coupon/coupon' },
      { icon: '/images/cat/more.png', name: '全部', page: '/pages/search/search' }
    ],
    recommendHotels: [],
    recommendFoods: [],
    recommendProducts: [],
    locationText: '定位中...',
    searchKeyword: '',
    // 快速预订
    checkInDate: '',
    checkOutDate: '',
    checkInDateText: '',
    checkOutDateText: '',
    checkInDay: '',
    checkOutDay: '',
    nights: 1
  },

  onLoad() {
    this.initDates()
    this.getLocationText()
    this.loadData()
  },

  // 快速预订 - 初始化日期
  initDates() {
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86400000)
    const fmt = (d) => `${d.getMonth() + 1}月${d.getDate()}日`
    this.setData({
      checkInDate: this.fmtDate(today),
      checkOutDate: this.fmtDate(tomorrow),
      checkInDateText: fmt(today),
      checkOutDateText: fmt(tomorrow),
      checkInDay: dayNames[today.getDay()],
      checkOutDay: dayNames[tomorrow.getDay()],
      nights: 1
    })
  },

  fmtDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  },

  // 快速预订 - 选择日期
  onQuickBookDate(e) {
    const type = e.currentTarget.dataset.type
    const isCheckIn = type === 'checkIn'
    const minDate = isCheckIn ? this.fmtDate(new Date()) : this.data.checkInDate
    wx.navigateTo({
      url: `/pages/hotel/hotel?checkIn=${this.data.checkInDate}&checkOut=${this.data.checkOutDate}`
    })
  },

  // 快速预订 - 搜索酒店
  onQuickSearch() {
    wx.navigateTo({
      url: `/pages/hotel/hotel?checkIn=${this.data.checkInDate}&checkOut=${this.data.checkOutDate}`
    })
  },

  onShow() {
    // 刷新数据
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async getLocationText() {
    const app = getApp()
    if (!app.globalData.location) {
      await new Promise(resolve => {
        const timer = setInterval(() => {
          if (app.globalData.location) {
            clearInterval(timer)
            resolve()
          }
        }, 500)
      })
    }
    const { latitude, longitude } = app.globalData.location
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=2KUBZ-4M2CG-E27QM-QOEFM-WMYAT-PCFER`,
      success: (res) => {
        if (res.data && res.data.result) {
          const addr = res.data.result.address_component
          this.setData({ locationText: addr.district || addr.city })
        }
      }
    })
  },

  async loadData() {
    try {
      const [banners, hotels, foods, products] = await Promise.all([
        db.collection('banners').where({ status: 1 }).orderBy('sort', 'asc').limit(5).get(),
        db.collection('stores').where({ type: 'hotel', status: 1 }).orderBy('score', 'desc').limit(6).get(),
        db.collection('stores').where({ type: 'food', status: 1 }).orderBy('score', 'desc').limit(6).get(),
        db.collection('products').where({ status: 1 }).orderBy('sales', 'desc').limit(6).get()
      ])
      this.setData({
        banners: banners.data,
        recommendHotels: hotels.data,
        recommendFoods: foods.data,
        recommendProducts: products.data
      })
    } catch (e) {
      console.error('加载数据失败', e)
    }
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
  },

  onSearch() {
    const { searchKeyword } = this.data
    if (searchKeyword) {
      wx.navigateTo({ url: `/pages/search/search?keyword=${searchKeyword}` })
    }
  },

  onCategoryTap(e) {
    const page = e.currentTarget.dataset.page
    const isTab = e.currentTarget.dataset.tab
    if (isTab) {
      wx.switchTab({ url: page })
    } else {
      wx.navigateTo({ url: page })
    }
  },

  onHotelTap(e) {
    wx.navigateTo({ url: `/pages/hotel-detail/hotel-detail?id=${e.currentTarget.dataset.id}` })
  },

  onFoodTap(e) {
    wx.navigateTo({ url: `/pages/food-detail/food-detail?id=${e.currentTarget.dataset.id}` })
  },

  onProductTap(e) {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?type=product&id=${e.currentTarget.dataset.id}` })
  },

  onChooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        const app = getApp()
        app.globalData.location = {
          latitude: res.latitude,
          longitude: res.longitude
        }
        this.setData({ locationText: res.name || res.address })
        this.loadData()
      }
    })
  }
})
