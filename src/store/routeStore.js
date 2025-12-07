import { defineStore } from 'pinia'

export const useRouteStore = defineStore('route', {
    state: () => ({
        startAddress: 'London_center',
        endAddress: 'Grosvenor Square',
        startLat: 51.5074,
        startLng: -0.1278,
        endLat: 51.5113,
        endLng: -0.1502,
        routeGeojson: null,
        steps: [],
        totalDistance: null,
        totalDuration: null,
        recommendedPOIs: [],
        isLoading: false,
        selectedPoi: null,
    }),

    actions: {
        setStart(lat, lng) {
            this.startLat = lat
            this.startLng = lng
        },

        setEnd(lat, lng) {
            this.endLat = lat
            this.endLng = lng
        },

        // ✅ 异步重规划：A -> POI -> B（让 OSRM 控件自己重算）
        async rebuildRouteWithPoi(poi) {
            try {
                // 确保 OSRM 控件存在
                if (!window._osrmControl) {
                    console.warn('⚠️ OSRM 控件未初始化')
                    return
                }

                console.log(`🧭 重规划路线：${this.startLat},${this.startLng} → ${poi.lat},${poi.lng} → ${this.endLat},${this.endLng}`)

                // ✅ 直接调用 OSRM 控件重设途径点，让它重新请求 5000 端口
                window._osrmControl.setWaypoints([
                    L.latLng(this.startLat, this.startLng),
                    L.latLng(poi.lat, poi.lng),
                    L.latLng(this.endLat, this.endLng),
                ])

                // ✅ 更新当前选中的途径点信息（方便后续高亮）
                this.selectedPoi = poi

                // ✅ 监听路线更新事件
                window._osrmControl.on('routesfound', (e) => {
                    const route = e.routes[0]
                    this.totalDistance = (route.summary.totalDistance / 1000).toFixed(2)
                    this.totalDuration = (route.summary.totalTime / 60).toFixed(1)
                    console.log('✅ 途径点重规划完成：', this.totalDistance, 'km')
                })

            } catch (err) {
                console.error('❌ rebuildRouteWithPoi error:', err)
            } finally {
                this.isLoading = false
            }
        },
        clearSelectedPoi() {
            this.selectedPoi = null

            try {
                if (!window._osrmControl) {
                    console.warn('⚠️ OSRM 控件未初始化')
                    return
                }

                // 只保留 起点 -> 终点
                window._osrmControl.setWaypoints([
                    L.latLng(this.startLat, this.startLng),
                    L.latLng(this.endLat, this.endLng),
                ])
            } catch (err) {
                console.error('❌ clearSelectedPoi error:', err)
            }
        },


        // ✅ 异步获取推荐点
        async fetchRecommendedPois() {
            this.isLoading = true // 🟡 开始加载
            try {
                const start = `${this.startLng},${this.startLat}`
                const end = `${this.endLng},${this.endLat}`
                const url = `http://localhost:3001/api/route/recommend?start=${start}&end=${end}`

                const res = await fetch(url)
                const data = await res.json()

                if (data.recommended_pois || data.recommendations) {
                    this.recommendedPOIs = data.recommended_pois || data.recommendations
                    console.log('✅ 已获取推荐途径点:', this.recommendedPOIs.length)
                } else {
                    console.warn('⚠️ 未获取到推荐数据:', data)
                }
            } catch (err) {
                console.error('❌ fetchRecommendedPois error:', err)
            } finally {
                this.isLoading = false // 🟢 结束加载
            }
        },
    },
})
