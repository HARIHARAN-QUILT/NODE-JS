const express = require('express')
const joi = require('joi')
const { Sequelize, DataTypes } = require('sequelize')
require('dotenv').config()

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 4040;
const DB_NAME = process.env.DB_NAME || "Movies_COllection";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "Hari@1234";
const DB_HOST = process.env.DB_HOST || "localhost";

const db = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: false
})


db.authenticate()
    .then(() => console.log("MYSQL DB IS CONNECTED SUCCESSFULLY...!"))
    .catch((err) => console.log("MYSQL DB IS FAILED TO CONNECT...PLS TRY AGAIN", err))


const movies = db.define("movies", {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, allowNull: false, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM("TV Shows", "Movies"), allowNull: false },
    director: { type: DataTypes.STRING(255), allowNull: false },
    budget: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    location: { type: DataTypes.STRING(255), allowNull: false },
    duration: { type: DataTypes.STRING(100), allowNull: false },
    year: { type: DataTypes.STRING(50), allowNull: false }
}, {
    tableName: "Movies",
    timestamps: true
})

const MovieSchema = joi.object({
    title: joi.string().max(255).required(),
    type: joi.string().valid("TV Shows", "Movies").required(),
    director: joi.string().max(255).required(),
    budget: joi.alternatives().try(joi.number(), joi.string()).required(),
    location: joi.string().max(255).required(),
    duration: joi.string().max(100).required(),
    year: joi.string().max(50).required(),
});

const updateSchema = joi.object({
    title: joi.string().max(255),
    type: joi.string().valid("TV Shows", "Movies"),
    director: joi.string().max(255),
    budget: joi.alternatives().try(joi.number(), joi.string()),
    location: joi.string().max(255),
    duration: joi.string().max(100),
    year: joi.string().max(50)
}).min(1);


function toNumberSafe(v) {
    const n = Number(v)
    return Number.isNaN(n) ? 0 : n;

}


app.get('/', async (req, res) => {
    try {
        res.status(200).json({ success: true, message: "Movies API Running Successfully...!" })
    }
    catch (err) {
        res.status(500).json({ success: false, message: "Server Down Please Restart the server" })
    }
})

app.post('/api/movies', async (req, res) => {
    try {
        const { error, value } = MovieSchema.validate(req.body, { convert: true })
        if (error) {
            res.status(400).json({ success: false, message: 'Error while inserting the data...!', error })
        }
        else {
            value.budget = toNumberSafe(value.budget)
            const new_movie = await movies.create(value);
            res.status(201).json({ success: true, message: "Movie Added in the DB" })
        }

    }
    catch (e) {
        console.error("Create error:", e);
        return res.status(500).json({ error: "Server error while creating" });
    }
})

app.get('/api/movies/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const movie = await movies.findByPk(id);
        if (movie) {
            res.status(200).json({ success: true, message: "Data Found", data: movie })
        }
        else {
            res.status(404).json({ success: false, message: "No Data Found" })
        }

    }
    catch (e) {
        console.error("Create error:", e);
        return res.status(500).json({ error: "Server error while creating" });
    }
})


app.get('/api/movies', async (req, res) => {
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    if (page < 1) page = 1;
    if (limit < 1) limit = 10;
    const offset = (page - 1) * limit;
    try {
        const { count, rows } = await movies.findAndCountAll({ limit, offset, order: [["createdAt", "DESC"]] });
        res.json({ page, limit, total: count, totalPages: Math.ceil(count / limit), data: rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.put('/api/movies/:id', async (req, res) => {
    const id = req.params.id;

    try {

        const { error, value } = updateSchema.validate(req.body, { convert: true })
        if (error) {
            res.status(400).json({ success: false, message: "Error while updating the data" })
        }
        else {
            if (value.budget !== undefined) value.budget = toNumberSafe(value.budget)
            const item = await movies.findByPk(id)
            if (!item) {
                return res.status(404).json({ success: false, message: "No Data Found to update" });
            }

            else {
                await item.update(value);
                return res.status(200).json({ success: true, message: 'Data Updated in DB' })
            }
        }

    }
    catch (e) {
        console.error("Create error:", e);
        return res.status(500).json({ error: "Server error while creating" });
    }
})

app.delete('/api/movies/:id', async (req, res) => {
    try {
        const item = await movies.findByPk(req.params.id);
        if (item) {
            await item.destroy();
            res.status(200).json({ success: true, message: "Data Deleted in Database" })
        }
        else {
            res.status(400).json({ success: false, message: "Error While deleting data...!" })
        }

    }
    catch (e) {
        console.error("Create error:", e);
        return res.status(500).json({ error: "Server error while creating" });
    }
})



app.listen(PORT, () => console.log("Server Start Running...!"))