require("dotenv").config();
const pg = require("pg");
const client = new pg.Client(process.env.DATABASE_URL);
const uuid = require("uuid");
const bcrypt = require("bcrypt");

const createTables = async () => {
  const SQL = /* sql */ `
        DROP TABLE IF EXISTS comments;
        DROP TABLE IF EXISTS reviews;
        DROP TABLE IF EXISTS items;
        DROP TABLE IF EXISTS users;
  
        CREATE TABLE users(
          id UUID PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
  
        CREATE TABLE items(
          id UUID PRIMARY KEY,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT NOT NULL,
          average_score DECIMAL(3, 2) DEFAULT 0.00,
          created_at TIMESTAMP DEFAULT NOW()
        );
  
        CREATE TABLE reviews(
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          item_id UUID REFERENCES items(id) ON DELETE CASCADE,
          score INT CHECK (score BETWEEN 1 AND 5),
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_user_item UNIQUE (user_id, item_id)
        );
  
        CREATE TABLE comments(
          id UUID PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_user_review UNIQUE (user_id, review_id)
        );
      `;
  await client.query(SQL);
};

const createUser = async ({ username, email, password }) => {
  const SQL = /* sql */ `
      INSERT INTO users(id, username, email, password)
      VALUES($1, $2, $3, $4)
      RETURNING id, username, email, created_at;
    `;
  const hashedPassword = await bcrypt.hash(password, 5);
  const response = await client.query(SQL, [
    uuid.v4(),
    username,
    email,
    hashedPassword,
  ]);
  return response.rows[0];
};

const loginUser = async ({ email, password }) => {
  const SQL = /* sql */ `
      SELECT id, username, email, password FROM users
      WHERE email = $1
    `;
  const response = await client.query(SQL, [email]);
  const user = response.rows[0];

  if (user && (await bcrypt.compare(password, user.password))) {
    return { id: user.id, username: user.username, email: user.email };
  }
  throw new Error("Invalid email or password");
};

const createItem = async ({ name, description }) => {
  const SQL = /* sql */ `
      INSERT INTO items(id, name, description)
      VALUES($1, $2, $3)
      RETURNING *;
    `;
  const response = await client.query(SQL, [uuid.v4(), name, description]);
  return response.rows[0];
};

const createReview = async ({ user_id, item_id, score, text }) => {
  const SQL = /* sql */ `
      INSERT INTO reviews(id, user_id, item_id, score, text)
      VALUES($1, $2, $3, $4, $5)
      RETURNING *;
    `;
  const response = await client.query(SQL, [
    uuid.v4(),
    user_id,
    item_id,
    score,
    text,
  ]);
  return response.rows[0];
};

const createComment = async ({ user_id, review_id, text }) => {
  const SQL = /* sql */ `
      INSERT INTO comments(id, user_id, review_id, text)
      VALUES($1, $2, $3, $4)
      RETURNING *;
    `;
  const response = await client.query(SQL, [
    uuid.v4(),
    user_id,
    review_id,
    text,
  ]);
  return response.rows[0];
};

// Example functions to fetch data
const fetchItems = async () => {
  const SQL = `SELECT * FROM items`;
  const response = await client.query(SQL);
  return response.rows;
};

const fetchReviewsForItem = async (item_id) => {
  const SQL = /* sql */ `
      SELECT * FROM reviews
      WHERE item_id = $1
    `;
  const response = await client.query(SQL, [item_id]);
  return response.rows;
};

const fetchReviewsAndAverageScore = async (item_id) => {
  const reviewsSQL = /*sql*/ `
      SELECT * FROM reviews
      WHERE item_id = $1
    `;
  const avgScoreSQL = `
      SELECT AVG(score) AS average_score
      FROM reviews
      WHERE item_id = $1
    `;

  const reviews = (await client.query(reviewsSQL, [item_id])).rows;
  const avgScore = (await client.query(avgScoreSQL, [item_id])).rows[0]
    .average_score;

  return { reviews, average_score: parseFloat(avgScore).toFixed(2) || 0.0 };
};

const updateReview = async ({ reviewId, userId, text, score }) => {
  const SQL = /*sql*/ `
      UPDATE reviews
      SET text = $1, score = $2, updated_at = NOW()
      WHERE id = $3 AND user_id = $4
      RETURNING *;
    `;
  const response = await client.query(SQL, [text, score, reviewId, userId]);
  return response.rows[0];
};

const updateComment = async ({ commentId, userId, text }) => {
  const SQL = /*sql*/ `
      UPDATE comments
      SET text = $1, updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING *;
    `;
  const response = await client.query(SQL, [text, commentId, userId]);
  return response.rows[0];
};

const deleteReview = async ({ reviewId, userId }) => {
  const SQL = /*sql */ `
      DELETE FROM reviews
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
  const response = await client.query(SQL, [reviewId, userId]);
  return response.rows[0];
};

const deleteComment = async ({ commentId, userId }) => {
  const SQL = /*sql*/ `
      DELETE FROM comments
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
  const response = await client.query(SQL, [commentId, userId]);
  return response.rows[0];
};

const fetchCommentsForReview = async (reviewId) => {
  const SQL = /*sql*/ `
      SELECT * FROM comments
      WHERE review_id = $1
      ORDER BY created_at DESC;
    `;
  const response = await client.query(SQL, [reviewId]);
  return response.rows;
};

const fetchUserReviews = async (userId) => {
  const SQL = /*sql*/ `
      SELECT * FROM reviews
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
  const response = await client.query(SQL, [userId]);
  return response.rows;
};

const fetchUserComments = async (userId) => {
  const SQL = /*sql*/ `
      SELECT * FROM comments
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
  const response = await client.query(SQL, [userId]);
  return response.rows;
};

module.exports = {
  client,
  createTables,
  createUser,
  createItem,
  createReview,
  createComment,
  fetchItems,
  fetchReviewsForItem,
  fetchReviewsAndAverageScore,
  updateReview,
  updateComment,
  deleteReview,
  deleteComment,
  fetchCommentsForReview,
  fetchUserReviews,
  fetchUserComments,
};
