import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MapView from '../views/MapView.vue'
import PostBoardView from '../views/PostBoardView.vue'
import PostPublishView from '../views/PostPublishView.vue'
import LoginView from '../views/LoginView.vue'

const routes = [
    {
        path: '/',
        redirect: '/home',
    },
    {
        path: '/home',
        name: 'home',
        component: HomeView,
    },
    {
        path: '/map',
        name: 'map',
        component: MapView,
    },
    {
        path: '/posts',
        name: 'posts',
        component: PostBoardView,
    },
    {
        path: '/posts/publish',
        name: 'posts-publish',
        component: PostPublishView,
    },
    {
        path: '/login',
        name: 'login',
        component: LoginView,
        props: { mode: 'login' },
    },
    {
        path: '/register',
        name: 'register',
        component: LoginView,
        props: { mode: 'register' },
    },
]

const router = createRouter({
    history: createWebHistory(), // 所以会有 /map、/posts 这种路径
    routes,
})

export default router
