import axios from "axios"

// Utilisez l'IP de votre ordinateur (celle affichée par ipconfig/ifconfig)
// Pour un émulateur Android, vous pouvez utiliser 10.0.2.2
// Pour un appareil physique, utilisez l'IP de votre ordinateur sur le réseau

const API = axios.create({
    baseURL: "http://192.168.43.9:3000", // Remplacez par votre IP
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    }
})

// Intercepteur pour les erreurs
API.interceptors.response.use(
    response => response,
    error => {
        console.error("API Error:", error.message)
        if (error.code === 'ECONNABORTED') {
            throw new Error('Timeout - Le serveur ne répond pas')
        }
        if (!error.response) {
            throw new Error('Impossible de contacter le serveur')
        }
        throw error
    }
)

export default API