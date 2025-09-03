import Cookies from "js-cookie"

export const setAuthToken = (token: string) => {
    Cookies.set("authToken", token)
}

export const getAuthToken = () => {
    const token = Cookies.get("authToken")
    return token
}

export const removeAuthToken = () => {
    Cookies.remove("authToken")
}