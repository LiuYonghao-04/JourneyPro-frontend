import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import MapView from '../views/MapView.vue'
import PostBoardView from '../views/PostBoardView.vue'
import PostPublishView from '../views/PostPublishView.vue'
import PersonView from '../views/PersonView.vue'
import PostDetailView from '../views/PostDetailView.vue'
import LoginView from '../views/LoginView.vue'
import NotificationView from '../views/NotificationView.vue'
import { useAuthStore } from '../store/authStore'

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
        path: '/notifications/:type?',
        name: 'notifications',
        component: NotificationView,
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
    {
        path: '/person',
        name: 'person',
        component: PersonView,
    },
    {
        path: '/posts/postsid=:id',
        name: 'post-detail',
        component: PostDetailView,
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

const needAuth = (path) => {
    return (
        path.startsWith('/posts/publish') ||
        path.startsWith('/notifications') ||
        path.startsWith('/person') ||
        path.startsWith('/posts/postsid')
    )
}

router.beforeEach((to, from, next) => {
    const auth = useAuthStore()
    if (needAuth(to.path) && !auth.user) {
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
    }
    next()
})

export default router
