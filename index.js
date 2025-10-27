require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const Joi = require('joi');

const app = express();
app.use(express.json());

// --- Environment Variables ---
const PORT = process.env.PORT || 4000;
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_HOST = process.env.DB_HOST;
const DB_PORT = process.env.DB_PORT || 4000;

// --- Sequelize Initialization (TiDB/MySQL) ---
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  dialectOptions: {
    ssl: { rejectUnauthorized: true }  // TiDB Cloud requires SSL
  },
  logging: false,
});

// --- Database Connection ---
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL (TiDB) connected successfully!');
  } catch (err) {
    console.error('❌ DB connection failed:', err.message);
  }
})();

// --- Define Model ---
const Movie = sequelize.define(
  'Movie',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING(255), allowNull: false },
    type: { type: DataTypes.ENUM('TV Shows', 'Movies'), allowNull: false },
    director: { type: DataTypes.STRING(255), allowNull: false },
    budget: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    location: { type: DataTypes.STRING(255), allowNull: false },
    duration: { type: DataTypes.STRING(100), allowNull: false },
    year: { type: DataTypes.STRING(50), allowNull: false },
  },
  {
    tableName: 'Movies',
    timestamps: true,
  }
);

// --- Validation Schemas ---
const MovieSchema = Joi.object({
  title: Joi.string().max(255).required(),
  type: Joi.string().valid('TV Shows', 'Movies').required(),
  director: Joi.string().max(255).required(),
  budget: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
  location: Joi.string().max(255).required(),
  duration: Joi.string().max(100).required(),
  year: Joi.string().max(50).required(),
});

const UpdateSchema = Joi.object({
  title: Joi.string().max(255),
  type: Joi.string().valid('TV Shows', 'Movies'),
  director: Joi.string().max(255),
  budget: Joi.alternatives().try(Joi.number(), Joi.string()),
  location: Joi.string().max(255),
  duration: Joi.string().max(100),
  year: Joi.string().max(50),
}).min(1);

function toNumberSafe(v) {
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

// --- Routes ---
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: '🎬 Movies API running successfully!' });
});

// ➕ Create Movie
app.post('/api/movies', async (req, res) => {
  try {
    const { error, value } = MovieSchema.validate(req.body, { convert: true });
    if (error) return res.status(400).json({ success: false, message: error.message });

    value.budget = toNumberSafe(value.budget);
    await Movie.create(value);
    res.status(201).json({ success: true, message: 'Movie added successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while creating movie' });
  }
});

// 📄 Get All Movies (with Pagination)
app.get('/api/movies', async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.max(parseInt(req.query.limit) || 10, 1);
  const offset = (page - 1) * limit;

  try {
    const { count, rows } = await Movie.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({
      success: true,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      data: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while fetching movies' });
  }
});

// 🔍 Get Movie by ID
app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findByPk(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });

    res.status(200).json({ success: true, data: movie });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while fetching movie' });
  }
});

// ✏️ Update Movie
app.put('/api/movies/:id', async (req, res) => {
  try {
    const { error, value } = UpdateSchema.validate(req.body, { convert: true });
    if (error) return res.status(400).json({ success: false, message: error.message });

    const movie = await Movie.findByPk(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });

    if (value.budget !== undefined) value.budget = toNumberSafe(value.budget);
    await movie.update(value);
    res.status(200).json({ success: true, message: 'Movie updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while updating movie' });
  }
});

// ❌ Delete Movie
app.delete('/api/movies/:id', async (req, res) => {
  try {
    const movie = await Movie.findByPk(req.params.id);
    if (!movie) return res.status(404).json({ success: false, message: 'Movie not found' });

    await movie.destroy();
    res.status(200).json({ success: true, message: 'Movie deleted successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error while deleting movie' });
  }
});

// --- Sync DB & Start Server ---
sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
