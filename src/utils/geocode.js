import axios from 'axios'

export async function geocode(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
    const res = await axios.get(url)
    if (res.data && res.data.length > 0) {
        return {
            lat: parseFloat(res.data[0].lat),
            lng: parseFloat(res.data[0].lon),
        }
    } else {
        throw new Error('地址未找到')
    }
}
