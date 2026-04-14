import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/authStore'

const HomeView = () => import('../views/HomeView.vue')
const MapView = () => import('../views/MapView.vue')
const PostBoardView = () => import('../views/PostBoardView.vue')
const PostPublishView = () => import('../views/PostPublishView.vue')
const PersonView = () => import('../views/PersonView.vue')
const PostDetailView = () => import('../views/PostDetailView.vue')
const LoginView = () => import('../views/LoginView.vue')
const NotificationView = () => import('../views/NotificationView.vue')
const PrivacyView = () => import('../views/PrivacyView.vue')
const FastUxView = () => import('../views/FastUxView.vue')
const AIPlannerView = () => import('../views/AIPlannerView.vue')
const AdminView = () => import('../views/AdminView.vue')
const AdminOpsView = () => import('../views/AdminOpsView.vue')
const TripsView = () => import('../views/TripsView.vue')
const AdsView = () => import('../views/AdsView.vue')
const MembershipView = () => import('../views/MembershipView.vue')

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
        path: '/ai-planner',
        name: 'ai-planner',
        component: AIPlannerView,
    },
    {
        path: '/trips',
        name: 'trips',
        component: TripsView,
    },
    {
        path: '/ads',
        name: 'ads',
        component: AdsView,
        meta: { requiresAdAccess: true },
    },
    {
        path: '/membership',
        name: 'membership',
        component: MembershipView,
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
    {
        path: '/privacy',
        name: 'privacy',
        component: PrivacyView,
    },
    {
        path: '/fast-ux',
        name: 'fast-ux',
        component: FastUxView,
    },
    {
        path: '/admin',
        name: 'admin',
        component: AdminView,
        meta: { requiresAdmin: true },
    },
    {
        path: '/admin/ops',
        name: 'admin-ops',
        component: AdminOpsView,
        meta: { requiresAdmin: true },
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
        path.startsWith('/posts/postsid') ||
        path.startsWith('/trips') ||
        path.startsWith('/ads') ||
        path.startsWith('/membership')
    )
}

router.beforeEach(async (to, from, next) => {
    const auth = useAuthStore()
    if (auth.user?.id && !auth.user?.role) {
        await auth.refreshUser()
    }
    if (needAuth(to.path) && !auth.user) {
        next({ path: '/login', query: { redirect: to.fullPath } })
        return
    }
    if (to.meta?.requiresAdmin && !auth.isAdmin) {
        next({ path: '/home' })
        return
    }
    if (to.meta?.requiresAdAccess && !auth.canManageAds) {
        next({ path: '/home' })
        return
    }
    next()
})

export default router
