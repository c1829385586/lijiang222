// pages/hotel-detail/hotel-detail.js
const db = wx.cloud.database()

Page({
  data: {
    storeId: '',
    store: {},
    rooms: [],
    nearbyFoods: [],
    nearbyProducts: [],
    selectedRoom: null,
    checkInDate: '',
    checkOutDate: '',
    nights: 1,
    totalPrice: 0,
    // 评价
    reviews: [],
    reviewStats: { total: 0, avgRating: 0, ratingStats: {5:0,4:0,3:0,2:0,1:0} },
    reviewLoading: false,
    distList: [],
    defaultServices: [
      { icon: '🅿️', name: '免费停车' },
      { icon: '📶', name: '免费WiFi' },
      { icon: '🍳', name: '含早餐' },
      { icon: '🚿', name: '独立卫浴' },
      { icon: '🧹', name: '每日保洁' },
      { icon: '🔑', name: '自助入住' }
    ]
  },

  onLoad(options) {
    const storeId = options.id
    this.setData({ storeId })
    this.initDates()
    this.loadStoreDetail(storeId)
  },

  initDates() {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86400000)
    const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    this.setData({
      checkInDate: formatDate(today),
      checkOutDate: formatDate(tomorrow)
    })
  },

  async loadStoreDetail(id) {
    wx.showLoading({ title: '加载中' })
    try {
      const [store, rooms, foods, products] = await Promise.all([
        db.collection('stores').doc(id).get(),
        db.collection('rooms').where({ storeId: id, status: 1 }).get(),
        db.collection('stores').where({ type: 'food', status: 1 }).limit(6).get(),
        db.collection('products').where({ status: 1 }).limit(6).get()
      ])

      this.setData({
        store: store.data,
        rooms: rooms.data,
        nearbyFoods: foods.data,
        nearbyProducts: products.data
      })

      // 加载评价
      this.loadReviews(id)
    } catch (e) {
      console.error(e)
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
    wx.hideLoading()
  },

  // 加载评价
  async loadReviews(storeId) {
    this.setData({ reviewLoading: true })
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'review',
        data: { action: 'list', storeId, page: 1 }
      })
      if (result.code === 0) {
        const starStr = '⭐⭐⭐⭐⭐'
        const reviews = result.data.slice(0, 3).map(r => ({
          ...r,
          stars: starStr.substring(0, r.rating)
        }))
        // 评分分布列表
        const rs = result.ratingStats || {}
        const total = result.total || 0
        const distList = [5,4,3,2,1].map(s => ({
          star: s,
          count: rs[s] || 0,
          percent: total > 0 ? ((rs[s] || 0) / total * 100) : 0
        }))
        this.setData({
          reviews,
          reviewStats: {
            total: result.total,
            avgRating: result.avgRating,
            ratingStats: rs
          },
          distList
        })
      }
    } catch (e) {
      console.error('加载评价失败', e)
    }
    this.setData({ reviewLoading: false })
  },

  // 查看全部评价
  goReviews() {
    wx.navigateTo({ url: `/pages/store-detail/store-detail?type=reviews&id=${this.data.storeId}` })
  },

  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset
    wx.previewImage({ urls, current: urls[current] })
  },

  openMap() {
    const { store } = this.data
    wx.openLocation({
      latitude: store.latitude,
      longitude: store.longitude,
      name: store.name,
      address: store.address,
      scale: 18
    })
  },

  selectRoom(e) {
    const room = e.currentTarget.dataset.room
    if (room.stock <= 0) {
      wx.showToast({ title: '已满房', icon: 'none' })
      return
    }
    this.setData({ selectedRoom: room })
    this.calcPrice()
  },

  onDateChange(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ [type === 'in' ? 'checkInDate' : 'checkOutDate']: e.detail.value })
    this.calcPrice()
  },

  calcPrice() {
    const { selectedRoom, checkInDate, checkOutDate } = this.data
    if (!selectedRoom) return

    const inDate = new Date(checkInDate)
    const outDate = new Date(checkOutDate)
    const nights = Math.max(1, Math.ceil((outDate - inDate) / 86400000))
    const totalPrice = selectedRoom.price * nights

    this.setData({ nights, totalPrice })
  },

  onBookNow() {
    const { selectedRoom, store, checkInDate, checkOutDate, nights, totalPrice } = this.data
    if (!selectedRoom) {
      wx.showToast({ title: '请先选择房型', icon: 'none' })
      return
    }

    // 跳转到订单确认页
    const orderData = encodeURIComponent(JSON.stringify({
      type: 'hotel',
      storeId: store._id,
      storeName: store.name,
      roomId: selectedRoom._id,
      roomName: selectedRoom.name,
      checkInDate,
      checkOutDate,
      nights,
      totalPrice,
      coverImage: store.images ? store.images[0] : ''
    }))

    wx.navigateTo({ url: `/pages/order-confirm/order-confirm?data=${orderData}` })
  },

  onShareAppMessage() {
    const { store } = this.data
    return {
      title: store.name,
      path: `/pages/hotel-detail/hotel-detail?id=${this.data.storeId}`
    }
  }
})
