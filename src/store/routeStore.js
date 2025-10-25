import { defineStore } from 'pinia'

export const useRouteStore = defineStore('route', {
    state: () => ({
        startAddress: '天府广场',
        endAddress: '成都理工大学',
        startLat: 30.6599,
        startLng: 104.0639,
        endLat: 30.6773,
        endLng: 104.1444,
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
    },
})
