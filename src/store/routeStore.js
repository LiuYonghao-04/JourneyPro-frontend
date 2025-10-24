import { defineStore } from 'pinia'

export const useRouteStore = defineStore('route', {
    state: () => ({
        startAddress: '成都天府广场',
        endAddress: '成都火车北站',
        startLat: 30.5728,
        startLng: 104.0668,
        endLat: 30.6598,
        endLng: 104.0633,
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
