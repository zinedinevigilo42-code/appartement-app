const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "appartement_db"
})

db.connect((err) => {
    if (err) {
        console.error("Erreur connexion MySQL:", err)
        return
    }
    console.log("MySQL connecté")
})

// Ajouter
app.post("/add", (req, res) => {
    const { numApp, design, loyer } = req.body
    
    // Validation
    if (!numApp || !design || !loyer) {
        return res.status(400).json({ error: "Tous les champs sont requis" })
    }
    
    db.query(
        "INSERT INTO appartement (numApp, design, loyer) VALUES (?, ?, ?)",
        [numApp, design, loyer],
        (err, result) => {
            if (err) {
                console.error("Erreur insertion:", err)
                return res.status(500).json({ error: err.message })
            }
            res.json({ 
                message: "Ajout réussi",
                id: result.insertId 
            })
        }
    )
})

// Liste
app.get("/appartements", (req, res) => {
    db.query("SELECT * FROM appartement ORDER BY id DESC", (err, result) => {
        if (err) {
            console.error("Erreur lecture:", err)
            return res.status(500).json({ error: err.message })
        }
        res.json(result)
    })
})

// Supprimer
app.delete("/delete/:id", (req, res) => {
    const id = req.params.id
    
    db.query(
        "DELETE FROM appartement WHERE id = ?",
        [id],
        (err, result) => {
            if (err) {
                console.error("Erreur suppression:", err)
                return res.status(500).json({ error: err.message })
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Enregistrement non trouvé" })
            }
            
            res.json({ message: "Supprimé avec succès" })
        }
    )
})

// Modifier (ajout de la fonctionnalité de modification)
app.put("/update/:id", (req, res) => {
    const id = req.params.id
    const { numApp, design, loyer } = req.body
    
    db.query(
        "UPDATE appartement SET numApp = ?, design = ?, loyer = ? WHERE id = ?",
        [numApp, design, loyer, id],
        (err, result) => {
            if (err) {
                console.error("Erreur modification:", err)
                return res.status(500).json({ error: err.message })
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Enregistrement non trouvé" })
            }
            
            res.json({ message: "Modifié avec succès" })
        }
    )
})

const PORT = 3000
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serveur démarré sur le port ${PORT}`)
})