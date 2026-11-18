import axios from 'axios'

export const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('hpesa_token')}` })
export const get = (url) => axios.get(url, { headers: authHeaders() }).then((r) => r.data)
export const post = (url, body) => axios.post(url, body, { headers: authHeaders() }).then((r) => r.data)
export const del = (url) => axios.delete(url, { headers: authHeaders() }).then((r) => r.data)
export const errMsg = (e, fallback = 'Something went wrong') => e?.response?.data?.error || fallback

// Where to send the user after logging in (used by payment links)
export const setRedirect = (p) => { try { sessionStorage.setItem('hpesa_redirect', p) } catch { /* ignore */ } }
export const peekRedirect = () => { try { return sessionStorage.getItem('hpesa_redirect') } catch { return null } }
export const clearRedirect = () => { try { sessionStorage.removeItem('hpesa_redirect') } catch { /* ignore */ } }
