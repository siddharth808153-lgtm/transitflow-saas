// src/services/axios/AxiosResponseIntrceptorErrorCallback.ts
import useAuthStore from '@/store/authStore'
import type { AxiosError } from 'axios'

const unauthorizedCode = [401, 419, 440]

const AxiosResponseIntrceptorErrorCallback = (error: AxiosError) => {
    const { response } = error

    if (response && unauthorizedCode.includes(response.status)) {
        useAuthStore.getState().logout()
    }
}

export default AxiosResponseIntrceptorErrorCallback
